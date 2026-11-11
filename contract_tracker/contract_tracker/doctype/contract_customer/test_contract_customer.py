# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

MSG_DUP_TAX = "Mã số thuế đã tồn tại ở khách hàng khác."


def make_customer(customer_name="Công ty thử", **kwargs):
	return frappe.get_doc({"doctype": "Contract Customer", "customer_name": customer_name, **kwargs})


class IntegrationTestContractCustomer(IntegrationTestCase):
	"""Dữ liệu được rollback theo lớp test, nên mỗi test dùng mã số thuế riêng."""

	def test_name_required(self):
		with self.assertRaises(frappe.MandatoryError):
			make_customer(customer_name="").insert()

	def test_naming_series(self):
		doc = make_customer().insert()
		self.assertRegex(doc.name, r"^KH-\d{5}$")

	def test_duplicate_tax_code_on_insert(self):
		make_customer(tax_code="TAX_INS").insert()
		with self.assertRaises(frappe.ValidationError) as cm:
			make_customer(customer_name="Khác", tax_code=" TAX_INS ").insert()
		self.assertIn(MSG_DUP_TAX, str(cm.exception))

	def test_duplicate_tax_code_on_update(self):
		make_customer(tax_code="TAX_UPD_A").insert()
		other = make_customer(customer_name="Khác", tax_code="TAX_UPD_B").insert()
		other.tax_code = "TAX_UPD_A"
		with self.assertRaises(frappe.ValidationError) as cm:
			other.save()
		self.assertIn(MSG_DUP_TAX, str(cm.exception))

	def test_same_tax_code_on_resave_ok(self):
		doc = make_customer(tax_code="TAX_RESAVE").insert()
		doc.notes = "ghi chú"
		doc.save()

	def test_blank_tax_codes_allowed(self):
		a = make_customer(tax_code=None).insert()
		b = make_customer(customer_name="Khác", tax_code="  ").insert()
		self.assertIsNone(a.tax_code)
		self.assertIsNone(b.tax_code)

	def test_invalid_email_phone(self):
		with self.assertRaises(frappe.ValidationError):
			make_customer(email="khong-phai-email").insert()
		with self.assertRaises(frappe.ValidationError):
			make_customer(phone="abc").insert()
		make_customer(email="a@b.vn", phone="+84 912 345 678").insert()
