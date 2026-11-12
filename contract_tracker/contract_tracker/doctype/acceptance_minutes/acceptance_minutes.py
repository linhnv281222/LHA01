# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate

from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	BILLABLE_CONTRACT_STATUSES,
	minutes_by_schedule,
	refresh_schedules,
)

# Các câu thông báo dưới đây được chép y nguyên sang frontend/src/pages/acceptance-minutes/acceptanceMinutes.ts.
MSG_NO_ITEMS = "Biên bản nghiệm thu phải có ít nhất 1 đợt thu."
MSG_DUP_ROW = "Dòng {0}: đợt {1} bị trùng trong biên bản."
MSG_OTHER_CUSTOMER = "Dòng {0}: đợt {1} không thuộc khách hàng của biên bản."
MSG_NOT_REQUIRED = "Dòng {0}: đợt {1} không cần nghiệm thu."
MSG_IN_OTHER_MINUTES = "Dòng {0}: đợt {1} đã nằm trong biên bản {2}."
MSG_BAD_CONTRACT = "Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không lập biên bản được."
MSG_NEED_SCAN = "Cần đính kèm file scan biên bản đã ký."
MSG_SIGNED_LOCKED = "Biên bản đã ký, chỉ sửa được ghi chú và file scan."
MSG_STATUS_READONLY = "Trạng thái biên bản chỉ đổi bằng nút Đánh dấu đã ký."
MSG_DELETE_SIGNED = "Chỉ xóa được biên bản Nháp."

STATUS_DRAFT = "Nháp"
STATUS_SIGNED = "Đã ký"

SCHEDULE_FIELDS = [
	"customer",
	"contract",
	"schedule_name",
	"item_name",
	"period_from",
	"period_to",
	"due_date",
	"amount_before_tax",
	"tax_amount",
	"total_amount",
	"requires_acceptance",
]
# Các trường chép vào dòng con (bỏ customer và requires_acceptance).
ROW_FIELDS = SCHEDULE_FIELDS[1:-1]
LOCKED_FIELDS = ["customer", "minutes_date", "content", "party_a_rep", "party_b_rep"]


def _norm(value):
	"""Chuẩn hóa để so sánh: ngày thành chuỗi ISO, rỗng thành chuỗi trống."""
	if hasattr(value, "isoformat"):
		return value.isoformat()[:10]
	return (value or "").strip() if isinstance(value, str) else (value or "")


def _date(value) -> str:
	return getdate(value).strftime("%d/%m/%Y")


def content_from_items(items) -> str:
	"""Nội dung mặc định: mỗi đợt một dòng "hạng mục - đợt (kỳ từ - đến)"."""
	lines = []
	for r in items:
		line = f"{r.item_name or ''} - {r.schedule_name or ''}"
		if r.period_from:
			line += f" ({_date(r.period_from)} - {_date(r.period_to or r.period_from)})"
		lines.append(line)
	return "\n".join(lines)


class AcceptanceMinutes(Document):
	"""Biên bản nghiệm thu gộp nhiều đợt thu của một khách hàng. Trạng thái Nháp → Đã ký."""

	def before_insert(self):
		self.status = STATUS_DRAFT
		if not self.party_a_rep and self.customer:
			self.party_a_rep = frappe.db.get_value("Contract Customer", self.customer, "contact_person")

	def validate(self):
		self.guard_status()
		self.validate_items()
		self.fill_content()
		self.calculate_totals()

	# ---- kiểm tra ----

	def guard_status(self):
		before = self.get_doc_before_save()
		if not before or self.flags.status_change:
			return
		if before.status == STATUS_SIGNED:
			changed = any(_norm(self.get(f)) != _norm(before.get(f)) for f in LOCKED_FIELDS)
			if not changed:
				changed = [r.schedule for r in self.items if r.schedule] != [r.schedule for r in before.items]
			if changed:
				frappe.throw(_(MSG_SIGNED_LOCKED))
			if not self.scan_file:
				frappe.throw(_(MSG_NEED_SCAN))
		if self.status != before.status:
			frappe.throw(_(MSG_STATUS_READONLY))

	def validate_items(self):
		rows = [r for r in self.items if r.schedule]
		if len(rows) != len(self.items):
			self.set("items", rows)
		if not rows:
			frappe.throw(_(MSG_NO_ITEMS))
		before = self.get_doc_before_save()
		old_schedules = {r.schedule for r in before.items} if before else set()
		# Biên bản đã ký và danh sách đợt không đổi (guard_status đã chặn đổi): chỉ sửa ghi chú/file scan,
		# không kiểm tra lại đợt để hạng mục đổi sang "Không cần" sau khi ký không làm hỏng biên bản.
		if before and before.status == STATUS_SIGNED and [r.schedule for r in rows] == [r.schedule for r in before.items]:
			return
		names =[r.schedule for r in rows]
		taken = minutes_by_schedule(names, exclude_minutes=self.name)
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
			if not data.requires_acceptance:
				frappe.throw(_(MSG_NOT_REQUIRED).format(row.idx, row.schedule))
			if row.schedule in taken:
				frappe.throw(_(MSG_IN_OTHER_MINUTES).format(row.idx, row.schedule, taken[row.schedule]))
			# Chỉ dòng mới thêm bị kiểm tra trạng thái hợp đồng.
			if row.schedule not in old_schedules:
				contract_status = frappe.db.get_value("Contract", data.contract, "status")
				if contract_status not in BILLABLE_CONTRACT_STATUSES:
					frappe.throw(_(MSG_BAD_CONTRACT).format(row.idx, data.contract, contract_status))
			# Dữ liệu chỉ đọc luôn lấy từ đợt, không tin dữ liệu client gửi.
			for field in ROW_FIELDS:
				row.set(field, data.get(field))

	def fill_content(self):
		if not (self.content or "").strip():
			self.content = content_from_items(self.items)

	def calculate_totals(self):
		self.schedule_count = len(self.items)
		self.total_before_tax = sum(flt(r.amount_before_tax) for r in self.items)
		self.total_tax = sum(flt(r.tax_amount) for r in self.items)
		self.grand_total = sum(flt(r.total_amount) for r in self.items)

	# ---- cập nhật đợt ----

	def on_update(self):
		names = {r.schedule for r in self.items}
		before = self.get_doc_before_save()
		if before:
			names |= {r.schedule for r in before.items}
		refresh_schedules(names)

	def on_trash(self):
		if self.status != STATUS_DRAFT:
			frappe.throw(_(MSG_DELETE_SIGNED))
		# Dòng con còn trong CSDL lúc này nên phải loại trừ biên bản đang xóa.
		refresh_schedules([r.schedule for r in self.items], exclude_minutes=self.name)

	# ---- đánh dấu đã ký ----

	@frappe.whitelist()
	def mark_signed(self):
		"""Nháp → Đã ký (một chiều), bắt buộc có file scan."""
		self.check_permission("write")
		if self.status != STATUS_DRAFT:
			frappe.throw(_("Không thể đánh dấu đã ký biên bản ở trạng thái {0}.").format(self.status))
		if not self.scan_file:
			frappe.throw(_(MSG_NEED_SCAN))
		self.flags.status_change = True
		self.status = STATUS_SIGNED
		frappe.db.savepoint("minutes_mark_signed")
		try:
			self.save()
		except Exception:
			frappe.db.rollback(save_point="minutes_mark_signed")
			self.status = STATUS_DRAFT
			raise
		finally:
			self.flags.status_change = False
