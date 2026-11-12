# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.query_builder.functions import Sum
from frappe.utils import add_days, cint, flt, getdate, today

from contract_tracker.contract_tracker.doctype.contract.contract import (
	MULTI,
	ONCE,
	RECURRING,
	STATUS_ACTIVE,
	STATUS_EXPIRED,
	STATUS_LIQUIDATED,
	TOLERANCE,
	recurring_periods,
	refresh_contract_amounts,
	round_vnd,
)

# Đợt của hợp đồng ở các trạng thái này mới được đưa vào hóa đơn và phiếu thu.
BILLABLE_CONTRACT_STATUSES = (STATUS_ACTIVE, STATUS_EXPIRED, STATUS_LIQUIDATED)
INVOICE_ACTIVE = "Hiệu lực"


class PaymentSchedule(Document):
	"""Đợt thu do hệ thống sinh từ hạng mục hợp đồng; người dùng chỉ được xem."""

	def before_insert(self):
		if not self.acceptance_status or self.acceptance_status == "Chưa":
			self.acceptance_status = "Chưa" if self.requires_acceptance else "Không cần"


def has_documents(schedule) -> bool:
	"""Đợt này đã có chứng từ (hóa đơn Hiệu lực hoặc tiền thu phân bổ) chưa.

	Dựa vào hai trường luôn được `refresh_schedules` tính lại từ chứng từ. Đây là hàm duy nhất trả lời câu hỏi này.
	"""
	invoice_status, paid, name = (schedule.get(k) for k in ("invoice_status", "paid_amount", "name"))
	if (invoice_status is None or paid is None) and name:
		invoice_status, paid = frappe.db.get_value("Payment Schedule", name, ["invoice_status", "paid_amount"])
	return invoice_status == "Đã xuất" or flt(paid) > 0


def active_invoice_by_schedule(names, exclude_invoice=None) -> dict:
	"""{đợt: (mã hóa đơn, số hóa đơn)} của các hóa đơn Hiệu lực chứa đợt."""
	names = [n for n in names if n]
	if not names:
		return {}
	item = frappe.qb.DocType("Sales Invoice Record Item")
	inv = frappe.qb.DocType("Sales Invoice Record")
	query = (
		frappe.qb.from_(item)
		.join(inv)
		.on(item.parent == inv.name)
		.select(item.schedule, inv.name, inv.invoice_no)
		.where(item.schedule.isin(names))
		.where(item.parenttype == "Sales Invoice Record")
		.where(inv.status == INVOICE_ACTIVE)
	)
	if exclude_invoice:
		query = query.where(inv.name != exclude_invoice)
	return {schedule: (name, no) for schedule, name, no in query.run()}


def request_by_schedule(names, exclude_request=None) -> dict:
	"""{đợt: mã đề nghị thanh toán} của các đề nghị (Nháp hoặc Đã gửi) đang chứa đợt."""
	names = [n for n in names if n]
	if not names:
		return {}
	item = frappe.qb.DocType("Payment Request Item")
	req = frappe.qb.DocType("Payment Request")
	query = (
		frappe.qb.from_(item)
		.join(req)
		.on(item.parent == req.name)
		.select(item.schedule, req.name)
		.where(item.schedule.isin(names))
		.where(item.parenttype == "Payment Request")
	)
	if exclude_request:
		query = query.where(req.name != exclude_request)
	return {schedule: name for schedule, name in query.run()}


def minutes_by_schedule(names, exclude_minutes=None, status=None) -> dict:
	"""{đợt: mã biên bản nghiệm thu} của các biên bản (Nháp hoặc Đã ký) đang chứa đợt."""
	names = [n for n in names if n]
	if not names:
		return {}
	item = frappe.qb.DocType("Acceptance Minutes Item")
	minutes = frappe.qb.DocType("Acceptance Minutes")
	query = (
		frappe.qb.from_(item)
		.join(minutes)
		.on(item.parent == minutes.name)
		.select(item.schedule, minutes.name)
		.where(item.schedule.isin(names))
		.where(item.parenttype == "Acceptance Minutes")
	)
	if exclude_minutes:
		query = query.where(minutes.name != exclude_minutes)
	if status:
		query = query.where(minutes.status == status)
	return {schedule: name for schedule, name in query.run()}


