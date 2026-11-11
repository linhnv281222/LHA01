# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Các hàm nhỏ cho giao diện Vue mà REST chuẩn của Frappe không đáp ứng được."""

import frappe


@frappe.whitelist()
def get_responsible_users():
	"""Danh sách người phụ trách (User đang bật). Hai vai trò hợp đồng không đọc được DocType User qua REST."""
	frappe.has_permission("Contract", "read", throw=True)
	return frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User"},
		fields=["name", "full_name"],
		order_by="full_name asc",
	)


@frappe.whitelist()
def contract_no_exists(contract_no: str | None = None) -> bool:
	"""Số hợp đồng đã có chưa (để báo trùng ngay trên form)."""
	frappe.has_permission("Contract", "read", throw=True)
	return bool(frappe.db.exists("Contract", (contract_no or "").strip()))


@frappe.whitelist()
def get_contract_permissions() -> dict:
	"""Người dùng hiện tại có sửa được hợp đồng không (để form ẩn nút Lưu và khóa ô)."""
	return {"can_write": bool(frappe.has_permission("Contract", "write"))}
