# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	BILLABLE_CONTRACT_STATUSES,
	INVOICE_ACTIVE,
	active_invoice_by_schedule,
	paid_by_schedule,
	refresh_schedules,
)

# Các câu thông báo dưới đây được chép y nguyên sang frontend/src/pages/invoices/invoices.ts.
MSG_NO_ITEMS = "Hóa đơn phải có ít nhất 1 đợt thu."
MSG_DUP_ROW = "Dòng {0}: đợt {1} bị trùng trong hóa đơn."
MSG_OTHER_CUSTOMER = "Dòng {0}: đợt {1} không thuộc khách hàng của hóa đơn."
MSG_BAD_CONTRACT = "Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không xuất hóa đơn được."
MSG_IN_OTHER_INVOICE = "Dòng {0}: đợt {1} đã nằm trong hóa đơn {2}."
MSG_DUP_NO = "Số hóa đơn {0} ký hiệu {1} đã tồn tại."
MSG_CANCELLED_LOCKED = "Hóa đơn đã hủy, không sửa được."
MSG_HAS_PAYMENT = "Hóa đơn đã có tiền thu phân bổ, không hủy được."
MSG_DELETE_ACTIVE = "Chỉ xóa được hóa đơn Đã hủy. Hãy hủy hóa đơn trước."
MSG_STATUS_READONLY = "Trạng thái hóa đơn chỉ đổi bằng nút Hủy hóa đơn."

STATUS_ACTIVE = INVOICE_ACTIVE
STATUS_CANCELLED = "Đã hủy"

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


class SalesInvoiceRecord(Document):
	"""Hóa đơn gộp nhiều đợt thu. Trạng thái là trường Hiệu lực / Đã hủy, không dùng Submit của Frappe."""

	def before_insert(self):
		self.status = STATUS_ACTIVE

	def validate(self):
		self.guard_status()
		self.invoice_no = (self.invoice_no or "").strip()
		self.invoice_series = (self.invoice_series or "").strip()
		self.validate_items()
		if self.status == STATUS_ACTIVE:
			self.validate_unique_no()
		self.calculate_totals()

	# ---- kiểm tra ----

	def guard_status(self):
		before = self.get_doc_before_save()
		if not before or self.flags.status_change:
			return
		if before.status == STATUS_CANCELLED:
			frappe.throw(_(MSG_CANCELLED_LOCKED))
		if self.status != before.status:
			frappe.throw(_(MSG_STATUS_READONLY))

	def validate_items(self):
		rows = [r for r in self.items if r.schedule]
		if len(rows) != len(self.items):
			self.set("items", rows)
		if not rows:
			frappe.throw(_(MSG_NO_ITEMS))
		check_state = self.status == STATUS_ACTIVE
		taken = active_invoice_by_schedule([r.schedule for r in rows], exclude_invoice=self.name) if check_state else {}
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
			if check_state:
				contract_status = frappe.db.get_value("Contract", data.contract, "status")
				if contract_status not in BILLABLE_CONTRACT_STATUSES:
					frappe.throw(_(MSG_BAD_CONTRACT).format(row.idx, data.contract, contract_status))
				if row.schedule in taken:
					frappe.throw(_(MSG_IN_OTHER_INVOICE).format(row.idx, row.schedule, taken[row.schedule][0]))
			# Dữ liệu chỉ đọc luôn lấy từ đợt, không tin dữ liệu client gửi.
			for field in SCHEDULE_FIELDS[1:]:
				row.set(field, data.get(field))

	def validate_unique_no(self):
		others = frappe.get_all(
			"Sales Invoice Record",
			filters={"status": STATUS_ACTIVE, "invoice_no": self.invoice_no, "name": ["!=", self.name or ""]},
			fields=["invoice_series"],
		)
		if any((o.invoice_series or "") == self.invoice_series for o in others):
			frappe.throw(_(MSG_DUP_NO).format(self.invoice_no, self.invoice_series), frappe.DuplicateEntryError)

	def calculate_totals(self):
		groups: dict = {}
		for row in self.items:
			g = groups.setdefault(row.vat_rate, [0, 0, 0])
			g[0] += flt(row.amount_before_tax)
			g[1] += flt(row.tax_amount)
			g[2] += flt(row.total_amount)
		self.set(
			"tax_breakdown",
			[
				{"vat_rate": rate, "amount_before_tax": g[0], "tax_amount": g[1], "total_amount": g[2]}
				for rate, g in groups.items()
			],
		)
		self.total_before_tax = sum(g[0] for g in groups.values())
		self.total_tax = sum(g[1] for g in groups.values())
		self.grand_total = sum(g[2] for g in groups.values())

	# ---- cập nhật đợt ----

	def on_update(self):
		names = {r.schedule for r in self.items}
		before = self.get_doc_before_save()
		if before:
			names |= {r.schedule for r in before.items}
		refresh_schedules(names)

	def on_trash(self):
		if self.status != STATUS_CANCELLED:
			frappe.throw(_(MSG_DELETE_ACTIVE))

	# ---- hủy hóa đơn ----

	@frappe.whitelist()
	def cancel_invoice(self):
		"""Hiệu lực → Đã hủy; đợt về Chưa xuất (trong on_update). Chặn nếu đã có tiền phân bổ."""
		self.check_permission("write")
		if self.status != STATUS_ACTIVE:
			frappe.throw(_("Không thể hủy hóa đơn ở trạng thái {0}.").format(self.status))
		paid = paid_by_schedule([r.schedule for r in self.items])
		if any(v > 0 for v in paid.values()):
			frappe.throw(_(MSG_HAS_PAYMENT))
		self.flags.status_change = True
		self.status = STATUS_CANCELLED
		frappe.db.savepoint("invoice_cancel")
		try:
			self.save()
		except Exception:
			frappe.db.rollback(save_point="invoice_cancel")
			self.status = STATUS_ACTIVE
			raise
		finally:
			self.flags.status_change = False
