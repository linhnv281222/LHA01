import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.api import (
	contract_no_exists,
	get_billing_permissions,
	get_contract_permissions,
	get_open_schedules,
	get_receivable_schedules,
	get_responsible_users,
	suggest_allocation,
)
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.payment_receipt.test_payment_receipt import make_receipt
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
		self.assertEqual(get_billing_permissions(), {"invoice_write": True, "receipt_write": True})
		frappe.set_user(make_user("quyen.xem.thu@example.com", VIEWER))
		self.assertEqual(get_billing_permissions(), {"invoice_write": False, "receipt_write": False})
		self.assertEqual(get_open_schedules("khong-co"), [])

	def test_get_contract_permissions_by_role(self):
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.quan.ly@example.com", MANAGER))
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.xem@example.com", VIEWER))
		self.assertFalse(get_contract_permissions()["can_write"])
