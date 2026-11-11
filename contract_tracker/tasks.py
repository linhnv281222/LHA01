# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Tác vụ hằng ngày."""

import frappe
from frappe.utils import flt, today

from contract_tracker.contract_tracker.doctype.contract.contract import (
	STATUS_ACTIVE,
	STATUS_EXPIRED,
	contract_amounts,
	refresh_contract_amounts,
)
from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import compute_schedule_state


def daily():
	expire_contracts()
	refresh_overdue()


def expire_contracts():
	"""Hợp đồng Đang hiệu lực đã qua ngày kết thúc → Hết hạn. Không đụng đến đợt thu."""
	expired = frappe.get_all(
		"Contract",
		filters=[
			["status", "=", STATUS_ACTIVE],
			["end_date", "is", "set"],
			["end_date", "<", today()],
		],
		pluck="name",
	)
	for name in expired:
		frappe.db.set_value("Contract", name, "status", STATUS_EXPIRED, update_modified=False)


def refresh_overdue():
	"""Tính lại cờ quá hạn của các đợt còn nợ hoặc đang bị đánh quá hạn, rồi số tổng hợp đồng."""
	rows = frappe.get_all(
		"Payment Schedule",
		or_filters=[["is_overdue", "=", 1], ["payment_status", "!=", "Đã thu"]],
		fields=["name", "contract", "total_amount", "paid_amount", "due_date", "invoice_no", "is_overdue"],
	)
	for row in rows:
		state = compute_schedule_state(row.total_amount, row.paid_amount, row.due_date, row.invoice_no)
		if state["is_overdue"] != (row.is_overdue or 0):
			frappe.db.set_value(
				"Payment Schedule", row.name, "is_overdue", state["is_overdue"], update_modified=False
			)

	# Số tổng của hợp đồng cũ chưa đúng thì sửa.
	for c in frappe.get_all(
		"Contract",
		filters={"status": ["in", ["Đang hiệu lực", "Hết hạn", "Đã thanh lý"]]},
		fields=["name", "total_after_tax", "invoiced_amount", "paid_amount", "outstanding_amount"],
	):
		amounts = contract_amounts(c.name, c.total_after_tax)
		if any(abs(flt(c.get(k)) - flt(v)) > 0.001 for k, v in amounts.items()):
			refresh_contract_amounts(c.name)
