# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Các hàm nhỏ cho giao diện Vue mà REST chuẩn của Frappe không đáp ứng được."""

import frappe
from frappe.utils import flt

from contract_tracker.contract_tracker.doctype.contract.contract import TOLERANCE
from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	BILLABLE_CONTRACT_STATUSES,
	active_invoice_by_schedule,
	paid_by_schedule,
	request_by_schedule,
)

BANK_FIELDS = ("bank_account_holder", "bank_account_no", "bank_name", "bank_branch")


@frappe.whitelist()
def get_responsible_users():
	"""Danh sách người phụ trách (User đang bật). Hai vai trò hợp đồng không đọc được DocType User qua REST."""
	frappe.has_permission("Contract", "read", throw=True)
	return frappe.get_all(
		"User",
		filters={"enabled": 1, "user_type": "System User"},
		fields=["name", "full_name"],
		order_by="full_name asc",
	)


@frappe.whitelist()
def contract_no_exists(contract_no: str | None = None) -> bool:
	"""Số hợp đồng đã có chưa (để báo trùng ngay trên form)."""
	frappe.has_permission("Contract", "read", throw=True)
	return bool(frappe.db.exists("Contract", (contract_no or "").strip()))


@frappe.whitelist()
def get_contract_permissions() -> dict:
	"""Người dùng hiện tại có sửa được hợp đồng không (để form ẩn nút Lưu và khóa ô)."""
	return {"can_write": bool(frappe.has_permission("Contract", "write"))}


@frappe.whitelist()
def get_billing_permissions() -> dict:
	"""Người dùng hiện tại có ghi được hóa đơn, phiếu thu không (để form ẩn nút và khóa ô)."""
	return {
		"invoice_write": bool(frappe.has_permission("Sales Invoice Record", "write")),
		"receipt_write": bool(frappe.has_permission("Payment Receipt", "write")),
		"request_write": bool(frappe.has_permission("Payment Request", "write")),
	}


def _billable_schedules(customer, fields):
	contracts = frappe.get_all(
		"Contract",
		filters={"customer": customer, "status": ["in", list(BILLABLE_CONTRACT_STATUSES)]},
		pluck="name",
	)
	if not contracts:
		return []
	return frappe.get_all(
		"Payment Schedule",
		filters={"customer": customer, "contract": ["in", contracts]},
		fields=fields,
		order_by="due_date asc, name asc",
	)


@frappe.whitelist()
def get_open_schedules(customer: str, exclude_invoice: str | None = None) -> list:
	"""Đợt chưa nằm trong hóa đơn Hiệu lực nào của khách hàng (cho form hóa đơn)."""
	frappe.has_permission("Sales Invoice Record", "read", throw=True)
	rows = _billable_schedules(
		customer,
		[
			"name",
			"schedule_name",
			"contract",
			"due_date",
			"amount_before_tax",
			"vat_rate",
			"tax_amount",
			"total_amount",
		],
	)
	taken = active_invoice_by_schedule([r.name for r in rows], exclude_invoice=exclude_invoice)
	return [r for r in rows if r.name not in taken]


SCHEDULE_ROW_FIELDS = [
	"name",
	"schedule_name",
	"contract",
	"due_date",
	"amount_before_tax",
	"vat_rate",
	"tax_amount",
	"total_amount",
]


@frappe.whitelist()
def get_requestable_schedules(customer: str, request: str | None = None) -> list:
	"""Đợt còn nợ của khách hàng cho form đề nghị, kèm còn nợ và đề nghị khác đang chứa đợt (bỏ qua `request`)."""
	frappe.has_permission("Payment Request", "read", throw=True)
	rows = _billable_schedules(customer, SCHEDULE_ROW_FIELDS)
	names = [r.name for r in rows]
	paid = paid_by_schedule(names)
	requests = request_by_schedule(names, exclude_request=request)
	result = []
	for r in rows:
		outstanding = flt(r.total_amount) - paid.get(r.name, 0)
		if outstanding > TOLERANCE:
			r["outstanding"] = outstanding
			r["payment_request"] = requests.get(r.name)
			result.append(r)
	return result