def paid_by_schedule(names, exclude_receipt=None) -> dict:
	"""{đợt: tổng tiền đã phân bổ từ các phiếu thu}."""
	names = [n for n in names if n]
	if not names:
		return {}
	alloc = frappe.qb.DocType("Payment Receipt Allocation")
	query = (
		frappe.qb.from_(alloc)
		.select(alloc.schedule, Sum(alloc.allocated_amount))
		.where(alloc.schedule.isin(names))
		.where(alloc.parenttype == "Payment Receipt")
		.groupby(alloc.schedule)
	)
	if exclude_receipt:
		query = query.where(alloc.parent != exclude_receipt)
	return {schedule: flt(total) for schedule, total in query.run()}


def outstanding_of(schedule, exclude_receipt=None) -> float:
	"""Số còn nợ của đợt = tổng tiền − đã thu từ các phiếu khác."""
	total = flt(frappe.db.get_value("Payment Schedule", schedule, "total_amount"))
	return total - paid_by_schedule([schedule], exclude_receipt).get(schedule, 0)


def compute_schedule_state(total, paid, due_date, invoice_no) -> dict:
	"""Trạng thái đợt từ số liệu chứng từ (hàm thuần)."""
	total, paid = flt(total), flt(paid)
	owes = total - paid > TOLERANCE
	if paid <= 0:
		payment_status = "Chưa thu"
	elif owes:
		payment_status = "Thu một phần"
	else:
		payment_status = "Đã thu"
	return {
		"invoice_status": "Đã xuất" if invoice_no else "Chưa xuất",
		"invoice_no": invoice_no or None,
		"payment_status": payment_status,
		"paid_amount": paid,
		"is_overdue": 1 if due_date and owes and getdate(due_date) < getdate(today()) else 0,
	}


def refresh_schedules(names, exclude_receipt=None, exclude_request=None, exclude_minutes=None):
	"""Tính lại trạng thái các đợt từ toàn bộ hóa đơn Hiệu lực và phiếu thu, rồi số tổng của hợp đồng.

	Ghi bằng db.set_value để không chạy save Đợt thu/Hợp đồng (hợp đồng Hết hạn, Đã thanh lý bị khóa sửa).
	"""
	names = sorted({n for n in names if n})
	if not names:
		return
	rows = frappe.get_all(
		"Payment Schedule",
		filters={"name": ["in", names]},
		fields=["name", "contract", "total_amount", "due_date", "requires_acceptance"],
	)
	found = [r.name for r in rows]
	invoices = active_invoice_by_schedule(found)
	paid = paid_by_schedule(found, exclude_receipt)
	requests = request_by_schedule(found, exclude_request)
	signed = minutes_by_schedule(found, exclude_minutes, status="Đã ký")
	contracts = set()
	for row in rows:
		invoice_no = invoices.get(row.name, (None, None))[1]
		state = compute_schedule_state(row.total_amount, paid.get(row.name, 0), row.due_date, invoice_no)
		state["request_status"] = "Đã lập" if row.name in requests else "Chưa lập"
		if not row.requires_acceptance:
			state["acceptance_status"] = "Không cần"
		else:
			state["acceptance_status"] = "Đã ký" if row.name in signed else "Chưa"
		frappe.db.set_value("Payment Schedule", row.name, state, update_modified=False)
		contracts.add(row.contract)
	for contract in contracts:
		refresh_contract_amounts(contract)


def _fmt(value) -> str:
	return getdate(value).strftime("%d/%m/%Y")


def schedule_key(item_key, detail="") -> tuple:
	return (item_key or "", detail or "")


def period_label(item, p_from, p_to) -> str:
	start = getdate(p_from)
	if item.period == "Tháng":
		return f"{item.item_name} T{start.month:02d}/{start.year}"
	if item.period == "Quý":
		return f"Quý {(start.month - 1) // 3 + 1}/{start.year}"
	if item.period == "6 tháng":
		if start.day == 1 and start.month == 1:
			return f"6 tháng đầu {start.year}"
		if start.day == 1 and start.month == 7:
			return f"6 tháng cuối {start.year}"
		return f"{item.item_name} từ {_fmt(start)}"
	if item.period == "Năm":
		return f"Năm {start.year}"
	return f"{item.item_name} từ {_fmt(p_from)} đến {_fmt(p_to)}"


def due_date_of(item, p_from, p_to):
	base = p_from if item.bill_timing != "Cuối kỳ" else p_to
	return add_days(base, cint(item.credit_days))


def _vat(vat_rate):
	if not vat_rate:
		return 0, True
	vat = frappe.db.get_value("VAT Rate", vat_rate, ["rate", "is_non_taxable"], as_dict=True)
	if not vat:
		return 0, True
	return flt(vat.rate), bool(vat.is_non_taxable)


