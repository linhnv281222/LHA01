# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate

from contract_tracker.contract_tracker.doctype.contract.contract import TOLERANCE
from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	BILLABLE_CONTRACT_STATUSES,
	paid_by_schedule,
	refresh_schedules,
	request_by_schedule,
)
from contract_tracker.money_words import vnd_in_words

# Các câu thông báo dưới đây được chép y nguyên sang frontend/src/pages/payment-requests/paymentRequest.ts.
MSG_NO_ITEMS = "Đề nghị thanh toán phải có ít nhất 1 đợt thu."
MSG_DUP_ROW = "Dòng {0}: đợt {1} bị trùng trong đề nghị."
MSG_OTHER_CUSTOMER = "Dòng {0}: đợt {1} không thuộc khách hàng của đề nghị."
MSG_BAD_CONTRACT = "Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không lập đề nghị được."
MSG_FULLY_PAID = "Dòng {0}: đợt {1} đã thu đủ, không lập đề nghị được."
MSG_IN_OTHER_REQUEST = "Dòng {0}: đợt {1} đã nằm trong đề nghị {2}."
MSG_DUE_BEFORE_REQUEST = "Hạn thanh toán không được trước ngày lập."
MSG_SENT_LOCKED = "Đề nghị đã gửi, chỉ sửa được ghi chú."
MSG_STATUS_READONLY = "Trạng thái đề nghị chỉ đổi bằng nút Đánh dấu đã gửi."
MSG_DELETE_SENT = "Chỉ xóa được đề nghị Nháp."

STATUS_DRAFT = "Nháp"
STATUS_SENT = "Đã gửi"

SCHEDULE_FIELDS = [
	"customer",
	"contract",
	"schedule_name",
	"due_date",
	"amount_before_tax",
	"vat_rate",
	"tax_amount",
	"total_amount",
]
LOCKED_FIELDS = ["customer", "request_date", "due_date", "bank_account_holder", "bank_account_no", "bank_name", "bank_branch"]


def _norm(value):
	"""Chuẩn hóa để so sánh: ngày thành chuỗi ISO, rỗng thành chuỗi trống."""
	if hasattr(value, "isoformat"):
		return value.isoformat()[:10]
	return (value or "").strip() if isinstance(value, str) else (value or "")


class PaymentRequest(Document):
	"""Đề nghị thanh toán gộp nhiều đợt thu của một khách hàng. Trạng thái Nháp → Đã gửi."""

	def before_insert(self):
		self.status = STATUS_DRAFT

	def validate(self):
		self.guard_status()
		self.validate_dates()
		self.validate_items()
		self.calculate_totals()

	# ---- kiểm tra ----

	def guard_status(self):
		before = self.get_doc_before_save()
		if not before or self.flags.status_change:
			return
		if before.status == STATUS_SENT:
			changed = any(_norm(self.get(f)) != _norm(before.get(f)) for f in LOCKED_FIELDS)
			if not changed:
				changed = [r.schedule for r in self.items if r.schedule] != [r.schedule for r in before.items]
			if changed:
				frappe.throw(_(MSG_SENT_LOCKED))
		if self.status != before.status:
			frappe.throw(_(MSG_STATUS_READONLY))

	def validate_dates(self):
		if self.due_date and self.request_date and getdate(self.due_date) < getdate(self.request_date):
			frappe.throw(_(MSG_DUE_BEFORE_REQUEST))

	def validate_items(self):
		rows = [r for r in self.items if r.schedule]
		if len(rows) != len(self.items):
			self.set("items", rows)
		if not rows:
			frappe.throw(_(MSG_NO_ITEMS))
		before = self.get_doc_before_save()
		old_schedules = {r.schedule for r in before.items} if before else set()
		names = [r.schedule for r in rows]
		taken = request_by_schedule(names, exclude_request=self.name)
		paid = paid_by_schedule(names)
		seen = set()
		for row in rows:
			if row.schedule in seen:
				frappe.throw(_(MSG_DUP_ROW).format(row.idx, row.schedule))
			seen.add(row.schedule)
			data = frappe.db.get_value("Payment Schedule", row.schedule, SCHEDULE_FIELDS, as_dict=True)
			if not data:
				frappe.throw(_("Dòng {0}: không tìm thấy đợt {1}.").format(row.idx, row.schedule))
			if data.customer != self.customer:
				frappe.throw(_(MSG_OTHER_CUSTOMER).format(row.idx, row.schedule))
			if row.schedule in taken:
				frappe.throw(_(MSG_IN_OTHER_REQUEST).format(row.idx, row.schedule, taken[row.schedule]))
			outstanding = flt(data.total_amount) - paid.get(row.schedule, 0)
			# Chỉ dòng mới thêm bị kiểm tra trạng thái hợp đồng và còn nợ: đợt thu đủ sau khi lập không làm hỏng đề nghị cũ.
			if row.schedule not in old_schedules:
				contract_status = frappe.db.get_value("Contract", data.contract, "status")
				if contract_status not in BILLABLE_CONTRACT_STATUSES:
					frappe.throw(_(MSG_BAD_CONTRACT).format(row.idx, data.contract, contract_status))
				if outstanding <= TOLERANCE:
					frappe.throw(_(MSG_FULLY_PAID).format(row.idx, row.schedule))
			# Dữ liệu chỉ đọc luôn lấy từ đợt, không tin dữ liệu client gửi.
			for field in SCHEDULE_FIELDS[1:]:
				row.set(field, data.get(field))
			row.outstanding = outstanding

	def calculate_totals(self):
		self.total_before_tax = sum(flt(r.amount_before_tax) for r in self.items)
		self.total_tax = sum(flt(r.tax_amount) for r in self.items)
		self.grand_total = sum(flt(r.total_amount) for r in self.items)
		self.amount_in_words = vnd_in_words(self.grand_total)

	# ---- cập nhật đợt ----

	def on_update(self):
		names = {r.schedule for r in self.items}
		before = self.get_doc_before_save()
		if before:
			names |= {r.schedule for r in before.items}
		refresh_schedules(names)

	def on_trash(self):
		if self.status != STATUS_DRAFT:
			frappe.throw(_(MSG_DELETE_SENT))
		# Dòng con còn trong CSDL lúc này nên phải loại trừ đề nghị đang xóa.
		refresh_schedules([r.schedule for r in self.items], exclude_request=self.name)

	# ---- đánh dấu đã gửi ----

	@frappe.whitelist()
	def mark_sent(self):
		"""Nháp → Đã gửi (một chiều)."""
		self.check_permission("write")
		if self.status != STATUS_DRAFT:
			frappe.throw(_("Không thể đánh dấu đã gửi đề nghị ở trạng thái {0}.").format(self.status))
		self.flags.status_change = True
		self.status = STATUS_SENT
		frappe.db.savepoint("request_mark_sent")
		try:
			self.save()
		except Exception:
			frappe.db.rollback(save_point="request_mark_sent")
			self.status = STATUS_DRAFT
			raise
		finally:
			self.flags.status_change = False
