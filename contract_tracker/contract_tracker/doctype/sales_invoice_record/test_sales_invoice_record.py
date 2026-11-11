# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import itertools

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.contract.test_contract import (
	item_multi,
	item_recurring,
	make_contract,
	milestones_30_70,
)
from contract_tracker.contract_tracker.doctype.sales_invoice_record.sales_invoice_record import (
	MSG_BAD_CONTRACT,
	MSG_DUP_NO,
	MSG_DUP_ROW,
	MSG_HAS_PAYMENT,
	MSG_IN_OTHER_INVOICE,
	MSG_NO_ITEMS,
	MSG_OTHER_CUSTOMER,
)
from contract_tracker.tests.test_setup import VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Sales Invoice Record"
_numbers = itertools.count(1)


def schedule_of(contract, name):
	return frappe.db.get_value("Payment Schedule", {"contract": contract, "schedule_name": name}, "name")


def make_billing_contract(**kw):
	"""Hợp đồng đang hiệu lực có đợt Tạm ứng 33.000.000 (thuế 10%) và License Quý 1/2027 15.000.000 (không chịu thuế)."""
	doc = make_contract(
		items=[item_multi(), item_recurring(credit_days=15)], milestones=milestones_30_70(), **kw
	).insert()
	doc.activate()
	return frappe.get_doc("Contract", doc.name)


def make_invoice(customer, schedules, **kw):
	return frappe.get_doc(
		{
			"doctype": DT,
			"customer": customer,
			"invoice_no": f"{next(_numbers):07d}",
			"invoice_series": "C27TAA",
			"invoice_date": "2027-01-10",
			"items": [{"schedule": s} for s in schedules],
			**kw,
		}
	)


def schedule_state(name):
	return frappe.db.get_value(
		"Payment Schedule", name, ["invoice_status", "invoice_no", "payment_status", "paid_amount"], as_dict=True
	)


