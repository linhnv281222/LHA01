# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import re

import frappe
from frappe import _
from frappe.model.document import Document

CODE_PATTERN = re.compile(r"^[A-Z0-9_]{1,20}$")


class ContractType(Document):
	"""Loại hợp đồng. Chức năng mẫu: agent làm theo cách chia file, kiểm tra dữ liệu và test ở đây."""

	def before_insert(self):
		# Tên bản ghi lấy từ trường code (autoname = field:code) và được đặt ngay sau before_insert,
		# nên phải chuẩn hóa ở đây; làm ở validate là đã muộn.
		self.normalize()

	def validate(self):
		self.normalize()
		if not CODE_PATTERN.match(self.code or ""):
			frappe.throw(
				_("Mã chỉ gồm chữ in hoa, chữ số và dấu gạch dưới, tối đa 20 ký tự"),
				title=_("Mã không hợp lệ"),
			)
		# Trường bắt buộc (reqd = 1 trong JSON) do Frappe tự kiểm tra và báo MandatoryError,
		# không kiểm tra lại ở đây.

	def normalize(self):
		self.code = (self.code or "").strip().upper()
		self.type_name = (self.type_name or "").strip()
