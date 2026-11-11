import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.login import safe_redirect

CASES = {
	"/contracts/contract-types": "/contracts/contract-types",
	"/app": "/app",
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


class TestLogin(IntegrationTestCase):
	def test_safe_redirect(self):
		for raw, expected in CASES.items():
			self.assertEqual(safe_redirect(raw), expected, raw)

	def test_login_page_for_guest_and_classic_fallback(self):
		from frappe.website.serve import get_response

		frappe.set_user("Guest")
		response = get_response("/login-classic")
		self.assertEqual(response.status_code, 200, "HEAD>>" + response.get_data(as_text=True)[:1200] + "<<HEAD")
		from werkzeug.test import EnvironBuilder
		from werkzeug.wrappers import Request

		frappe.local.request = Request(EnvironBuilder(path="/login").get_environ())
		response = get_response("/login")
		self.assertEqual(response.status_code, 200)
		self.assertIn('id="app"', response.get_data(as_text=True))