class TestSalesInvoiceRecord(IntegrationTestCase):
	def setUp(self):
		self.contract = make_billing_contract()
		self.advance = schedule_of(self.contract.name, "Tạm ứng")
		self.license = schedule_of(self.contract.name, "Quý 1/2027")

	def tearDown(self):
		frappe.set_user("Administrator")

	def invoice(self, schedules=None, **kw):
		if schedules is None:
			schedules = [self.advance, self.license]
		return make_invoice(self.contract.customer, schedules, **kw)

	def test_totals_and_tax_breakdown(self):
		inv = self.invoice().insert()
		self.assertEqual(inv.status, "Hiệu lực")
		self.assertEqual(inv.total_before_tax, 45_000_000)
		self.assertEqual(inv.total_tax, 3_000_000)
		self.assertEqual(inv.grand_total, 48_000_000)
		by_rate = {r.vat_rate: r for r in inv.tax_breakdown}
		self.assertEqual(by_rate["10%"].amount_before_tax, 30_000_000)
		self.assertEqual(by_rate["10%"].tax_amount, 3_000_000)
		self.assertEqual(by_rate["Không chịu thuế"].total_amount, 15_000_000)
		self.assertEqual(by_rate["Không chịu thuế"].tax_amount, 0)

	def test_active_invoice_marks_schedules(self):
		inv = self.invoice().insert()
		for s in (self.advance, self.license):
			state = schedule_state(s)
			self.assertEqual(state.invoice_status, "Đã xuất")
			self.assertEqual(state.invoice_no, inv.invoice_no)
		self.assertEqual(frappe.db.get_value("Contract", self.contract.name, "invoiced_amount"), 48_000_000)

	def test_blank_rows_dropped_and_needs_item(self):
		inv = self.invoice([self.advance]).insert()
		inv.append("items", {})
		inv.save()
		self.assertEqual(len(inv.items), 1)
		with self.assertRaises(frappe.ValidationError) as cm:
			self.invoice([]).insert()
		self.assertIn(MSG_NO_ITEMS, str(cm.exception))

	def test_reject_other_customer(self):
		other = make_billing_contract()
		inv = self.invoice([schedule_of(other.name, "Tạm ứng")])
		with self.assertRaises(frappe.ValidationError) as cm:
			inv.insert()
		self.assertIn(MSG_OTHER_CUSTOMER.split("{")[0], str(cm.exception))

	def test_reject_schedule_in_other_active_invoice(self):
		self.invoice([self.advance]).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			self.invoice([self.advance, self.license]).insert()
		self.assertIn("đã nằm trong hóa đơn", str(cm.exception))
		self.assertTrue(MSG_IN_OTHER_INVOICE)

	def test_reject_duplicate_row(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.invoice([self.advance, self.advance]).insert()
		self.assertIn("bị trùng trong hóa đơn", str(cm.exception))
		self.assertTrue(MSG_DUP_ROW)

	def test_reject_draft_or_cancelled_contract(self):
		draft = make_contract(items=[item_multi()], milestones=milestones_30_70()).insert()
		contract = make_billing_contract()
		sched = schedule_of(contract.name, "Tạm ứng")
		# Hợp đồng hết hiệu lực không còn ở trạng thái cho phép: giả lập bằng trạng thái Đã hủy.
		frappe.db.set_value("Contract", contract.name, "status", "Đã hủy")
		with self.assertRaises(frappe.ValidationError) as cm:
			make_invoice(contract.customer, [sched]).insert()
		self.assertIn("không xuất hóa đơn được", str(cm.exception))
		self.assertTrue(MSG_BAD_CONTRACT and draft.status == "Nháp")

	def test_expired_and_liquidated_contract_allowed(self):
		frappe.db.set_value("Contract", self.contract.name, "status", "Hết hạn")
		self.invoice([self.advance]).insert()
		frappe.db.set_value("Contract", self.contract.name, "status", "Đã thanh lý")
		self.invoice([self.license]).insert()

	def test_duplicate_invoice_no_series(self):
		first = self.invoice([self.advance], invoice_no="TRUNG-1").insert()
		with self.assertRaises(frappe.DuplicateEntryError) as cm:
			self.invoice([self.license], invoice_no="TRUNG-1").insert()
		self.assertIn("Số hóa đơn TRUNG-1 ký hiệu C27TAA đã tồn tại", str(cm.exception))
		self.assertTrue(MSG_DUP_NO)
		self.invoice([self.license], invoice_no="TRUNG-1", invoice_series="C27TBB").insert()
		first.reload()
		first.cancel_invoice()
		self.invoice([self.advance], invoice_no="TRUNG-1").insert()

	def test_remove_row_resets_schedule(self):
		inv = self.invoice().insert()
		inv.items = [r for r in inv.items if r.schedule == self.advance]
		inv.save()
		state = schedule_state(self.license)
		self.assertEqual(state.invoice_status, "Chưa xuất")
		self.assertFalse(state.invoice_no)
		self.assertEqual(frappe.db.get_value("Contract", self.contract.name, "invoiced_amount"), 33_000_000)
		self.assertEqual(inv.grand_total, 33_000_000)

	def test_cancel_invoice_resets_schedules(self):
		inv = self.invoice().insert()
		inv.cancel_invoice()
		inv.reload()
		self.assertEqual(inv.status, "Đã hủy")
		for s in (self.advance, self.license):
			state = schedule_state(s)
			self.assertEqual(state.invoice_status, "Chưa xuất")
			self.assertFalse(state.invoice_no)
		self.assertEqual(frappe.db.get_value("Contract", self.contract.name, "invoiced_amount"), 0)

	def test_cancel_blocked_when_paid(self):
		inv = self.invoice().insert()
		frappe.get_doc(
			{
				"doctype": "Payment Receipt",
				"customer": self.contract.customer,
				"receipt_date": "2027-01-20",
				"amount": 1_000_000,
				"method": "Tiền mặt",
				"allocations": [{"schedule": self.license, "allocated_amount": 1_000_000}],
			}
		).insert()
		inv.reload()
		with self.assertRaises(frappe.ValidationError) as cm:
			inv.cancel_invoice()
		self.assertIn(MSG_HAS_PAYMENT, str(cm.exception))
		inv.reload()
		self.assertEqual(inv.status, "Hiệu lực")
		self.assertEqual(schedule_state(self.license).invoice_status, "Đã xuất")

	def test_cancelled_invoice_locked(self):
		inv = self.invoice().insert()
		inv.cancel_invoice()
		inv.reload()
		inv.notes = "Sửa"
		with self.assertRaises(frappe.ValidationError):
			inv.save()

	def test_status_not_editable(self):
		inv = self.invoice().insert()
		inv.status = "Đã hủy"
		with self.assertRaises(frappe.ValidationError):
			inv.save()

	def test_delete_only_cancelled(self):
		inv = self.invoice().insert()
		with self.assertRaises(frappe.ValidationError):
			frappe.delete_doc(DT, inv.name)
		inv.cancel_invoice()
		frappe.delete_doc(DT, inv.name)
		self.assertFalse(frappe.db.exists(DT, inv.name))

	def test_customer_set_only_once(self):
		inv = self.invoice().insert()
		inv.customer = make_contract().insert().customer
		with self.assertRaises(frappe.ValidationError):
			inv.save()

	def test_viewer_read_only(self):
		inv = self.invoice().insert()
		frappe.set_user(make_user("xem.hoa.don@example.com", VIEWER))
		self.assertTrue(frappe.has_permission(DT, "read", doc=inv.name))
		self.assertFalse(frappe.has_permission(DT, "write", doc=inv.name))
		self.assertFalse(frappe.has_permission(DT, "delete", doc=inv.name))
		self.assertFalse(frappe.has_permission(DT, "create"))
		with self.assertRaises(frappe.PermissionError):
			self.invoice([]).insert()
