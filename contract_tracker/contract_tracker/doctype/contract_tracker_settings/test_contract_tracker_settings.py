# Copyright (c) 2026, FaceNet and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.tests.test_setup import MANAGER, VIEWER, make_user

EXTRA_TEST_RECORD_DEPENDENCIES = []
IGNORE_TEST_RECORD_DEPENDENCIES = []

DT = "Contract Tracker Settings"


class TestContractTrackerSettings(IntegrationTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	def test_read_write_fields(self):
		doc = frappe.get_single(DT)
		doc.update({"bank_account_holder": "CÔNG TY LHA", "bank_account_no": "111", "bank_name": "ACB", "bank_branch": "HN"})
		doc.save()
		values = frappe.db.get_singles_dict(DT)
		self.assertEqual(values["bank_account_no"], "111")
		self.assertEqual(values["bank_branch"], "HN")

	def test_manager_writes_viewer_reads(self):
		manager = make_user("quan.ly.cai.dat@example.com", MANAGER)
		viewer = make_user("xem.cai.dat@example.com", VIEWER)
		self.assertTrue(frappe.has_permission(DT, "write", user=manager))
		self.assertTrue(frappe.has_permission(DT, "read", user=viewer))
		self.assertFalse(frappe.has_permission(DT, "write", user=viewer))
		frappe.set_user(manager)
		doc = frappe.get_single(DT)
		doc.bank_name = "VCB"
		doc.save()
		frappe.set_user(viewer)
		doc = frappe.get_single(DT)
		doc.bank_name = "Khác"
		with self.assertRaises(frappe.PermissionError):
			doc.save()
		self.assertEqual(frappe.get_single(DT).bank_name, "VCB")
