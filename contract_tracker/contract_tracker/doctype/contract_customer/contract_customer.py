# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address

PHONE_PATTERN = re.compile(r"^[0-9 +().\-]{8,20}$")

DATA_FIELDS = (
	"customer_name",
	"contact_person",
	"representative_title",
	"phone",
	"email",
	"bank_account",
	"bank_name",
)


class ContractCustomer(Document):
	"""Khách hàng. Tên bản ghi tự sinh KH-<5 số>."""

	def validate(self):
		self.normalize()
		if self.tax_code and frappe.db.exists(
			"Contract Customer", {"tax_code": self.tax_code, "name": ["!=", self.name]}
		):
			frappe.throw(_("Mã số thuế đã tồn tại ở khách hàng khác."))
		if self.email and not validate_email_address(self.email):
			frappe.throw(_("Email không hợp lệ."))
		if self.phone and not PHONE_PATTERN.match(self.phone):
			frappe.throw(_("Số điện thoại không hợp lệ."))
		# Trường bắt buộc (customer_name) do Frappe tự kiểm tra, báo MandatoryError.

	def normalize(self):
		for field in DATA_FIELDS:
			self.set(field, (self.get(field) or "").strip())
		self.tax_code = (self.tax_code or "").strip() or None
