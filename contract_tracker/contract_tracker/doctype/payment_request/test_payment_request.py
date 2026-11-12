# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.payment_receipt.test_payment_receipt import make_receipt
from contract_tracker.contract_tracker.doctype.payment_request.payment_request import (
	MSG_DUE_BEFORE_REQUEST,
	MSG_NO_ITEMS,
)
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	schedule_of,
)
from contract_tracker.setup import PAYMENT_REQUEST_PRINT_FORMAT
from contract_tracker.tests.test_setup import VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Payment Request"


def make_request(customer, schedules, **kw):
	return frappe.get_doc(
		{
			"doctype": DT,
			"customer": customer,
			"request_date": "2027-01-10",
			"due_date": "2027-01-25",
			"bank_account_holder": "CÔNG TY LHA",
			"bank_account_no": "0123456789",
			"bank_name": "Vietcombank",
			"bank_branch": "Hà Nội",
			"items": [{"schedule": s} for s in schedules],
			**kw,
		}
	)


def request_status(schedule):
	return frappe.db.get_value("Payment Schedule", schedule, "request_status")


class TestPaymentRequest(IntegrationTestCase):
	def setUp(self):
		self.contract = make_billing_contract()
		self.customer = self.contract.customer
		self.advance = schedule_of(self.contract.name, "Tạm ứng")
		self.license = schedule_of(self.contract.name, "Quý 1/2027")

	def tearDown(self):
		frappe.set_user("Administrator")

	def request(self, schedules=None, **kw):
		if schedules is None:
			schedules = [self.advance, self.license]
		return make_request(self.customer, schedules, **kw)

	def test_totals_and_words(self):
		doc = self.request().insert()
		self.assertEqual(doc.status, "Nháp")
		self.assertEqual(doc.total_before_tax, 45_000_000)
		self.assertEqual(doc.total_tax, 3_000_000)
		self.assertEqual(doc.grand_total, 48_000_000)
		self.assertEqual(doc.amount_in_words, "Bốn mươi tám triệu đồng")
		self.assertEqual(doc.items[0].outstanding, 33_000_000)
		self.assertEqual(doc.items[0].schedule_name, "Tạm ứng")

	def test_blank_rows_dropped_and_needs_item(self):
		doc = self.request([self.advance]).insert()
		doc.append("items", {})
		doc.save()
		self.assertEqual(len(doc.items), 1)
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request([]).insert()
		self.assertIn(MSG_NO_ITEMS, str(cm.exception))

	def test_other_customer_rejected(self):
		other = make_billing_contract()
		doc = self.request([schedule_of(other.name, "Tạm ứng")])
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.insert()
		self.assertIn("không thuộc khách hàng của đề nghị.", str(cm.exception))
		self.assertIn("Dòng 1", str(cm.exception))
		self.assertEqual(frappe.db.count(DT, {"customer": self.customer}), 0)

	def test_duplicate_row_rejected(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request([self.advance, self.advance]).insert()
		self.assertIn("bị trùng trong đề nghị", str(cm.exception))

	def test_fully_paid_rejected(self):
		make_receipt(self.customer, 33_000_000, [(self.advance, 33_000_000)]).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request([self.advance]).insert()
		self.assertIn("đã thu đủ", str(cm.exception))

	def test_bad_contract_rejected(self):
		frappe.db.set_value("Contract", self.contract.name, "status", "Đã hủy")
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request([self.advance]).insert()
		self.assertIn("không lập đề nghị được", str(cm.exception))

	def test_unbilled_and_unaccepted_allowed(self):
		# Không bắt buộc thứ tự chứng từ: đợt chưa nghiệm thu hay chưa xuất hóa đơn vẫn lập được.
		self.request([self.advance]).insert()

	def test_schedule_in_other_request(self):
		first = self.request([self.advance]).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request([self.advance, self.license]).insert()
		self.assertIn(first.name, str(cm.exception))
		self.assertIn("đã nằm trong đề nghị", str(cm.exception))

	def test_due_before_request_date(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.request(due_date="2027-01-09").insert()
		self.assertIn(MSG_DUE_BEFORE_REQUEST, str(cm.exception))

	def test_request_status_on_save(self):
		self.assertEqual(request_status(self.advance), "Chưa lập")
		doc = self.request().insert()
		self.assertEqual(request_status(self.advance), "Đã lập")
		self.assertEqual(request_status(self.license), "Đã lập")
		doc.mark_sent()
		self.assertEqual(request_status(self.advance), "Đã lập")

	def test_request_status_on_row_removed(self):
		doc = self.request().insert()
		doc.items = [r for r in doc.items if r.schedule == self.advance]
		doc.save()
		self.assertEqual(request_status(self.advance), "Đã lập")
		self.assertEqual(request_status(self.license), "Chưa lập")

	def test_delete_draft_resets_status(self):
		first = self.request([self.advance]).insert()
		second = self.request([self.license]).insert()
		frappe.delete_doc(DT, first.name)
		self.assertEqual(request_status(self.advance), "Chưa lập")
		self.assertEqual(request_status(self.license), "Đã lập")
		frappe.delete_doc(DT, second.name)
		self.assertEqual(request_status(self.license), "Chưa lập")

	def test_mark_sent(self):
		doc = self.request().insert()
		doc.mark_sent()
		doc.reload()
		self.assertEqual(doc.status, "Đã gửi")
		with self.assertRaises(frappe.ValidationError):
			doc.mark_sent()

	def test_sent_locked_except_notes(self):
		doc = self.request().insert()
		doc.mark_sent()
		doc.reload()
		doc.due_date = "2027-02-01"
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.save()
		self.assertIn("chỉ sửa được ghi chú", str(cm.exception))
		doc.reload()
		doc.items = [r for r in doc.items if r.schedule == self.advance]
		with self.assertRaises(frappe.ValidationError):
			doc.save()
		doc.reload()
		doc.notes = "Đã gọi điện nhắc"
		doc.save()
		self.assertEqual(frappe.db.get_value(DT, doc.name, "notes"), "Đã gọi điện nhắc")

	def test_sent_cannot_delete(self):
		doc = self.request().insert()
		doc.mark_sent()
		with self.assertRaises(frappe.ValidationError) as cm:
			frappe.delete_doc(DT, doc.name)
		self.assertIn("Chỉ xóa được đề nghị Nháp", str(cm.exception))
		self.assertEqual(request_status(self.advance), "Đã lập")

	def test_status_readonly(self):
		doc = self.request().insert()
		doc.status = "Đã gửi"
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_paid_after_request_keeps_saving(self):
		doc = self.request().insert()
		make_receipt(self.customer, 33_000_000, [(self.advance, 33_000_000)]).insert()
		doc.reload()
		doc.notes = "Ghi chú"
		doc.save()
		doc.mark_sent()
		self.assertEqual(doc.items[0].outstanding, 0)

	def test_customer_set_only_once(self):
		doc = self.request().insert()
		doc.customer = make_contract().insert().customer
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_viewer_read_and_print_only(self):
		doc = self.request().insert()
		frappe.set_user(make_user("xem.de.nghi@example.com", VIEWER))
		self.assertTrue(frappe.has_permission(DT, "read", doc=doc.name))
		self.assertTrue(frappe.has_permission(DT, "print", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "write", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "delete", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "create"))
		with self.assertRaises(frappe.PermissionError):
			self.request([]).insert()

	def test_print_renders(self):
		doc = self.request().insert()
		html = frappe.get_print(DT, doc.name, print_format=PAYMENT_REQUEST_PRINT_FORMAT)
		customer_name = frappe.db.get_value("Contract Customer", self.customer, "customer_name")
		for text in (
			doc.name,
			customer_name,
			"Tạm ứng",
			"Bốn mươi tám triệu đồng",
			"0123456789",
			"Chữ ký",
			"Bên đề nghị",
		):
			self.assertIn(text, html)
