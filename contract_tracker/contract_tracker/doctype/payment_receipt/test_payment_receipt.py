# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.api import suggest_allocation
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	make_invoice,
	schedule_of,
	schedule_state,
)
from contract_tracker.tests.test_setup import VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Payment Receipt"


def make_receipt(customer, amount, allocations, **kw):
	return frappe.get_doc(
		{
			"doctype": DT,
			"customer": customer,
			"receipt_date": "2027-01-20",
			"amount": amount,
			"method": "Chuyển khoản",
			"allocations": [{"schedule": s, "allocated_amount": a} for s, a in allocations],
			**kw,
		}
	)


def contract_amounts(name):
	return frappe.db.get_value(
		"Contract", name, ["invoiced_amount", "paid_amount", "outstanding_amount"], as_dict=True
	)


class TestPaymentReceipt(IntegrationTestCase):
	def setUp(self):
		self.contract = make_billing_contract()
		self.customer = self.contract.customer
		self.advance = schedule_of(self.contract.name, "Tạm ứng")
		self.license = schedule_of(self.contract.name, "Quý 1/2027")

	def tearDown(self):
		frappe.set_user("Administrator")

	def receipt(self, amount, allocations, **kw):
		return make_receipt(self.customer, amount, allocations, **kw)

	def test_example_statuses(self):
		invoice = make_invoice(self.customer, [self.advance, self.license]).insert()
		suggestion = suggest_allocation(self.customer, 40_000_000, invoice=invoice.name)
		self.assertEqual(
			[(r["schedule"], r["allocated_amount"]) for r in suggestion],
			[(self.advance, 33_000_000), (self.license, 7_000_000)],
		)
		self.receipt(40_000_000, [(r["schedule"], r["allocated_amount"]) for r in suggestion]).insert()
		advance, license_ = schedule_state(self.advance), schedule_state(self.license)
		self.assertEqual((advance.payment_status, advance.paid_amount), ("Đã thu", 33_000_000))
		self.assertEqual((license_.payment_status, license_.paid_amount), ("Thu một phần", 7_000_000))
		self.assertEqual(
			frappe.db.get_value("Payment Schedule", self.license, "total_amount") - license_.paid_amount, 8_000_000
		)
		amounts = contract_amounts(self.contract.name)
		self.assertEqual(amounts.paid_amount, 40_000_000)
		self.assertEqual(amounts.outstanding_amount, self.contract.total_after_tax - 40_000_000)

	def test_over_outstanding(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(50_000_000, [(self.license, 15_000_001)]).insert()
		self.assertIn("vượt số còn nợ", str(cm.exception))
		self.receipt(10_000_000, [(self.license, 10_000_000)]).insert()
		with self.assertRaises(frappe.ValidationError):
			self.receipt(10_000_000, [(self.license, 5_000_001)]).insert()
		self.receipt(5_000_000, [(self.license, 5_000_000)]).insert()

	def test_over_amount(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(10_000_000, [(self.advance, 6_000_000), (self.license, 5_000_000)]).insert()
		self.assertIn("vượt số tiền phiếu thu", str(cm.exception))

	def test_other_customer(self):
		other = make_billing_contract()
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(1_000_000, [(schedule_of(other.name, "Tạm ứng"), 1_000_000)]).insert()
		self.assertIn("không thuộc khách hàng của phiếu thu", str(cm.exception))

	def test_amount_positive_and_allocation_positive(self):
		for amount in (0, -5):
			with self.assertRaises(frappe.ValidationError) as cm:
				self.receipt(amount, []).insert()
			self.assertIn("Số tiền phải lớn hơn 0", str(cm.exception))
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(1_000_000, [(self.license, 0)]).insert()
		self.assertIn("số phân bổ phải lớn hơn 0", str(cm.exception))

	def test_duplicate_row(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(10_000_000, [(self.license, 1_000_000), (self.license, 1_000_000)]).insert()
		self.assertIn("bị trùng trong phiếu thu", str(cm.exception))

	def test_bad_contract_status(self):
		frappe.db.set_value("Contract", self.contract.name, "status", "Đã hủy")
		with self.assertRaises(frappe.ValidationError) as cm:
			self.receipt(1_000_000, [(self.license, 1_000_000)]).insert()
		self.assertIn("không thu được", str(cm.exception))

	def test_liquidated_contract_allowed(self):
		frappe.db.set_value("Contract", self.contract.name, "status", "Đã thanh lý")
		self.receipt(1_000_000, [(self.license, 1_000_000)]).insert()

	def test_unallocated_remainder(self):
		doc = self.receipt(20_000_000, [(self.license, 15_000_000)]).insert()
		self.assertEqual(doc.allocated_total, 15_000_000)
		self.assertEqual(doc.unallocated_amount, 5_000_000)
		self.assertEqual(self.receipt(3_000_000, []).insert().unallocated_amount, 3_000_000)

	def test_receipt_before_invoice(self):
		self.assertEqual(schedule_state(self.license).invoice_status, "Chưa xuất")
		self.receipt(15_000_000, [(self.license, 15_000_000)]).insert()
		state = schedule_state(self.license)
		self.assertEqual((state.invoice_status, state.payment_status), ("Chưa xuất", "Đã thu"))

	def test_edit_moves_allocation(self):
		doc = self.receipt(10_000_000, [(self.license, 10_000_000)]).insert()
		doc.allocations[0].schedule = self.advance
		doc.allocations[0].allocated_amount = 4_000_000
		doc.save()
		self.assertEqual(schedule_state(self.license).payment_status, "Chưa thu")
		self.assertEqual(schedule_state(self.license).paid_amount, 0)
		self.assertEqual(
			(schedule_state(self.advance).payment_status, schedule_state(self.advance).paid_amount),
			("Thu một phần", 4_000_000),
		)
		self.assertEqual(contract_amounts(self.contract.name).paid_amount, 4_000_000)

	def test_edit_own_allocation_not_counted_twice(self):
		doc = self.receipt(15_000_000, [(self.license, 15_000_000)]).insert()
		doc.notes = "Sửa ghi chú"
		doc.save()
		self.assertEqual(schedule_state(self.license).paid_amount, 15_000_000)

	def test_delete_recomputes(self):
		doc = self.receipt(15_000_000, [(self.license, 15_000_000)]).insert()
		self.assertEqual(contract_amounts(self.contract.name).paid_amount, 15_000_000)
		frappe.delete_doc(DT, doc.name)
		state = schedule_state(self.license)
		self.assertEqual((state.payment_status, state.paid_amount), ("Chưa thu", 0))
		amounts = contract_amounts(self.contract.name)
		self.assertEqual(amounts.paid_amount, 0)
		self.assertEqual(amounts.outstanding_amount, self.contract.total_after_tax)

	def test_overdue_cleared_when_paid(self):
		frappe.db.set_value("Payment Schedule", self.license, "due_date", "2026-01-01")
		self.receipt(5_000_000, [(self.license, 5_000_000)]).insert()
		self.assertEqual(frappe.db.get_value("Payment Schedule", self.license, "is_overdue"), 1)
		self.receipt(10_000_000, [(self.license, 10_000_000)]).insert()
		self.assertEqual(frappe.db.get_value("Payment Schedule", self.license, "is_overdue"), 0)

	def test_documented_schedule_blocks_contract_delete_and_cancel(self):
		self.receipt(1_000_000, [(self.license, 1_000_000)]).insert()
		with self.assertRaises(frappe.ValidationError):
			frappe.delete_doc("Contract", self.contract.name)
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc("Contract", self.contract.name).cancel_contract()

	def test_viewer_read_only(self):
		doc = self.receipt(1_000_000, []).insert()
		frappe.set_user(make_user("xem.phieu.thu@example.com", VIEWER))
		self.assertTrue(frappe.has_permission(DT, "read", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "write", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "delete", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "create"))
		with self.assertRaises(frappe.PermissionError):
			make_receipt(make_contract().customer, 1, []).insert()
