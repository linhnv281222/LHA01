# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt

from decimal import ROUND_HALF_UP, Decimal

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, add_months, date_diff, flt, getdate

# Các câu thông báo dưới đây được chép y nguyên sang frontend/src/pages/contracts/contract.ts.
MSG_CONTRACT_NO_REQUIRED = "Vui lòng nhập số hợp đồng."
MSG_DUPLICATE = "Số hợp đồng {0} đã tồn tại."
MSG_END_REQUIRED = "Hợp đồng có hạng mục Định kỳ nên phải nhập ngày kết thúc."
MSG_END_BEFORE_START = "Ngày kết thúc phải từ ngày bắt đầu trở đi."
MSG_NO_ITEMS = "Hợp đồng chưa có hạng mục, không kích hoạt được."
MSG_DELETE_NOT_DRAFT = "Chỉ xóa được hợp đồng ở trạng thái Nháp. Hãy chuyển hợp đồng sang Đã hủy."
MSG_LOCKED = "Hợp đồng {0} đã {1}, không sửa được."
MSG_STATUS_READONLY = "Trạng thái hợp đồng chỉ đổi bằng nút Kích hoạt, Thanh lý hoặc Hủy hợp đồng."
MSG_BAD_STATE = "Không thể {0} hợp đồng ở trạng thái {1}."
MSG_ITEM_REQUIRED = "Hạng mục dòng {0}: vui lòng nhập {1}."
MSG_ITEM_POSITIVE = "Hạng mục dòng {0}: {1} phải lớn hơn 0."
MSG_ITEM_NO_MILESTONE = "Hạng mục dòng {0}: cần ít nhất 1 mốc thanh toán."
MSG_ITEM_PERIOD_END = "Hạng mục dòng {0}: ngày kết thúc kỳ phải từ ngày bắt đầu kỳ đầu trở đi."
MSG_ITEM_CREDIT_DAYS = "Hạng mục dòng {0}: số ngày được nợ phải là số nguyên từ 0 trở lên."
MSG_MILESTONE_REQUIRED = "Hạng mục dòng {0}, mốc {1}: vui lòng nhập {2}."
MSG_MILESTONE_POSITIVE = "Hạng mục dòng {0}, mốc {1}: {2} phải lớn hơn 0."
MSG_AMOUNT_MISMATCH = 'Hạng mục "{0}": tổng các mốc là {1}, giá trị hạng mục là {2}, đang lệch {3}.'
MSG_PERCENT_MISMATCH = 'Hạng mục "{0}": tổng phần trăm các mốc là {1}%, đang lệch {2}%.'
MSG_VAT_INACTIVE = "Thuế suất {0} đã ngừng dùng, hãy chọn thuế suất khác."

ONCE = "Một lần"
MULTI = "Nhiều đợt"
RECURRING = "Định kỳ"
BY_AMOUNT = "Số tiền"
BY_PERCENT = "Phần trăm"

STATUS_DRAFT = "Nháp"
STATUS_ACTIVE = "Đang hiệu lực"
STATUS_EXPIRED = "Hết hạn"
STATUS_LIQUIDATED = "Đã thanh lý"
STATUS_CANCELLED = "Đã hủy"
LOCKED_STATUSES = (STATUS_EXPIRED, STATUS_LIQUIDATED, STATUS_CANCELLED)

PERIOD_MONTHS = {"Tháng": 1, "Quý": 3, "6 tháng": 6, "Năm": 12}

TOLERANCE = 0.01


