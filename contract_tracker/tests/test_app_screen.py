import os

import frappe
from frappe.tests import IntegrationTestCase
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request

from contract_tracker import api
from contract_tracker.www import contracts


def make_user(email, roles):
	if frappe.db.exists("User", email):
		frappe.delete_doc("User", email, force=True, ignore_permissions=True)  # dữ liệu test
	user = frappe.get_doc({"doctype": "User", "email": email, "first_name": "Test", "send_welcome_email": 0})
	user.insert(ignore_permissions=True)  # tạo user thử cho test
	user.add_roles(*roles)
	return email


class TestAppScreen(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		old_request = getattr(frappe.local, "request", None)
		old_form_dict = frappe.local.form_dict
		self.addCleanup(self._restore, old_request, old_form_dict)
		self.manager = make_user("app_manager@example.com", ["Quản lý hợp đồng"])
		self.viewer = make_user("app_viewer@example.com", ["Xem hợp đồng"])
		self.other = make_user("app_other@example.com", ["Desk User"])
		self.both = make_user("app_both@example.com", ["Xem hợp đồng", "System Manager"])

	@staticmethod
	def _restore(request, form_dict):
		frappe.local.request = request
		frappe.local.form_dict = form_dict
		frappe.local.flags.redirect_location = None
		frappe.set_user("Administrator")

	def _as(self, user):
		frappe.set_user(user)
		self.addCleanup(frappe.set_user, "Administrator")

	def _open(self, user, path="/login", redirect_to=None):
		frappe.set_user(user)
		frappe.local.request = Request(EnvironBuilder(path=path).get_environ())
		frappe.local.form_dict = frappe._dict()
		if redirect_to:
			frappe.local.form_dict["redirect-to"] = redirect_to
		frappe.local.flags.redirect_location = None

	def test_has_app_permission_administrator(self):
		self._as("Administrator")
		self.assertTrue(api.has_app_permission())

	def test_has_app_permission_manager(self):
		self._as(self.manager)
		self.assertTrue(api.has_app_permission())

	def test_has_app_permission_viewer(self):
		self._as(self.viewer)
		self.assertTrue(api.has_app_permission())

	def test_has_app_permission_other_role(self):
		self._as(self.other)
		self.assertFalse(api.has_app_permission())

	def test_apps_screen_tile(self):
		import inspect

		from frappe.apps import get_apps as cached_get_apps

		# get_apps được request_cache giữ kết quả trong cùng một request: bỏ lớp cache để đổi user trong test.
		get_apps = inspect.unwrap(cached_get_apps)

		self._as("Administrator")
		tiles = [a for a in get_apps() if a.get("name") == "contract_tracker"]
		self.assertEqual(len(tiles), 1)
		self.assertEqual(tiles[0]["route"], "/contracts")
		self.assertEqual(tiles[0]["title"], "Quản lý hợp đồng")
		self._as(self.other)
		self.assertFalse([a for a in get_apps() if a.get("name") == "contract_tracker"])

	def test_logo_file_exists(self):
		entry = frappe.get_hooks("add_to_apps_screen", app_name="contract_tracker")[0]
		prefix = "/assets/contract_tracker/"
		self.assertTrue(entry["logo"].startswith(prefix))
		path = frappe.get_app_path("contract_tracker", "public", entry["logo"][len(prefix) :])
		self.assertTrue(os.path.exists(path))
		self.assertTrue(callable(frappe.get_attr(entry["has_permission"])))

	def test_home_page_for_app_roles(self):
		for user in (self.viewer, self.manager, self.both):
			self.assertEqual(api.get_home_page(user), "contracts", user)

	def test_home_page_default_cases(self):
		self.assertIsNone(api.get_home_page("Administrator"))
		self.assertIsNone(api.get_home_page(self.other))

	def test_logged_in_app_user_on_login_goes_to_contracts(self):
		for user in (self.viewer, self.manager):
			self._open(user)
			with self.assertRaises(frappe.Redirect):
				contracts.get_context(frappe._dict())
			self.assertEqual(frappe.local.flags.redirect_location, "/contracts", user)

	def test_administrator_redirect_to_desk(self):
		self._open("Administrator", redirect_to="/desk")
		with self.assertRaises(frappe.Redirect):
			contracts.get_context(frappe._dict())
		self.assertEqual(frappe.local.flags.redirect_location, "/desk")

	def test_guest_contracts_redirects_to_login(self):
		self._open("Guest", path="/contracts")
		with self.assertRaises(frappe.Redirect):
			contracts.get_context(frappe._dict())
		self.assertTrue(frappe.local.flags.redirect_location.startswith("/login?redirect-to="))
