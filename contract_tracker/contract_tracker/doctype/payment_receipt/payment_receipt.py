# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from contract_tracker.contract_tracker.doctype.contract.contract import TOLERANCE, format_vnd
from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	BILLABLE_CONTRACT_STATUSES,
	outstanding_of,
	refresh_schedules,
)

# Các câu thông báo dưới đây được chép y nguyên sang frontend/src/pages/receipts/receipts.ts.
MSG_AMOUNT_POSITIVE = "Số tiền phải lớn hơn 0."
MSG_ALLOC_POSITIVE = "Dòng {0}: số phân bổ phải lớn hơn 0."
MSG_DUP_ROW = "Dòng {0}: đợt {1} bị trùng trong phiếu thu."
MSG_OTHER_CUSTOMER = "Dòng {0}: đợt {1} không thuộc khách hàng của phiếu thu."
MSG_BAD_CONTRACT = "Dòng {0}: hợp đồng {1} đang ở trạng thái {2}, không thu được."
MSG_OVER_OUTSTANDING = "Dòng {0}: số phân bổ {1} vượt số còn nợ {2} của đợt {3}."
MSG_OVER_AMOUNT = "Tổng phân bổ {0} vượt số tiền phiếu thu {1}."


class PaymentReceipt(Document):
	"""Phiếu thu tiền của khách hàng, phân bổ vào các đợt thu."""

	def validate(self):
		if flt(self.amount) <= 0:
			frappe.throw(_(MSG_AMOUNT_POSITIVE))
		self.validate_allocations()

	def validate_allocations(self):
		rows = [r for r in self.allocations if r.schedule]
		if len(rows) != len(self.allocations):
			self.set("allocations", rows)
		seen = set()
		total = 0.0
		for row in rows:
			if flt(row.allocated_amount) <= 0:
				frappe.throw(_(MSG_ALLOC_POSITIVE).format(row.idx))
			if row.schedule in seen:
				frappe.throw(_(MSG_DUP_ROW).format(row.idx, row.schedule))
			seen.add(row.schedule)
			data = frappe.db.get_value(
				"Payment Schedule",
				row.schedule,
				["customer", "contract", "schedule_name", "due_date", "total_amount"],
				as_dict=True,
			)
			if not data:
				frappe.throw(_("Dòng {0}: không tìm thấy đợt {1}.").format(row.idx, row.schedule))
			if data.customer != self.customer:
				frappe.throw(_(MSG_OTHER_CUSTOMER).format(row.idx, row.schedule))
			contract_status = frappe.db.get_value("Contract", data.contract, "status")
			if contract_status not in BILLABLE_CONTRACT_STATUSES:
				frappe.throw(_(MSG_BAD_CONTRACT).format(row.idx, data.contract, contract_status))
			outstanding = outstanding_of(row.schedule, exclude_receipt=self.name)
			if flt(row.allocated_amount) - outstanding > TOLERANCE:
				frappe.throw(
					_(MSG_OVER_OUTSTANDING).format(
						row.idx, format_vnd(row.allocated_amount), format_vnd(outstanding), row.schedule
					)
				)
			row.schedule_name = data.schedule_name
			row.contract = data.contract
			row.due_date = data.due_date
			row.total_amount = data.total_amount
			row.outstanding_amount = outstanding
			total += flt(row.allocated_amount)
		self.allocated_total = total
		self.unallocated_amount = flt(self.amount) - total
		if total - flt(self.amount) > TOLERANCE:
			frappe.throw(_(MSG_OVER_AMOUNT).format(format_vnd(total), format_vnd(self.amount)))

	def on_update(self):
		names = {r.schedule for r in self.allocations}
		before = self.get_doc_before_save()
		if before:
			names |= {r.schedule for r in before.allocations}
		refresh_schedules(names)

	def on_trash(self):
		# Dòng con còn trong CSDL lúc này nên phải loại phiếu đang xóa khi tính lại.
		refresh_schedules({r.schedule for r in self.allocations}, exclude_receipt=self.name)
