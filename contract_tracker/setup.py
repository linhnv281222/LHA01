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
