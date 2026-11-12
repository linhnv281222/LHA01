# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import re

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.acceptance_minutes.acceptance_minutes import (
	MSG_NEED_SCAN,
	MSG_NO_ITEMS,
	MSG_NOT_REQUIRED,
)
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
	make_billing_contract,
	schedule_of,
)
from contract_tracker.setup import ACCEPTANCE_MINUTES_PRINT_FORMAT
from contract_tracker.tests.test_setup import VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Acceptance Minutes"


def make_minutes(customer, schedules, **kw):
	return frappe.get_doc(
		{
			"doctype": DT,
			"customer": customer,
			"minutes_date": "2027-04-10",
			"items": [{"schedule": s} for s in schedules],
			**kw,
		}
	)


def need_acceptance(*schedules, value=1):
	for s in schedules:
		frappe.db.set_value(
			"Payment Schedule",
			s,
			{"requires_acceptance": value, "acceptance_status": "Chưa" if value else "Không cần"},
		)


def acceptance_of(schedule):
	return frappe.db.get_value("Payment Schedule", schedule, "acceptance_status")


class TestAcceptanceMinutes(IntegrationTestCase):
	def setUp(self):
		self.contract = make_billing_contract()
		self.customer = self.contract.customer
		self.advance = schedule_of(self.contract.name, "Tạm ứng")
		self.license = schedule_of(self.contract.name, "Quý 1/2027")
		need_acceptance(self.advance, self.license)

	def tearDown(self):
		frappe.set_user("Administrator")

	def minutes(self, schedules=None, **kw):
		if schedules is None:
			schedules = [self.advance, self.license]
		return make_minutes(self.customer, schedules, **kw)

	def signed(self, schedules=None):
		doc = self.minutes(schedules).insert()
		doc.scan_file = "/files/bien-ban.pdf"
		doc.save()
		doc.mark_signed()
		doc.reload()
		return doc

	def test_multi_contract_and_naming(self):
		other = make_billing_contract(customer=self.customer)
		other_advance = schedule_of(other.name, "Tạm ứng")
		need_acceptance(other_advance)
		doc = self.minutes([self.advance, other_advance]).insert()
		self.assertRegex(doc.name, r"^BBNT-\d{4}-\d{5}$")
		self.assertEqual(doc.status, "Nháp")
		self.assertEqual(doc.schedule_count, 2)
		self.assertEqual(doc.grand_total, 66_000_000)
		self.assertEqual({r.contract for r in doc.items}, {self.contract.name, other.name})

	def test_needs_item(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.minutes([]).insert()
		self.assertIn(MSG_NO_ITEMS, str(cm.exception))

	def test_not_required_rejected(self):
		need_acceptance(self.license, value=0)
		with self.assertRaises(frappe.ValidationError) as cm:
			self.minutes().insert()
		self.assertIn(MSG_NOT_REQUIRED.format(2, self.license), str(cm.exception))

	def test_other_customer_rejected(self):
		other = make_billing_contract()
		other_advance = schedule_of(other.name, "Tạm ứng")
		need_acceptance(other_advance)
		with self.assertRaises(frappe.ValidationError) as cm:
			self.minutes([other_advance]).insert()
		self.assertIn("không thuộc khách hàng của biên bản.", str(cm.exception))
		self.assertIn("Dòng 1", str(cm.exception))

	def test_duplicate_row_rejected(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			self.minutes([self.advance, self.advance]).insert()
		self.assertIn("bị trùng trong biên bản", str(cm.exception))

	def test_in_other_minutes(self):
		first = self.minutes([self.advance]).insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			self.minutes([self.license, self.advance]).insert()
		self.assertIn(first.name, str(cm.exception))
		self.assertIn("Dòng 2", str(cm.exception))
		self.assertIn("đã nằm trong biên bản", str(cm.exception))

	def test_bad_contract_only_new_rows(self):
		doc = self.minutes([self.advance]).insert()
		frappe.db.set_value("Contract", self.contract.name, "status", "Đã hủy")
		doc.notes = "Sửa ghi chú"
		doc.save()  # dòng cũ không bị kiểm tra lại
		doc.append("items", {"schedule": self.license})
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.save()
		self.assertIn("không lập biên bản được", str(cm.exception))

	def test_content_default_and_editable(self):
		doc = self.minutes().insert()
		self.assertIn("Tạm ứng", doc.content)
		self.assertIn("(01/01/2027 - 31/03/2027)", doc.content)
		self.assertEqual(len(doc.content.split("\n")), 2)
		frappe.delete_doc(DT, doc.name)
		custom = self.minutes([self.advance], content="Nội dung tự viết").insert()
		self.assertEqual(custom.content, "Nội dung tự viết")

	def test_party_a_default_from_customer(self):
		frappe.db.set_value("Contract Customer", self.customer, "contact_person", "Nguyễn Văn A")
		doc = self.minutes([self.advance]).insert()
		self.assertEqual(doc.party_a_rep, "Nguyễn Văn A")
		self.assertFalse(doc.party_b_rep)

	def test_draft_keeps_status(self):
		doc = self.minutes().insert()
		self.assertEqual(acceptance_of(self.advance), "Chưa")
		self.assertEqual(acceptance_of(self.license), "Chưa")
		doc.notes = "x"
		doc.save()
		self.assertEqual(acceptance_of(self.advance), "Chưa")

	def test_mark_signed_needs_scan(self):
		doc = self.minutes().insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.mark_signed()
		self.assertIn(MSG_NEED_SCAN, str(cm.exception))
		doc.reload()
		self.assertEqual(doc.status, "Nháp")
		self.assertEqual(acceptance_of(self.advance), "Chưa")

	def test_mark_signed(self):
		doc = self.signed()
		self.assertEqual(doc.status, "Đã ký")
		self.assertEqual(acceptance_of(self.advance), "Đã ký")
		self.assertEqual(acceptance_of(self.license), "Đã ký")
		with self.assertRaises(frappe.ValidationError):
			doc.mark_signed()

	def test_signed_locked_except_notes_and_scan(self):
		doc = self.signed()
		doc.minutes_date = "2027-05-01"
		with self.assertRaises(frappe.ValidationError) as cm:
			doc.save()
		self.assertIn("chỉ sửa được ghi chú và file scan", str(cm.exception))
		doc.reload()
		doc.party_a_rep = "Người khác"
		with self.assertRaises(frappe.ValidationError):
			doc.save()
		doc.reload()
		doc.items = [r for r in doc.items if r.schedule == self.advance]
		with self.assertRaises(frappe.ValidationError):
			doc.save()
		doc.reload()
		doc.notes = "Đã lưu kho"
		doc.scan_file = "/files/bien-ban-2.pdf"
		doc.save()
		self.assertEqual(frappe.db.get_value(DT, doc.name, "notes"), "Đã lưu kho")

	def test_signed_notes_editable_after_item_no_longer_required(self):
		doc = self.signed()
		need_acceptance(self.advance, value=0)
		doc.reload()
		doc.notes = "Ghi chú sau khi ký"
		doc.save()
		self.assertEqual(frappe.db.get_value(DT, doc.name, "notes"), "Ghi chú sau khi ký")

	def test_signed_cannot_delete(self):
		doc = self.signed()
		with self.assertRaises(frappe.ValidationError) as cm:
			frappe.delete_doc(DT, doc.name)
		self.assertIn("Chỉ xóa được biên bản Nháp", str(cm.exception))
		self.assertEqual(acceptance_of(self.advance), "Đã ký")

	def test_status_readonly(self):
		doc = self.minutes().insert()
		doc.status = "Đã ký"
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_customer_set_only_once(self):
		doc = self.minutes().insert()
		doc.customer = make_contract().insert().customer
		with self.assertRaises(frappe.ValidationError):
			doc.save()

	def test_delete_draft_resets_and_reusable(self):
		doc = self.minutes().insert()
		frappe.delete_doc(DT, doc.name)
		self.assertEqual(acceptance_of(self.advance), "Chưa")
		self.assertEqual(acceptance_of(self.license), "Chưa")
		self.minutes().insert()

	def test_viewer_read_and_print_only(self):
		doc = self.minutes().insert()
		frappe.set_user(make_user("xem.nghiem.thu@example.com", VIEWER))
		self.assertTrue(frappe.has_permission(DT, "read", doc=doc.name))
		self.assertTrue(frappe.has_permission(DT, "print", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "write", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "delete", doc=doc.name))
		self.assertFalse(frappe.has_permission(DT, "create"))
		with self.assertRaises(frappe.PermissionError):
			self.minutes().insert()
		with self.assertRaises(frappe.PermissionError):
			doc.mark_signed()

	def test_print_renders(self):
		doc = self.minutes().insert()
		html = frappe.get_print(DT, doc.name, print_format=ACCEPTANCE_MINUTES_PRINT_FORMAT)
		customer_name = frappe.db.get_value("Contract Customer", self.customer, "customer_name")
		for text in ("BIÊN BẢN NGHIỆM THU", doc.name, customer_name, "Tạm ứng", "Tổng cộng", "Chữ ký"):
			self.assertIn(text, html)
		self.assertTrue(re.search(r"BBNT-\d{4}-\d{5}", html))
