# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import itertools

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.contract.contract import (
	MSG_DELETE_NOT_DRAFT,
	MSG_END_REQUIRED,
	MSG_NO_ITEMS,
	format_number,
	recurring_amount,
	recurring_periods,
	round_vnd,
)
from contract_tracker.setup import ensure_roles, ensure_vat_rates
from contract_tracker.tests.test_setup import MANAGER, VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []


def make_customer(name="Công ty khách hàng thử"):
	return frappe.get_doc({"doctype": "Contract Customer", "customer_name": name}).insert().name


def item_one_time(**kw):
	return {
		"item_name": "Đào tạo",
		"vat_rate": "8%",
		"billing_type": "Một lần",
		"amount": 5_000_000,
		"due_date": "2027-02-01",
		**kw,
	}


def item_multi(**kw):
	return {
		"item_key": "K-TRIENKHAI",
		"item_name": "Triển khai",
		"vat_rate": "10%",
		"billing_type": "Nhiều đợt",
		"item_value": 100_000_000,
		"milestone_input": "Phần trăm",
		**kw,
	}


def milestones_30_70(item_key="K-TRIENKHAI"):
	return [
		{"item_key": item_key, "milestone_name": "Tạm ứng", "percent": 30, "due_date": "2027-01-15"},
		{"item_key": item_key, "milestone_name": "Nghiệm thu", "percent": 70, "due_date": "2027-06-30"},
	]


def item_recurring(**kw):
	return {
		"item_name": "License",
		"vat_rate": "Không chịu thuế",
		"billing_type": "Định kỳ",
		"unit_price": 15_000_000,
		"period": "Quý",
		"period_start": "2027-01-01",
		"period_end": "2027-12-31",
		"requires_acceptance": 0,
		**kw,
	}


_numbers = itertools.count(1)


def make_contract(**kw):
	"""Hợp đồng chưa insert. Mặc định có một hạng mục Một lần và số hợp đồng riêng
	(dữ liệu chỉ rollback theo lớp test nên các test không được dùng chung số hợp đồng)."""
	ensure_roles()
	ensure_vat_rates()
	values = {
		"doctype": "Contract",
		"contract_no": f"HD-TEST-{next(_numbers):04d}",
		"customer": make_customer(),
		"start_date": "2027-01-01",
		"end_date": "2027-12-31",
		"items": [item_one_time()],
		**kw,
	}
	return frappe.get_doc(values)


def example_contract(**kw):
	return make_contract(
		items=[item_multi(), item_recurring(), item_one_time()],
		milestones=milestones_30_70(),
		**kw,
	)