@frappe.whitelist()
def get_request_schedules_for_invoice(payment_request: str, customer: str, invoice: str | None = None) -> dict:
	"""Các đợt của một đề nghị để thêm vào hóa đơn: `rows` dùng được, `skipped` đã nằm trong hóa đơn Hiệu lực khác
	hoặc thuộc hợp đồng không xuất hóa đơn được."""
	frappe.has_permission("Payment Request", "read", throw=True)
	frappe.has_permission("Sales Invoice Record", "read", throw=True)
	request = frappe.get_doc("Payment Request", payment_request)
	request.check_permission("read")
	if request.customer != customer:
		frappe.throw(
			frappe._("Đề nghị thanh toán {0} không thuộc khách hàng của hóa đơn.").format(payment_request)
		)
	names = [r.schedule for r in request.items]
	rows = frappe.get_all(
		"Payment Schedule", filters={"name": ["in", names]}, fields=SCHEDULE_ROW_FIELDS, order_by="due_date asc, name asc"
	)
	taken = active_invoice_by_schedule(names, exclude_invoice=invoice)
	statuses = {
		c: frappe.db.get_value("Contract", c, "status") for c in {r.contract for r in rows}
	}
	ok, skipped = [], []
	for r in rows:
		if r.name in taken or statuses.get(r.contract) not in BILLABLE_CONTRACT_STATUSES:
			skipped.append(r)
		else:
			ok.append(r)
	return {"rows": ok, "skipped": skipped}


@frappe.whitelist()
def get_payment_request_defaults() -> dict:
	"""Thông tin tài khoản nhận tiền mặc định (từ Cài đặt công ty) cho đề nghị mới."""
	frappe.has_permission("Payment Request", "read", throw=True)
	settings = frappe.db.get_singles_dict("Contract Tracker Settings")
	return {f: settings.get(f) or "" for f in BANK_FIELDS}


@frappe.whitelist()
def get_receivable_schedules(customer: str, receipt: str | None = None) -> list:
	"""Đợt còn nợ của khách hàng (bỏ qua tiền của phiếu `receipt`), kèm hóa đơn Hiệu lực chứa đợt."""
	frappe.has_permission("Payment Receipt", "read", throw=True)
	rows = _billable_schedules(customer, ["name", "schedule_name", "contract", "due_date", "total_amount"])
	names = [r.name for r in rows]
	paid = paid_by_schedule(names, exclude_receipt=receipt)
	invoices = active_invoice_by_schedule(names)
	result = []
	for r in rows:
		outstanding = flt(r.total_amount) - paid.get(r.name, 0)
		if outstanding > TOLERANCE:
			r["outstanding"] = outstanding
			r["invoice"] = invoices.get(r.name, (None, None))[0]
			result.append(r)
	return result


@frappe.whitelist()
def suggest_allocation(
	customer: str, amount: float, invoice: str | None = None, receipt: str | None = None
) -> list:
	"""Gợi ý phân bổ: đợt thuộc hóa đơn `invoice` trước, rồi theo ngày đến hạn; tuần tự đến hết tiền."""
	rows = get_receivable_schedules(customer, receipt)
	rows.sort(key=lambda r: (0 if invoice and r.invoice == invoice else 1, str(r.due_date or ""), r.name))
	remaining = flt(amount)
	result = []
	for r in rows:
		if remaining <= 0:
			break
		part = min(remaining, r.outstanding)
		result.append(
			{
				"schedule": r.name,
				"allocated_amount": part,
				"schedule_name": r.schedule_name,
				"contract": r.contract,
				"due_date": r.due_date,
				"outstanding": r.outstanding,
			}
		)
		remaining -= part
	return result