def round_vnd(value) -> int:
	"""Làm tròn đồng theo kiểu thương mại (0,5 làm tròn lên), không phụ thuộc cài đặt hệ thống."""
	return int(Decimal(str(flt(value))).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def format_number(value, decimals: int = 2) -> str:
	"""Dạng Việt Nam: 1.234.567 và 12,5 (khớp formatNumber ở giao diện)."""
	text = f"{round(flt(value), decimals):,.{decimals}f}"
	text = text.replace(",", "\0").replace(".", ",").replace("\0", ".")
	if "," in text:
		text = text.rstrip("0").rstrip(",")
	return "0" if text in ("-0", "") else text


def format_vnd(value) -> str:
	return format_number(round_vnd(value), 0)


def recurring_periods(period, period_start, period_end):
	"""Danh sách kỳ thu: [(từ ngày, đến ngày, tỷ lệ so với kỳ đầy đủ)].

	Kỳ cuối vượt ngày kết thúc thì cắt tại ngày kết thúc, tỷ lệ = số ngày thực tế / số ngày của kỳ đầy đủ.
	Ticket sinh đợt thu dùng lại hàm này để các đợt cộng lại khớp với số tổng của hợp đồng.
	"""
	months = PERIOD_MONTHS.get(period)
	if not months or not period_start or not period_end:
		return []
	start, end = getdate(period_start), getdate(period_end)
	periods = []
	k = 0
	while True:
		p_from = add_months(start, k * months)
		if p_from > end:
			break
		full_to = add_days(add_months(start, (k + 1) * months), -1)
		p_to = min(full_to, end)
		ratio = 1 if p_to == full_to else (date_diff(p_to, p_from) + 1) / (date_diff(full_to, p_from) + 1)
		periods.append((p_from, p_to, ratio))
		k += 1
	return periods


def recurring_amount(unit_price, period, period_start, period_end) -> int:
	"""Tổng tiền các kỳ (làm tròn từng kỳ)."""
	return sum(round_vnd(flt(unit_price) * ratio) for _from, _to, ratio in recurring_periods(period, period_start, period_end))


def has_billed_installments(contract_name: str) -> bool:
	"""Hợp đồng đã có đợt thu gắn chứng từ (hóa đơn, phiếu thu) chưa. Ticket 4 bổ sung."""
	return False


def _empty(value) -> bool:
	return value is None or (isinstance(value, str) and not value.strip())


class Contract(Document):
	"""Hợp đồng với khách hàng. Tên bản ghi là số hợp đồng."""

	def before_insert(self):
		# Tên bản ghi lấy từ contract_no nên phải chuẩn hóa trước khi đặt tên.
		self.contract_no = (self.contract_no or "").strip()
		if not self.contract_no:
			frappe.throw(_(MSG_CONTRACT_NO_REQUIRED), frappe.MandatoryError)
		if frappe.db.exists("Contract", self.contract_no):
			frappe.throw(_(MSG_DUPLICATE).format(self.contract_no), frappe.DuplicateEntryError)
		self.status = STATUS_DRAFT

	def validate(self):
		self.contract_title = (self.contract_title or "").strip()
		self.guard_status()
		self.validate_dates()
		self.validate_items()
		self.validate_vat_rates()
		self.drop_orphan_milestones()
		self.calculate_totals()

	# ---- kiểm tra ----

	def guard_status(self):
		"""Hợp đồng đã khóa thì không sửa; trạng thái chỉ đổi qua các nút (flags.status_change)."""
		before = self.get_doc_before_save()
		if not before or self.flags.status_change:
			return
		if before.status in LOCKED_STATUSES:
			frappe.throw(_(MSG_LOCKED).format(self.name, _status_word(before.status)))
		if self.status != before.status:
			frappe.throw(_(MSG_STATUS_READONLY))

	def validate_dates(self):
		start = getdate(self.start_date) if self.start_date else None
		end = getdate(self.end_date) if self.end_date else None
		if any(i.billing_type == RECURRING for i in self.items) and not end:
			frappe.throw(_(MSG_END_REQUIRED))
		if start and end and end < start:
			frappe.throw(_(MSG_END_BEFORE_START))

	def validate_items(self):
		milestones = {}
		for m in self.milestones:
			milestones.setdefault(m.item_key, []).append(m)
		for item in self.items:
			if _empty(item.item_key):
				item.item_key = frappe.generate_hash(length=10)
			if item.billing_type == ONCE:
				self._validate_once(item)
			elif item.billing_type == MULTI:
				self._validate_multi(item, milestones.get(item.item_key, []))
			elif item.billing_type == RECURRING:
				self._validate_recurring(item)

	def _need(self, item, value, label):
		if _empty(value):
			frappe.throw(_(MSG_ITEM_REQUIRED).format(item.idx, label))

	def _need_positive(self, item, value, label):
		self._need(item, value, label)
		if flt(value) <= 0:
			frappe.throw(_(MSG_ITEM_POSITIVE).format(item.idx, label))

	def _validate_once(self, item):
		self._need_positive(item, item.amount, "số tiền trước thuế")
		self._need(item, item.due_date, "ngày đến hạn")

	def _validate_multi(self, item, milestones):
		self._need_positive(item, item.item_value, "giá trị hạng mục trước thuế")
		if not milestones:
			frappe.throw(_(MSG_ITEM_NO_MILESTONE).format(item.idx))
		by_percent = item.milestone_input == BY_PERCENT
		label = "phần trăm" if by_percent else "số tiền"
		total = 0.0
		for j, m in enumerate(milestones, 1):
			if _empty(m.milestone_name):
				frappe.throw(_(MSG_MILESTONE_REQUIRED).format(item.idx, j, "tên mốc"))
			if _empty(m.due_date):
				frappe.throw(_(MSG_MILESTONE_REQUIRED).format(item.idx, j, "ngày đến hạn"))
			value = m.percent if by_percent else m.amount
			if _empty(value):
				frappe.throw(_(MSG_MILESTONE_REQUIRED).format(item.idx, j, label))
			if flt(value) <= 0:
				frappe.throw(_(MSG_MILESTONE_POSITIVE).format(item.idx, j, label))
			total += flt(value)
			m.milestone_amount = round_vnd(flt(item.item_value) * flt(value) / 100) if by_percent else flt(value)
		if by_percent:
			diff = round(total - 100, 2)
			if abs(diff) > TOLERANCE:
				frappe.throw(
					_(MSG_PERCENT_MISMATCH).format(item.item_name, format_number(total), format_number(diff))
				)
		else:
			diff = round(total - flt(item.item_value), 2)
			if abs(diff) > TOLERANCE:
				frappe.throw(
					_(MSG_AMOUNT_MISMATCH).format(
						item.item_name, format_vnd(total), format_vnd(item.item_value), format_vnd(diff)
					)
				)

	def _validate_recurring(self, item):
		self._need_positive(item, item.unit_price, "đơn giá mỗi kỳ trước thuế")
		self._need(item, item.period, "chu kỳ")
		self._need(item, item.period_start, "ngày bắt đầu kỳ đầu")
		if _empty(item.period_end) and self.end_date:
			item.period_end = self.end_date
		self._need(item, item.period_end, "ngày kết thúc")
		if getdate(item.period_end) < getdate(item.period_start):
			frappe.throw(_(MSG_ITEM_PERIOD_END).format(item.idx))
		if cint_neg(item.credit_days):
			frappe.throw(_(MSG_ITEM_CREDIT_DAYS).format(item.idx))

	def validate_vat_rates(self):
		"""Chỉ kiểm hạng mục mới hoặc vừa đổi thuế suất, để hợp đồng cũ vẫn sửa được phần khác."""
		before = self.get_doc_before_save()
		old = {(i.item_key, i.vat_rate) for i in before.items} if before else set()
		for item in self.items:
			if not item.vat_rate or (item.item_key, item.vat_rate) in old:
				continue
			if frappe.db.get_value("VAT Rate", item.vat_rate, "is_active") == 0:
				frappe.throw(_(MSG_VAT_INACTIVE).format(item.vat_rate))

	def drop_orphan_milestones(self):
		multi_keys = {i.item_key for i in self.items if i.billing_type == MULTI}
		kept = [m for m in self.milestones if m.item_key in multi_keys]
		if len(kept) != len(self.milestones):
			self.set("milestones", kept)

	# ---- tính tiền ----

	def calculate_totals(self):
		total_before = total_tax = 0
		for item in self.items:
			if item.billing_type == ONCE:
				before = flt(item.amount)
			elif item.billing_type == MULTI:
				before = flt(item.item_value)
			elif item.billing_type == RECURRING:
				before = recurring_amount(item.unit_price, item.period, item.period_start, item.period_end)
			else:
				before = 0
			vat = (
				frappe.db.get_value("VAT Rate", item.vat_rate, ["rate", "is_non_taxable"], as_dict=True)
				if item.vat_rate
				else None
			)
			tax = 0 if not vat or vat.is_non_taxable else round_vnd(before * flt(vat.rate) / 100)
			item.amount_before_tax = before
			item.tax_amount = tax
			total_before += before
			total_tax += tax
		self.total_before_tax = total_before
		self.total_tax = total_tax
		self.total_after_tax = total_before + total_tax
		# Ticket 4 tính các số dưới đây từ hóa đơn và phiếu thu.
		self.invoiced_amount = 0
		self.paid_amount = 0
		self.outstanding_amount = 0

	# ---- xóa ----

	def on_trash(self):
		if self.status != STATUS_DRAFT or has_billed_installments(self.name):
			frappe.throw(_(MSG_DELETE_NOT_DRAFT))

	# ---- đổi trạng thái ----

	def _set_status(self, new_status):
		# Gọi method qua REST có thể chỉ kiểm quyền đọc, nên kiểm quyền ghi ở đây.
		self.check_permission("write")
		self.flags.status_change = True
		self.status = new_status
		try:
			self.save()
		finally:
			self.flags.status_change = False

	def _require_status(self, action, allowed):
		if self.status not in allowed:
			frappe.throw(_(MSG_BAD_STATE).format(action, self.status))

	@frappe.whitelist()
	def activate(self):
		"""Nháp → Đang hiệu lực. Chưa sinh đợt thu."""
		self.check_permission("write")
		self._require_status("kích hoạt", (STATUS_DRAFT,))
		if not self.items:
			frappe.throw(_(MSG_NO_ITEMS))
		self._set_status(STATUS_ACTIVE)

	@frappe.whitelist()
	def cancel_contract(self):
		"""Nháp hoặc Đang hiệu lực → Đã hủy."""
		self.check_permission("write")
		self._require_status("hủy", (STATUS_DRAFT, STATUS_ACTIVE))
		if has_billed_installments(self.name):
			frappe.throw(_("Hợp đồng đã có đợt thu gắn chứng từ, không hủy được."))
		self._set_status(STATUS_CANCELLED)

	@frappe.whitelist()
	def liquidate(self):
		"""Đang hiệu lực → Đã thanh lý."""
		self.check_permission("write")
		self._require_status("thanh lý", (STATUS_ACTIVE,))
		self._set_status(STATUS_LIQUIDATED)


def cint_neg(value) -> bool:
	"""Số ngày được nợ âm thì sai (Int của Frappe đã làm tròn số lẻ về số nguyên)."""
	return flt(value) < 0


def _status_word(status: str) -> str:
	"""'Đã hủy' → 'hủy', 'Hết hạn' → 'hết hạn' (để ghép vào 'đã ...')."""
	return status.removeprefix("Đã ").lower()