class IntegrationTestContract(IntegrationTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	# ---- số hợp đồng, trường bắt buộc ----

	def test_duplicate_contract_no(self):
		make_contract(contract_no="HD-TRUNG").insert()
		with self.assertRaises(frappe.DuplicateEntryError) as cm:
			make_contract(contract_no="HD-TRUNG").insert()
		self.assertIn("Số hợp đồng HD-TRUNG đã tồn tại", str(cm.exception))

	def test_contract_no_is_name_and_trimmed(self):
		doc = make_contract(contract_no="  HD-TRIM ").insert()
		self.assertEqual(doc.name, "HD-TRIM")
		self.assertEqual(doc.status, "Nháp")

	def test_mandatory_fields(self):
		for field in ("contract_no", "customer", "start_date"):
			with self.assertRaises(frappe.MandatoryError, msg=field):
				make_contract(**{field: None}).insert()

	# ---- ngày và hạng mục ----

	def test_recurring_requires_end_date(self):
		doc = make_contract(end_date=None, items=[item_recurring(period_end=None)])
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.insert()
		self.assertIn(MSG_END_REQUIRED, str(cm.exception))

	def test_end_before_start(self):
		with self.assertRaises(frappe.ValidationError):
			make_contract(end_date="2026-12-31").insert()

	def test_milestone_amount_mismatch(self):
		doc = make_contract(
			items=[item_multi(milestone_input="Số tiền")],
			milestones=[
				{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 1", "amount": 30_000_000, "due_date": "2027-01-15"},
				{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 2", "amount": 60_000_000, "due_date": "2027-02-15"},
			],
		)
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.insert()
		self.assertIn("tổng các mốc là 90.000.000", str(cm.exception))
		self.assertIn("đang lệch -10.000.000", str(cm.exception))

	def test_milestone_percent_mismatch(self):
		doc = make_contract(
			items=[item_multi()],
			milestones=[
				{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 1", "percent": 30, "due_date": "2027-01-15"},
				{"item_key": "K-TRIENKHAI", "milestone_name": "Đợt 2", "percent": 60, "due_date": "2027-02-15"},
			],
		)
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.insert()
		self.assertIn("tổng phần trăm các mốc là 90%", str(cm.exception))
		self.assertIn("đang lệch -10%", str(cm.exception))

	def test_multi_requires_milestone(self):
		with self.assertRaises(frappe.ValidationError):
			make_contract(items=[item_multi()]).insert()

	def test_period_end_defaults_to_contract_end(self):
		doc = make_contract(end_date="2027-06-30", items=[item_recurring(period_end=None)]).insert()
		self.assertEqual(str(doc.items[0].period_end), "2027-06-30")

	def test_period_end_before_period_start(self):
		doc = make_contract(items=[item_recurring(period_end="2026-12-01")])
		with self.assertRaises(frappe.ValidationError):
			doc.insert()

	def test_inactive_vat_rate_rejected_for_new_item(self):
		frappe.get_doc({"doctype": "VAT Rate", "rate_name": "TS_NGUNG", "rate": 3, "is_active": 0}).insert()
		with self.assertRaises(frappe.ValidationError):
			make_contract(items=[item_one_time(vat_rate="TS_NGUNG")]).insert()

	def test_inactive_vat_rate_kept_on_existing_item(self):
		frappe.get_doc({"doctype": "VAT Rate", "rate_name": "TS_SAUNGUNG", "rate": 3}).insert()
		doc = make_contract(items=[item_one_time(vat_rate="TS_SAUNGUNG")]).insert()
		frappe.db.set_value("VAT Rate", "TS_SAUNGUNG", "is_active", 0)
		doc = frappe.get_doc("Contract", doc.name)
		doc.notes = "Sửa phần khác"
		doc.save()

	def test_orphan_milestones_dropped(self):
		doc = make_contract(items=[item_one_time()], milestones=milestones_30_70()).insert()
		self.assertEqual(len(doc.milestones), 0)

	# ---- tính tiền ----

	def test_totals_example(self):
		doc = example_contract().insert()
		self.assertEqual(doc.total_before_tax, 165_000_000)
		self.assertEqual(doc.total_tax, 10_400_000)
		self.assertEqual(doc.total_after_tax, 175_400_000)
		for field in ("invoiced_amount", "paid_amount", "outstanding_amount"):
			self.assertEqual(doc.get(field), 0)
		by_name = {i.item_name: i for i in doc.items}
		self.assertEqual(by_name["Triển khai"].tax_amount, 10_000_000)
		self.assertEqual(by_name["License"].amount_before_tax, 60_000_000)
		self.assertEqual(by_name["License"].tax_amount, 0)
		self.assertEqual(by_name["Đào tạo"].tax_amount, 400_000)
		self.assertEqual([m.milestone_amount for m in doc.milestones], [30_000_000, 70_000_000])

	def test_recurring_partial_period(self):
		# 01/01-15/02/2027: 46 ngày trên 90 ngày của quý.
		self.assertEqual(recurring_amount(9_000_000, "Quý", "2027-01-01", "2027-02-15"), 4_600_000)
		periods = recurring_periods("Quý", "2027-01-01", "2027-05-15")
		self.assertEqual(len(periods), 2)
		self.assertEqual(periods[0][2], 1)
		self.assertEqual(recurring_amount(9_000_000, "Quý", "2027-01-01", "2027-05-15"), 9_000_000 + 4_450_549)
		doc = make_contract(
			end_date="2027-02-15", items=[item_recurring(unit_price=9_000_000, period_end=None)]
		).insert()
		self.assertEqual(doc.total_before_tax, 4_600_000)

	def test_rounding_and_format(self):
		self.assertEqual(round_vnd(2.5), 3)
		self.assertEqual(round_vnd(1234.4), 1234)
		self.assertEqual(format_number(1234567, 0), "1.234.567")
		self.assertEqual(format_number(12.5), "12,5")
		self.assertEqual(format_number(-10), "-10")

	# ---- trạng thái ----

	def test_activate_draft(self):
		doc = example_contract().insert()
		doc.activate()
		doc = frappe.get_doc("Contract", doc.name)
		self.assertEqual(doc.status, "Đang hiệu lực")
		doc_types = frappe.get_all("DocType", filters={"module": "Contract Tracker"}, pluck="name")
		self.assertFalse([d for d in doc_types if "Installment" in d])

	def test_activate_without_items(self):
		doc = make_contract(items=[]).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.activate()
		self.assertIn(MSG_NO_ITEMS, str(cm.exception))
		self.assertEqual(frappe.db.get_value("Contract", doc.name, "status"), "Nháp")

	def test_cancel_from_draft_and_active(self):
		draft = make_contract(contract_no="HD-HUY-1").insert()
		draft.cancel_contract()
		self.assertEqual(frappe.db.get_value("Contract", "HD-HUY-1", "status"), "Đã hủy")
		active = make_contract(contract_no="HD-HUY-2").insert()
		active.activate()
		active.cancel_contract()
		self.assertEqual(frappe.db.get_value("Contract", "HD-HUY-2", "status"), "Đã hủy")

	def test_liquidate_only_active(self):
		doc = make_contract().insert()
		with self.assertRaises(frappe.ValidationError):
			doc.liquidate()
		doc.activate()
		doc.liquidate()
		self.assertEqual(frappe.db.get_value("Contract", doc.name, "status"), "Đã thanh lý")

	def test_no_change_after_cancel_or_liquidate(self):
		cancelled = make_contract(contract_no="HD-K1").insert()
		cancelled.cancel_contract()
		liquidated = make_contract(contract_no="HD-K2").insert()
		liquidated.activate()
		liquidated.liquidate()
		for name in ("HD-K1", "HD-K2"):
			for method in ("activate", "cancel_contract", "liquidate"):
				doc = frappe.get_doc("Contract", name)
				with self.assertRaises(frappe.ValidationError, msg=f"{name} {method}"):
					getattr(doc, method)()

	def test_locked_contract_cannot_be_edited(self):
		doc = make_contract().insert()
		doc.cancel_contract()
		doc = frappe.get_doc("Contract", doc.name)
		doc.contract_title = "Sửa sau khi hủy"
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.save()
		self.assertIn("đã hủy, không sửa được", str(cm.exception))

	def test_status_cannot_be_set_via_save(self):
		doc = make_contract().insert()
		doc.status = "Đang hiệu lực"
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_active_contract_items_editable(self):
		doc = make_contract().insert()
		doc.activate()
		doc = frappe.get_doc("Contract", doc.name)
		doc.append("items", item_one_time(item_name="Bảo trì", amount=1_000_000, vat_rate="10%"))
		doc.save()
		self.assertEqual(doc.total_before_tax, 6_000_000)
		self.assertEqual(doc.status, "Đang hiệu lực")

	# ---- xóa ----

	def test_delete_draft_ok(self):
		doc = make_contract().insert()
		frappe.delete_doc("Contract", doc.name)
		self.assertFalse(frappe.db.exists("Contract", doc.name))

	def test_delete_non_draft_rejected(self):
		doc = make_contract().insert()
		doc.activate()
		with self.assertRaises(frappe.ValidationError) as cm:
			frappe.delete_doc("Contract", doc.name)
		self.assertIn(MSG_DELETE_NOT_DRAFT, str(cm.exception))
		self.assertIn("Đã hủy", str(cm.exception))
		self.assertTrue(frappe.db.exists("Contract", doc.name))

	# ---- phân quyền ----

	def test_viewer_cannot_write(self):
		doc = make_contract().insert()
		viewer = make_user("chi.xem.hop.dong@example.com", VIEWER)
		frappe.set_user(viewer)
		self.assertTrue(frappe.has_permission("Contract", "read", doc=doc.name))
		self.assertFalse(frappe.has_permission("Contract", "write", doc=doc.name))
		self.assertFalse(frappe.has_permission("Contract", "delete", doc=doc.name))
		self.assertFalse(frappe.has_permission("Contract", "create"))
		with self.assertRaises(frappe.PermissionError):
			frappe.get_doc("Contract", doc.name).activate()
		with self.assertRaises(frappe.PermissionError):
			frappe.delete_doc("Contract", doc.name)

	def test_manager_can_use_contract_type_and_write(self):
		manager = make_user("quan.ly.hop.dong@example.com", MANAGER)
		for role_user in (manager, make_user("xem.loai.hd@example.com", VIEWER)):
			self.assertTrue(frappe.has_permission("Contract Type", "read", user=role_user))
			self.assertFalse(frappe.has_permission("Contract Type", "write", user=role_user))
		frappe.set_user(manager)
		doc = make_contract(contract_no="HD-QL-1").insert()
		doc.activate()
		self.assertEqual(frappe.db.get_value("Contract", "HD-QL-1", "status"), "Đang hiệu lực")
