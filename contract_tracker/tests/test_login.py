import frappe
from frappe.tests import IntegrationTestCase
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request

from contract_tracker.login import safe_redirect
from contract_tracker.www import contracts

CASES = {
	"/contracts/contract-types": "/contracts/contract-types",
	"/app": "/app",
	"/app/todo/a%20b": "/app/todo/a%20b",
	None: "/contracts",
	"": "/contracts",
	"https://evil.com": "/contracts",
	"//evil.com": "/contracts",
	"/\\evil.com": "/contracts",
	"javascript:alert(1)": "/contracts",
	"/login": "/contracts",
	"/login?redirect-to=/app": "/contracts",
	"%2F%2Fevil.com": "/contracts",
}


def _login_request(path="/login"):
	return Request(EnvironBuilder(path=path).get_environ())


class TestLogin(IntegrationTestCase):
	def setUp(self):
		super().setUp()
		old_request = getattr(frappe.local, "request", None)
		old_form_dict = frappe.local.form_dict
		old_flags = frappe.local.flags.get("redirect_location")
		self.addCleanup(self._restore, old_request, old_form_dict, old_flags)

	@staticmethod
	def _restore(request, form_dict, redirect_location):
		frappe.local.request = request
		frappe.local.form_dict = form_dict
		frappe.local.flags.redirect_location = redirect_location
		frappe.set_user("Administrator")

	def _open_login_as(self, user, redirect_to=None):
		frappe.set_user(user)
		frappe.local.request = _login_request()
		frappe.local.form_dict = frappe._dict()
		if redirect_to is not None:
			frappe.local.form_dict["redirect-to"] = redirect_to
		frappe.local.flags.redirect_location = None

	def test_safe_redirect(self):
		for raw, expected in CASES.items():
			self.assertEqual(safe_redirect(raw), expected, raw)

	def test_logged_in_user_redirected_to_redirect_to(self):
		self._open_login_as("Administrator", "/app")
		with self.assertRaises(frappe.Redirect):
			contracts.get_context(frappe._dict())
		self.assertEqual(frappe.local.flags.redirect_location, "/app")

	def test_logged_in_user_without_redirect_to_goes_to_contracts(self):
		self._open_login_as("Administrator")
		with self.assertRaises(frappe.Redirect):
			contracts.get_context(frappe._dict())
		self.assertEqual(frappe.local.flags.redirect_location, "/contracts")

	def test_logged_in_user_external_redirect_to_ignored(self):
		for target in ("https://evil.com", "//evil.com"):
			self._open_login_as("Administrator", target)
			with self.assertRaises(frappe.Redirect):
				contracts.get_context(frappe._dict())
			self.assertEqual(frappe.local.flags.redirect_location, "/contracts", target)

	def test_guest_sees_login_without_redirect(self):
		self._open_login_as("Guest")
		context = contracts.get_context(frappe._dict())
		self.assertEqual(context.boot["session_user"], "Guest")

	def test_login_page_for_guest_and_classic_fallback(self):
		from frappe.website.serve import get_response

		frappe.set_user("Guest")
		frappe.local.request = _login_request("/login-classic")
		response = get_response("/login-classic")
		self.assertEqual(response.status_code, 200)

		frappe.local.request = _login_request()
		response = get_response("/login")
		self.assertEqual(response.status_code, 200)
		self.assertIn('id="app"', response.get_data(as_text=True))
