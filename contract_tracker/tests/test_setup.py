import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.setup import INITIAL_VAT_RATES, ROLES, ensure_roles, ensure_vat_rates

VIEWER = "Xem hợp đồng"
MANAGER = "Quản lý hợp đồng"
DOCTYPES = ("VAT Rate", "Contract Customer")


def make_user(email, role):
	user = frappe.get_doc(
		{"doctype": "User", "email": email, "first_name": "Thử", "send_welcome_email": 0}
	).insert(ignore_permissions=True)
	user.add_roles(role)
	return user.name


def sample(doctype, suffix):
	if doctype == "VAT Rate":
		return {"doctype": doctype, "rate_name": f"TS_{suffix}", "rate": 3}
	return {"doctype": doctype, "customer_name": f"Công ty {suffix}"}


class TestSetup(IntegrationTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	def test_roles_exist(self):
		for role in ROLES:
			self.assertTrue(frappe.db.exists("Role", role))
		ensure_roles()
		for role in ROLES:
			self.assertEqual(frappe.db.count("Role", {"name": role}), 1)

	def test_initial_vat_rates_idempotent(self):
		ensure_vat_rates()
		ensure_vat_rates()
		names = [r[0] for r in INITIAL_VAT_RATES]
		self.assertEqual(frappe.db.count("VAT Rate", {"name": ["in", names]}), 5)
		for name, rate, non_taxable in INITIAL_VAT_RATES:
			doc = frappe.get_doc("VAT Rate", name)
			self.assertEqual(doc.rate, rate)
			self.assertEqual(doc.is_non_taxable, non_taxable)
			self.assertEqual(doc.is_active, 1)

	def test_viewer_read_only(self):
		user = make_user("xem.hd@example.com", VIEWER)
		for dt in DOCTYPES:
			for ptype in ("read", "print", "export"):
				self.assertTrue(frappe.has_permission(dt, ptype, user=user), f"{dt} {ptype}")
			for ptype in ("create", "write", "delete"):
				self.assertFalse(frappe.has_permission(dt, ptype, user=user), f"{dt} {ptype}")
		frappe.set_user(user)
		for dt in DOCTYPES:
			with self.assertRaises(frappe.PermissionError):
				frappe.get_doc(sample(dt, "V")).insert()

	def test_manager_can_write(self):
		user = make_user("quan.ly.hd@example.com", MANAGER)
		frappe.set_user(user)
		for dt in DOCTYPES:
			doc = frappe.get_doc(sample(dt, "M")).insert()
			doc.save()
			frappe.delete_doc(dt, doc.name)
			self.assertFalse(frappe.db.exists(dt, doc.name))
