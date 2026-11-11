# Đường vào dự phòng: trang đăng nhập mặc định của Frappe, dùng khi trang đăng nhập mới lỗi.
from frappe.www.login import get_context as _frappe_get_context

no_cache = 1


def get_context(context):
	return _frappe_get_context(context)
