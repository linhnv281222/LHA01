import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.api import (
	contract_no_exists,
	delete_contracts,
	get_acceptable_schedules,
	get_billing_permissions,
	get_contract_permissions,
	get_open_schedules,
	get_payment_request_defaults,
	get_receivable_schedules,
	get_request_schedules_for_invoice,
	get_requestable_schedules,
	get_responsible_users,
	suggest_allocation,
)
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.payment_receipt.test_payment_receipt import make_receipt
from contract_tracker.contract_tracker.doctype.payment_request.test_payment_request import make_request
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	make_invoice,
	schedule_of,
)
from contract_tracker.tests.test_setup import MANAGER, VIEWER, make_user


class TestApi(IntegrationTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	def test_get_responsible_users_only_enabled(self):
		on = make_user("phu.trach.bat@example.com", VIEWER)
		off = make_user("phu.trach.tat@example.com", VIEWER)
		frappe.db.set_value("User", off, "enabled", 0)
		names = [u.name for u in get_responsible_users()]
		self.assertIn(on, names)
		self.assertNotIn(off, names)

	def test_get_responsible_users_needs_read_permission(self):
		viewer = make_user("phu.trach.xem@example.com", VIEWER)
		frappe.set_user(viewer)
		self.assertTrue(get_responsible_users())
		nobody = frappe.get_doc(
			{"doctype": "User", "email": "khong.vai.tro@example.com", "first_name": "Không", "send_welcome_email": 0}
		).insert(ignore_permissions=True)
		frappe.set_user(nobody.name)
		with self.assertRaises(frappe.PermissionError):
			get_responsible_users()

	def test_contract_no_exists(self):
		make_contract(contract_no="HD-API-1").insert()
		self.assertTrue(contract_no_exists("HD-API-1"))
		self.assertTrue(contract_no_exists("  HD-API-1 "))
		self.assertFalse(contract_no_exists("HD-API-KHAC"))
		self.assertFalse(contract_no_exists(""))

	def _billing(self):
		doc = make_billing_contract()
		return doc, schedule_of(doc.name, "Tạm ứng"), schedule_of(doc.name, "Quý 1/2027")

	def test_get_open_schedules(self):
		doc, advance, license_ = self._billing()
		names = [r.name for r in get_open_schedules(doc.customer)]
		self.assertIn(advance, names)
		self.assertEqual(len(names), 6)
		invoice = make_invoice(doc.customer, [advance]).insert()
		names = [r.name for r in get_open_schedules(doc.customer)]
		self.assertNotIn(advance, names)
		self.assertIn(advance, [r.name for r in get_open_schedules(doc.customer, exclude_invoice=invoice.name)])
		self.assertEqual(get_open_schedules(make_contract().insert().customer), [])

	def test_billing_permissions_request_write(self):
		self.assertTrue(get_billing_permissions()["request_write"])
		frappe.set_user(make_user("xem.quyen.dn@example.com", VIEWER))
		self.assertFalse(get_billing_permissions()["request_write"])
		frappe.set_user(make_user("ql.quyen.dn@example.com", MANAGER))
		self.assertTrue(get_billing_permissions()["request_write"])

	def test_acceptable_schedules(self):
		from contract_tracker.contract_tracker.doctype.acceptance_minutes.test_acceptance_minutes import (
			make_minutes,
			need_acceptance,
		)

		doc, advance, license_ = self._billing()
		need_acceptance(advance)
		need_acceptance(license_, value=0)
		rows = {r.name: r for r in get_acceptable_schedules(doc.customer)}
		self.assertIn(advance, rows)
		self.assertNotIn(license_, rows)
		self.assertIsNone(rows[advance].acceptance_minutes)
		minutes = make_minutes(doc.customer, [advance]).insert()
		rows = {r.name: r for r in get_acceptable_schedules(doc.customer)}
		self.assertEqual(rows[advance].acceptance_minutes, minutes.name)
		rows = {r.name: r for r in get_acceptable_schedules(doc.customer, minutes=minutes.name)}
		self.assertIsNone(rows[advance].acceptance_minutes)
		frappe.set_user(make_user("xem.chon.bbnt@example.com", VIEWER))
		self.assertIn(advance, [r.name for r in get_acceptable_schedules(doc.customer)])

	def test_requestable_schedules(self):
		doc, advance, license_ = self._billing()
		rows = {r.name: r for r in get_requestable_schedules(doc.customer)}
		self.assertEqual(len(rows), 6)
		self.assertEqual(rows[advance].outstanding, 33_000_000)
		self.assertIsNone(rows[advance].payment_request)
		request = make_request(doc.customer, [advance]).insert()
		rows = {r.name: r for r in get_requestable_schedules(doc.customer)}
		self.assertEqual(rows[advance].payment_request, request.name)
		rows = {r.name: r for r in get_requestable_schedules(doc.customer, request=request.name)}
		self.assertIsNone(rows[advance].payment_request)
		make_receipt(doc.customer, 33_000_000, [(advance, 33_000_000)]).insert()
		self.assertNotIn(advance, [r.name for r in get_requestable_schedules(doc.customer)])

	def test_payment_request_defaults(self):
		settings = frappe.get_single("Contract Tracker Settings")
		settings.update(
			{"bank_account_holder": "LHA", "bank_account_no": "999", "bank_name": "BIDV", "bank_branch": "HCM"}
		)
		settings.save()
		frappe.set_user(make_user("xem.mac.dinh@example.com", VIEWER))
		self.assertEqual(
			get_payment_request_defaults(),
			{"bank_account_holder": "LHA", "bank_account_no": "999", "bank_name": "BIDV", "bank_branch": "HCM"},
		)

	def test_request_schedules_for_invoice(self):
		doc, advance, license_ = self._billing()
		request = make_request(doc.customer, [advance, license_]).insert()
		result = get_request_schedules_for_invoice(request.name, doc.customer)
		self.assertEqual({r.name for r in result["rows"]}, {advance, license_})
		self.assertEqual(result["skipped"], [])
		invoice = make_invoice(doc.customer, [license_]).insert()
		result = get_request_schedules_for_invoice(request.name, doc.customer)
		self.assertEqual([r.name for r in result["rows"]], [advance])
		self.assertEqual([r.name for r in result["skipped"]], [license_])
		result = get_request_schedules_for_invoice(request.name, doc.customer, invoice=invoice.name)
		self.assertEqual(len(result["rows"]), 2)
		with self.assertRaises(frappe.ValidationError):
			get_request_schedules_for_invoice(request.name, make_contract().insert().customer)

	def test_suggest_allocation_example(self):
		doc, advance, license_ = self._billing()
		rows = suggest_allocation(doc.customer, 40_000_000)
		self.assertEqual(
			[(r["schedule"], r["allocated_amount"]) for r in rows], [(advance, 33_000_000), (license_, 7_000_000)]
		)

	def test_suggest_prefers_invoice(self):
		doc, advance, license_ = self._billing()
		invoice = make_invoice(doc.customer, [license_]).insert()
		rows = suggest_allocation(doc.customer, 20_000_000, invoice=invoice.name)
		self.assertEqual(
			[(r["schedule"], r["allocated_amount"]) for r in rows], [(license_, 15_000_000), (advance, 5_000_000)]
		)

	def test_suggest_skips_paid_and_excludes_own_receipt(self):
		doc, advance, license_ = self._billing()
		receipt = make_receipt(doc.customer, 33_000_000, [(advance, 33_000_000)]).insert()
		self.assertNotIn(advance, [r["schedule"] for r in suggest_allocation(doc.customer, 99_000_000)])
		rows = suggest_allocation(doc.customer, 33_000_000, receipt=receipt.name)
		self.assertEqual(rows[0]["schedule"], advance)
		self.assertEqual(sum(r["allocated_amount"] for r in rows), 33_000_000)
		self.assertEqual([r.name for r in get_receivable_schedules(doc.customer)].count(advance), 0)

	def test_billing_permissions(self):
		self.assertEqual(
			get_billing_permissions(),
			{"invoice_write": True, "receipt_write": True, "request_write": True, "acceptance_write": True},
		)
		frappe.set_user(make_user("quyen.xem.thu@example.com", VIEWER))
		self.assertEqual(
			get_billing_permissions(),
			{"invoice_write": False, "receipt_write": False, "request_write": False, "acceptance_write": False},
		)
		self.assertEqual(get_open_schedules("khong-co"), [])

	def test_get_contract_permissions_by_role(self):
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.quan.ly@example.com", MANAGER))
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.xem@example.com", VIEWER))
		self.assertFalse(get_contract_permissions()["can_write"])

	def test_contract_permissions_flags(self):
		self.assertEqual(get_contract_permissions(), {"can_write": True, "can_delete": True, "can_revert": True})
		frappe.set_user(make_user("co.xoa.quan.ly@example.com", MANAGER))
		self.assertEqual(get_contract_permissions(), {"can_write": True, "can_delete": True, "can_revert": False})
		frappe.set_user(make_user("co.xoa.xem@example.com", VIEWER))
		self.assertEqual(get_contract_permissions(), {"can_write": False, "can_delete": False, "can_revert": False})

	# ---- xóa hàng loạt hợp đồng ----

	def test_delete_contracts_three_drafts(self):
		names = [make_contract().insert().name for _i in range(3)]
		result = delete_contracts(names)
		self.assertEqual(result, {"deleted": names, "skipped": []})
		for n in names:
			self.assertFalse(frappe.db.exists("Contract", n))

	def test_delete_contracts_mixed(self):
		drafts = [make_contract().insert().name for _i in range(3)]
		actives = []
		for _i in range(2):
			doc = make_contract().insert()
			doc.activate()
			actives.append(doc.name)
		schedule_count = {n: frappe.db.count("Payment Schedule", {"contract": n}) for n in actives}
		result = delete_contracts(drafts + actives)
		self.assertEqual(result["deleted"], drafts)
		self.assertEqual([s["name"] for s in result["skipped"]], actives)
		for s in result["skipped"]:
			self.assertIn("Chỉ xóa được hợp đồng ở trạng thái Nháp", s["reason"])
		for n in actives:
			self.assertEqual(frappe.db.get_value("Contract", n, "status"), "Đang hiệu lực")
			self.assertEqual(frappe.db.count("Payment Schedule", {"contract": n}), schedule_count[n])

	def test_delete_contracts_manager_ok(self):
		name = make_contract().insert().name
		frappe.set_user(make_user("xoa.hop.dong.quan.ly@example.com", MANAGER))
		self.assertEqual(delete_contracts([name])["deleted"], [name])

	def test_delete_contracts_viewer_rejected(self):
		name = make_contract().insert().name
		frappe.set_user(make_user("xoa.hop.dong.xem@example.com", VIEWER))
		with self.assertRaises(frappe.PermissionError):
			delete_contracts([name])
		self.assertTrue(frappe.db.exists("Contract", name))

	def test_delete_contracts_admin_active_skipped(self):
		doc = make_contract().insert()
		doc.activate()
		result = delete_contracts([doc.name])
		self.assertEqual(result["deleted"], [])
		self.assertEqual([s["name"] for s in result["skipped"]], [doc.name])
		self.assertTrue(frappe.db.exists("Contract", doc.name))

	def test_delete_contracts_after_revert(self):
		doc = make_contract().insert()
		doc.activate()
		frappe.get_doc("Contract", doc.name).revert_to_draft()
		self.assertEqual(delete_contracts([doc.name])["deleted"], [doc.name])

	def test_delete_contracts_limit_and_empty(self):
		with self.assertRaises(frappe.ValidationError):
			delete_contracts([f"HD-{i}" for i in range(101)])
		with self.assertRaises(frappe.ValidationError):
			delete_contracts([])

	def test_delete_contracts_json_string_missing_and_duplicate(self):
		name = make_contract().insert().name
		result = delete_contracts(frappe.as_json([name, name, "HD-KHONG-CO", ""]))
		self.assertEqual(result["deleted"], [name])
		self.assertEqual(result["skipped"], [{"name": "HD-KHONG-CO", "reason": "Không tìm thấy hợp đồng."}])