def build_schedules(contract) -> list[dict]:
	"""Dựng danh sách đợt từ hạng mục (chưa ghi vào CSDL). Mỗi dict có thêm khóa `key`."""
	result = []
	milestones = {}
	for m in contract.milestones:
		milestones.setdefault(m.item_key, []).append(m)

	for item in contract.items:
		common = {
			"contract": contract.name,
			"customer": contract.customer,
			"responsible_user": contract.responsible_user,
			"item_key": item.item_key,
			"item_name": item.item_name,
			"vat_rate": item.vat_rate,
			"requires_acceptance": cint(item.requires_acceptance),
		}
		parts = []  # (tên đợt, trước thuế, hạn, khóa, từ, đến, cần nghiệm thu)
		if item.billing_type == ONCE:
			parts.append(
				(item.item_name, round_vnd(item.amount), item.due_date, "", None, None, common["requires_acceptance"])
			)
		elif item.billing_type == MULTI:
			rows = milestones.get(item.item_key, [])
			total = round_vnd(item.item_value)
			running = 0
			for j, m in enumerate(rows):
				amount = total - running if j == len(rows) - 1 else round_vnd(m.milestone_amount)
				running += amount
				parts.append(
					(m.milestone_name, amount, m.due_date, m.milestone_name, None, None, cint(m.requires_acceptance))
				)
		elif item.billing_type == RECURRING:
			for p_from, p_to, ratio in recurring_periods(
				item.period, item.period_start, item.period_end, item.period_days
			):
				parts.append(
					(
						period_label(item, p_from, p_to),
						round_vnd(flt(item.unit_price) * ratio),
						due_date_of(item, p_from, p_to),
						str(p_from),
						p_from,
						p_to,
						common["requires_acceptance"],
					)
				)

		rate, non_taxable = _vat(item.vat_rate)
		for name, before, due, detail, p_from, p_to, need_acc in parts:
			tax = 0 if non_taxable else round_vnd(before * rate / 100)
			result.append(
				{
					**common,
					"key": schedule_key(item.item_key, detail),
					"schedule_name": name,
					"period_from": p_from,
					"period_to": p_to,
					"due_date": due,
					"amount_before_tax": before,
					"tax_amount": tax,
					"total_amount": before + tax,
					"requires_acceptance": need_acc,
					"acceptance_status": "Chưa" if need_acc else "Không cần",
				}
			)
	return result


def sync_responsible_user(contract_name: str, user: str | None):
	"""Đồng bộ người phụ trách của hợp đồng sang mọi đợt (kể cả đợt đã có chứng từ).

	Ghi bằng db.set_value để không chạy save đợt thu.
	"""
	frappe.db.set_value(
		"Payment Schedule", {"contract": contract_name}, "responsible_user", user or None, update_modified=False
	)


def delete_unbilled_schedules(contract_name: str):
	"""Xóa các đợt chưa có chứng từ của hợp đồng (hủy hợp đồng)."""
	for row in frappe.get_all("Payment Schedule", filters={"contract": contract_name}, fields=["*"]):
		if not has_documents(row):
			frappe.delete_doc("Payment Schedule", row.name, ignore_permissions=True, force=True)


def generate_schedules(contract):
	"""Sinh mới hoặc sinh lại đợt: xóa đợt chưa chứng từ, giữ đợt có chứng từ, bỏ qua đợt trùng khóa."""
	kept_keys = set()
	for row in frappe.get_all("Payment Schedule", filters={"contract": contract.name}, fields=["*"]):
		if has_documents(row):
			kept_keys.add(_row_key(row, contract))
		else:
			frappe.delete_doc("Payment Schedule", row.name, ignore_permissions=True, force=True)

	for data in build_schedules(contract):
		key = data.pop("key")
		if key in kept_keys:
			continue
		frappe.get_doc({"doctype": "Payment Schedule", **data}).insert(ignore_permissions=True)


def _row_key(row, contract) -> tuple:
	"""Khóa của đợt đã lưu: mã hạng mục + (ngày bắt đầu kỳ | tên mốc | rỗng)."""
	if row.period_from:
		return schedule_key(row.item_key, str(getdate(row.period_from)))
	item = next((i for i in contract.items if i.item_key == row.item_key), None)
	if item is not None and item.billing_type == MULTI:
		return schedule_key(row.item_key, row.schedule_name)
	if item is None:
		# Hạng mục đã bị xóa: không có đợt mới nào trùng khóa này.
		return schedule_key(row.item_key, row.schedule_name)
	return schedule_key(row.item_key, "")
