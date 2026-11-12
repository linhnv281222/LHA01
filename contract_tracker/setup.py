# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Dữ liệu nền: vai trò phân quyền và thuế suất ban đầu. Các hàm chạy lại nhiều lần không tạo trùng."""

import frappe

ROLES = ("Quản lý hợp đồng", "Xem hợp đồng")

# (tên, tỷ lệ %, không chịu thuế)
INITIAL_VAT_RATES = [
	("0%", 0, 0),
	("5%", 5, 0),
	("8%", 8, 0),
	("10%", 10, 0),
	("Không chịu thuế", 0, 1),
]


PAYMENT_REQUEST_PRINT_FORMAT = "Đề nghị thanh toán"
PAYMENT_REQUEST_TEMPLATE = "templates/print_formats/payment_request.html"


ACCEPTANCE_MINUTES_PRINT_FORMAT = "Biên bản nghiệm thu"
ACCEPTANCE_MINUTES_TEMPLATE = "templates/print_formats/acceptance_minutes.html"

# (tên Print Format, DocType, đường dẫn mẫu)
PRINT_FORMATS = [
	(PAYMENT_REQUEST_PRINT_FORMAT, "Payment Request", PAYMENT_REQUEST_TEMPLATE),
	(ACCEPTANCE_MINUTES_PRINT_FORMAT, "Acceptance Minutes", ACCEPTANCE_MINUTES_TEMPLATE),
]


def ensure_print_formats():
	"""Tạo các Print Format chuẩn một lần. Không ghi đè nếu đã có, để người dùng sửa trên Desk.

	Dùng standard="No": Frappe chặn sửa Print Format chuẩn khi không bật developer mode và migrate sẽ ghi đè.
	"""
	from frappe.custom.doctype.property_setter.property_setter import make_property_setter

	for name, doctype, template in PRINT_FORMATS:
		if not frappe.db.exists("Print Format", name):
			with open(frappe.get_app_path("contract_tracker", template), encoding="utf-8") as f:
				html = f.read()
			frappe.get_doc(
				{
					"doctype": "Print Format",
					"name": name,
					"doc_type": doctype,
					"module": "Contract Tracker",
					"print_format_type": "Jinja",
					"custom_format": 1,
					"standard": "No",
					"html": html,
				}
			).insert(ignore_permissions=True)
		if not frappe.db.exists("Property Setter", {"doc_type": doctype, "property": "default_print_format"}):
			make_property_setter(doctype, None, "default_print_format", name, "Data")


def ensure_roles():
	for name in ROLES:
		if not frappe.db.exists("Role", name):
			frappe.get_doc({"doctype": "Role", "role_name": name, "desk_access": 1}).insert(
				ignore_permissions=True
			)


def ensure_vat_rates():
	for rate_name, rate, is_non_taxable in INITIAL_VAT_RATES:
		if not frappe.db.exists("VAT Rate", rate_name):
			frappe.get_doc(
				{
					"doctype": "VAT Rate",
					"rate_name": rate_name,
					"rate": rate,
					"is_non_taxable": is_non_taxable,
					"is_active": 1,
				}
			).insert(ignore_permissions=True)
