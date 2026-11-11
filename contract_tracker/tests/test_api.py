import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.api import contract_no_exists, get_contract_permissions, get_responsible_users
from contract_tracker.contract_tracker.doctype.contract.test_contract import make_contract
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

	def test_get_contract_permissions_by_role(self):
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.quan.ly@example.com", MANAGER))
		self.assertTrue(get_contract_permissions()["can_write"])
		frappe.set_user(make_user("quyen.xem@example.com", VIEWER))
		self.assertFalse(get_contract_permissions()["can_write"])
