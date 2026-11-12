import frappe
from frappe.tests import IntegrationTestCase

from contract_tracker.setup import (
	INITIAL_VAT_RATES,
	PAYMENT_REQUEST_PRINT_FORMAT,
	ROLES,
	ensure_print_formats,
	ensure_roles,
	ensure_vat_rates,
)

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

	def test_ensure_print_formats(self):
		ensure_print_formats()
		ensure_print_formats()
		self.assertEqual(frappe.db.count("Print Format", {"name": PAYMENT_REQUEST_PRINT_FORMAT}), 1)
		pf = frappe.get_doc("Print Format", PAYMENT_REQUEST_PRINT_FORMAT)
		self.assertEqual(pf.doc_type, "Payment Request")
		self.assertEqual(pf.standard, "No")
		self.assertEqual(pf.print_format_type, "Jinja")
		for text in ("ĐỀ NGHỊ THANH TOÁN", "amount_in_words", "bank_account_no", "Chữ ký", "doc.items"):
			self.assertIn(text, pf.html)
		self.assertEqual(
			frappe.db.get_value(
				"Property Setter",
				{"doc_type": "Payment Request", "property": "default_print_format"},
				"value",
			),
			PAYMENT_REQUEST_PRINT_FORMAT,
		)

	def test_ensure_print_formats_keeps_edits(self):
		ensure_print_formats()
		frappe.db.set_value("Print Format", PAYMENT_REQUEST_PRINT_FORMAT, "html", "<p>MẪU ĐÃ SỬA {{ doc.name }}</p>")
		ensure_print_formats()
		self.assertEqual(
			frappe.db.get_value("Print Format", PAYMENT_REQUEST_PRINT_FORMAT, "html"), "<p>MẪU ĐÃ SỬA {{ doc.name }}</p>"
		)
		from contract_tracker.contract_tracker.doctype.payment_request.test_payment_request import make_request
		from contract_tracker.contract_tracker.doctype.sales_invoice_record.test_sales_invoice_record import (
			make_billing_contract,
			schedule_of,
		)

		contract = make_billing_contract()
		doc = make_request(contract.customer, [schedule_of(contract.name, "Tạm ứng")]).insert()
		html = frappe.get_print("Payment Request", doc.name, print_format=PAYMENT_REQUEST_PRINT_FORMAT)
		self.assertIn("MẪU ĐÃ SỬA " + doc.name, html)

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
