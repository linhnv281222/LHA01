# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.contract_tracker.doctype.vat_rate.vat_rate import (
	MSG_IN_USE,
	MSG_NON_TAXABLE,
	is_vat_rate_used,
)

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

IS_USED = "contract_tracker.contract_tracker.doctype.vat_rate.vat_rate.is_vat_rate_used"


def make_vat_rate(rate_name, rate=7, **kwargs):
	return frappe.get_doc({"doctype": "VAT Rate", "rate_name": rate_name, "rate": rate, **kwargs})


class IntegrationTestVATRate(IntegrationTestCase):
	"""Dữ liệu được rollback theo lớp test, nên mỗi test dùng tên riêng (tránh đụng dữ liệu ban đầu)."""

	def test_create_defaults_and_name(self):
		doc = make_vat_rate("  TS_TAO ").insert()
		self.assertEqual(doc.name, "TS_TAO")
		self.assertEqual(doc.is_active, 1)
		self.assertEqual(doc.is_non_taxable, 0)

	def test_duplicate_name_rejected(self):
		make_vat_rate("TS_TRUNG").insert()
		with self.assertRaises(frappe.DuplicateEntryError):
			make_vat_rate("TS_TRUNG").insert()

	def test_non_taxable_requires_zero_rate(self):
		with self.assertRaises(frappe.ValidationError) as cm:
			make_vat_rate("TS_KCT1", rate=5, is_non_taxable=1).insert()
		self.assertIn(MSG_NON_TAXABLE, str(cm.exception))
		make_vat_rate("TS_KCT2", rate=0, is_non_taxable=1).insert()

	def test_rate_out_of_range(self):
		for rate in (-1, 100.5):
			with self.assertRaises(frappe.ValidationError, msg=str(rate)):
				make_vat_rate("TS_RANGE", rate=rate).insert()

	def test_delete_blocked_when_used(self):
		doc = make_vat_rate("TS_DUNG").insert()
		with patch(IS_USED, return_value=True):
			with self.assertRaises(frappe.ValidationError) as cm:
				frappe.delete_doc("VAT Rate", doc.name)
		self.assertIn(MSG_IN_USE, str(cm.exception))
		self.assertTrue(frappe.db.exists("VAT Rate", doc.name))

	def test_delete_allowed_when_unused(self):
		doc = make_vat_rate("TS_XOA").insert()
		frappe.delete_doc("VAT Rate", doc.name)
		self.assertFalse(frappe.db.exists("VAT Rate", doc.name))

	def test_is_vat_rate_used_false_without_contract(self):
		self.assertFalse(is_vat_rate_used("TS_KHONG_CO"))
