# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import add_days, cint, flt, getdate

from contract_tracker.contract_tracker.doctype.contract.contract import (
	MULTI,
	ONCE,
	RECURRING,
	recurring_periods,
	round_vnd,
)


class PaymentSchedule(Document):
	"""Đợt thu do hệ thống sinh từ hạng mục hợp đồng; người dùng chỉ được xem."""

	def before_insert(self):
		if not self.acceptance_status or self.acceptance_status == "Chưa":
			self.acceptance_status = "Chưa" if self.requires_acceptance else "Không cần"


def has_documents(schedule) -> bool:
	"""Đợt này đã có chứng từ (nghiệm thu, đề nghị, hóa đơn, thu tiền) chưa.

	Ticket này luôn trả về không; các ticket sau bổ sung. Đây là hàm duy nhất trả lời câu hỏi này.
	"""
	return False


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
