# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

MSG_IN_USE = "Thuế suất đã được dùng trong hợp đồng, chỉ có thể ngừng dùng."
MSG_NON_TAXABLE = "Thuế suất không chịu thuế phải có tỷ lệ 0%."


def is_vat_rate_used(rate_name: str) -> bool:
	"""Thuế suất đã được chứng từ nào dùng chưa (quét mọi trường Link trỏ tới VAT Rate).

	Ticket 2 (DocType Hợp đồng) dùng hàm này; khi chưa có trường Link nào thì trả False.
	"""
	links = []
	for doctype in ("DocField", "Custom Field"):
		links += frappe.get_all(
			doctype,
			filters={"fieldtype": "Link", "options": "VAT Rate"},
			fields=["dt as parent", "fieldname"] if doctype == "Custom Field" else ["parent", "fieldname"],
		)
	for link in links:
		if link.parent == "VAT Rate" or not frappe.db.table_exists(link.parent):
			continue
		if frappe.db.exists(link.parent, {link.fieldname: rate_name}):
			return True
	return False


class VATRate(Document):
	"""Thuế suất GTGT."""

	def before_insert(self):
		# Tên bản ghi lấy từ rate_name nên phải chuẩn hóa trước khi đặt tên.
		self.normalize()

	def validate(self):
		self.normalize()
		rate = flt(self.rate)
		if rate < 0:
			frappe.throw(_("Tỷ lệ (%) phải từ 0 trở lên."))
		if rate > 100:
			frappe.throw(_("Tỷ lệ (%) không được lớn hơn 100."))
		if self.is_non_taxable and rate != 0:
			frappe.throw(_(MSG_NON_TAXABLE))

	def on_trash(self):
		if is_vat_rate_used(self.name):
			frappe.throw(_(MSG_IN_USE))

	def normalize(self):
		self.rate_name = (self.rate_name or "").strip()
