# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []


def make_contract_type(code="KT_TEST", type_name="Hợp đồng thử", **kwargs):
	return frappe.get_doc({"doctype": "Contract Type", "code": code, "type_name": type_name, **kwargs})


class IntegrationTestContractType(IntegrationTestCase):
	"""Mỗi test chạy trong một transaction và được rollback, nên không cần tự dọn dữ liệu."""

	def test_create_normalizes_code_and_uses_it_as_name(self):
		doc = make_contract_type(code="  mua_ban ", type_name="  Hợp đồng mua bán ").insert()
		self.assertEqual(doc.name, "MUA_BAN")
		self.assertEqual(doc.code, "MUA_BAN")
		self.assertEqual(doc.type_name, "Hợp đồng mua bán")
		self.assertEqual(doc.is_active, 1)

	def test_invalid_code_is_rejected(self):
		for code in ("MUA BAN", "MUA-BAN", "PHÒNG", "A" * 21):
			with self.assertRaises(frappe.ValidationError, msg=code):
				make_contract_type(code=code).insert()

	def test_duplicate_code_is_rejected(self):
		make_contract_type(code="DICH_VU").insert()
		with self.assertRaises(frappe.DuplicateEntryError):
			make_contract_type(code="dich_vu", type_name="Trùng mã").insert()

	def test_type_name_is_required(self):
		with self.assertRaises(frappe.MandatoryError):
			make_contract_type(code="TRONG", type_name="").insert()
