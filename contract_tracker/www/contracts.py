# Trang chứa ứng dụng Vue (Frappe UI) ở /contracts. File contracts.html do "vite build" sinh ra, không sửa tay.
import frappe
from frappe.utils import get_fullname

no_cache = 1


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=" + frappe.utils.quote(frappe.request.path)
		raise frappe.Redirect

	csrf_token = frappe.sessions.get_csrf_token()
	# get_csrf_token có thể ghi session mới; commit để token dùng được ngay ở request sau.
	frappe.db.commit()
	context.boot = {
		"csrf_token": csrf_token,
		"session_user": frappe.session.user,
		"user_fullname": get_fullname(frappe.session.user),
		"site_name": frappe.local.site,
	}
	return context
