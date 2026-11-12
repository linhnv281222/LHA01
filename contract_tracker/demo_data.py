# Copyright (c) 2026, FaceNet and contributors
# For license information, please see license.txt
"""Nạp / xóa dữ liệu mẫu hợp đồng, CHỈ cho site staging. Chạy tay, không nằm trong patches.txt.

    bench --site <staging> execute contract_tracker.demo_data.seed
    bench --site <staging> execute contract_tracker.demo_data.clear

Không gọi commit: `bench execute` tự commit khi xong, lỗi giữa chừng thì rollback hết.
"""

from collections import Counter

import frappe
from frappe import _
from frappe.utils import add_days, cint, getdate, today

from contract_tracker.contract_tracker.doctype.contract.contract import (
	STATUS_EXPIRED,
	refresh_contract_amounts,
	round_vnd,
)
from contract_tracker.contract_tracker.doctype.payment_schedule.payment_schedule import (
	has_documents,
	minutes_by_schedule,
	refresh_schedules,
)
from contract_tracker.setup import ensure_vat_rates

MSG_NOT_STAGING = "Chỉ được chạy trên site staging (site_config cần is_staging = 1)."
PREFIX = "MAU-"
CUSTOMER_TAX_PREFIX = "MAU-KH-"
TYPE_CODE_PREFIX = "MAU_"
INVOICE_PREFIX = "MAU-HD-"
INVOICE_SERIES = "MAU/26E"

DOCTYPES = (
	"Contract",
	"Payment Schedule",
	"Sales Invoice Record",
	"Payment Receipt",
	"Payment Request",
	"Acceptance Minutes",
	"Contract Customer",
	"Contract Type",
)

CUSTOMERS = [
	{
		"customer_name": "Công ty TNHH Mẫu An Phát",
		"contact_person": "Nguyễn Văn An",
		"phone": "0901000001",
		"email": "anphat@example.com",
		"bank_account": "1900100001",
		"bank_name": "Vietcombank",
	},
	{
		"customer_name": "Công ty Cổ phần Mẫu Bình Minh",
		"contact_person": "Trần Thị Bình",
		"phone": "0901000002",
		"email": "binhminh@example.com",
		"bank_account": "1900100002",
		"bank_name": "BIDV",
	},
	{
		"customer_name": "Công ty TNHH Mẫu Cửu Long",
		"contact_person": "Lê Văn Cường",
		"phone": "0901000003",
		"email": "cuulong@example.com",
		"bank_account": "1900100003",
		"bank_name": "Techcombank",
	},
	{
		"customer_name": "Tập đoàn Mẫu Đại Dương",
		"contact_person": "Phạm Thị Dung",
		"phone": "0901000004",
		"email": "daiduong@example.com",
		"bank_account": "1900100004",
		"bank_name": "VietinBank",
	},
	{
		"customer_name": "Công ty TNHH Mẫu Hưng Thịnh",
		"contact_person": "Hoàng Văn Hưng",
		"phone": "0901000005",
		"email": "hungthinh@example.com",
		"bank_account": "1900100005",
		"bank_name": "MB Bank",
	},
]

TYPE_NAMES = [
	"Bảo trì phần mềm (mẫu)",
	"Triển khai hệ thống (mẫu)",
	"Cung cấp thiết bị (mẫu)",
	"Tư vấn và đào tạo (mẫu)",
]
TYPE_COUNT = 4


# Hạng mục khai báo gọn; ngày là số ngày lệch so với ngày chạy (T).
def once(name, vat, amount, due, acceptance=0):
	return {"kind": "once", "name": name, "vat": vat, "amount": amount, "due": due, "acc": acceptance}


def multi(key, name, vat, value, mode, milestones):
	"""milestones: [(tên mốc, số tiền hoặc phần trăm, lệch ngày)]"""
	return {
		"kind": "multi",
		"key": key,
		"name": name,
		"vat": vat,
		"value": value,
		"mode": mode,
		"milestones": milestones,
	}


def recurring(name, vat, price, period, days=None, credit=0):
	return {
		"kind": "rec",
		"name": name,
		"vat": vat,
		"price": price,
		"period": period,
		"days": days,
		"credit": credit,
	}


# Kịch bản chứng từ: chỉ số trong danh sách đợt đủ điều kiện (đợt đã đến hạn; hợp đồng thanh lý: đợt trước
# hoặc bằng mốc thanh lý), sắp theo ngày.
#   invoices: các đợt xuất hóa đơn (mỗi đợt một hóa đơn)
#   pays: {đợt: tỷ lệ thu}, 1 = thu đủ, số khác = thu một phần
#   request: (các chỉ số trong "pool", đã gửi?). pool = mọi đợt (thanh lý: chỉ đợt đủ điều kiện).
CONTRACTS = [
	{
		"no": "MAU-001",
		"customer": 0,
		"title": "Hợp đồng triển khai phần mềm quản lý (mẫu)",
		"signed": -95,
		"start": -90,
		"end": 275,
		"status": "active",
		"items": [
			once("Đào tạo người dùng", "10%", 20_000_000, -10, acceptance=1),
			multi(
				"K-TRIENKHAI",
				"Triển khai hệ thống",
				"10%",
				200_000_000,
				"Phần trăm",
				[("Tạm ứng", 40, -60), ("Nghiệm thu giai đoạn 1", 30, 30), ("Nghiệm thu cuối", 30, 180)],
			),
		],
		"invoices": [0, 1],
		"pays": {0: 1, 1: 0.45},
		"request": ([2], False),
	},
	{
		"no": "MAU-002",
		"customer": 1,
		"title": "Hợp đồng bảo trì hằng tháng (mẫu)",
		"signed": -125,
		"start": -120,
		"end": 240,
		"status": "active",
		"items": [recurring("Bảo trì hệ thống", "8%", 12_000_000, "Tháng", credit=15)],
		"invoices": [0, 1, 2],
		"pays": {0: 1, 1: 1, 2: 0.5},
		"request": ([3], True),
	},
	{
		"no": "MAU-003",
		"customer": 2,
		"title": "Hợp đồng bản quyền phần mềm theo quý (mẫu)",
		"signed": -65,
		"start": -60,
		"end": 300,
		"status": "active",
		"items": [
			recurring("Bản quyền phần mềm", "Không chịu thuế", 30_000_000, "Quý"),
			multi(
				"K-THIETBI",
				"Cung cấp thiết bị",
				"5%",
				80_000_000,
				"Số tiền",
				[("Đặt cọc", 30_000_000, 10), ("Giao hàng", 50_000_000, 120)],
			),
		],
		"invoices": [0],
		"pays": {},
		"request": ([0, 1], False),
	},
	{
		"no": "MAU-004",
		"customer": 3,
		"title": "Hợp đồng tư vấn một lần (mẫu)",
		"start": -20,
		"end": 160,
		"status": "active",
		"items": [once("Tư vấn quy trình", "0%", 45_000_000, 20)],
		"invoices": [],
		"pays": {},
		"request": ([], False),
	},
	{
		"no": "MAU-005",
		"customer": 4,
		"title": "Hợp đồng thuê dịch vụ theo kỳ 30 ngày (mẫu)",
		"signed": -50,
		"start": -45,
		"end": 320,
		"status": "active",
		"items": [recurring("Dịch vụ giám sát", "10%", 9_000_000, "Ngày", days=30)],
		"invoices": [0],
		"pays": {0: 1},
		"request": ([], False),
	},
	{
		"no": "MAU-006",
		"customer": 0,
		"title": "Hợp đồng cung cấp thiết bị đã hết hạn (mẫu)",
		"signed": -430,
		"start": -400,
		"end": -30,
		"status": "expired",
		"items": [
			once("Thiết bị mạng", "8%", 60_000_000, -380),
			multi(
				"K-LAPDAT",
				"Lắp đặt và cấu hình",
				"10%",
				90_000_000,
				"Phần trăm",
				[("Đợt 1", 50, -350), ("Đợt 2", 30, -200), ("Đợt 3", 20, -100)],
			),
		],
		"invoices": [0, 1, 2],
		"pays": {0: 1, 1: 1, 2: 0.4},
		"request": ([], False),
	},
	{
		"no": "MAU-007",
		"customer": 1,
		"title": "Hợp đồng bảo trì theo quý đã hết hạn (mẫu)",
		"signed": -205,
		"start": -200,
		"end": -5,
		"status": "expired",
		"items": [recurring("Bảo trì quý", "10%", 25_000_000, "Quý")],
		"invoices": [0, 1],
		"pays": {0: 1},
		"request": ([2], True),
	},
	{
		"no": "MAU-008",
		"customer": 2,
		"title": "Hợp đồng vận hành hằng tháng đã thanh lý (mẫu)",
		"signed": -305,
		"start": -300,
		"end": 400,
		"status": "liquidated",
		"cutoff": -60,
		"items": [recurring("Vận hành hệ thống", "8%", 15_000_000, "Tháng")],
		"invoices": [0, 1, 2, 3],
		"pays": {0: 1, 1: 1, 2: 0.5, 3: 1},
		"request": ([4], False),
	},
	{
		"no": "MAU-009",
		"customer": 3,
		"title": "Hợp đồng xây dựng phần mềm đã thanh lý (mẫu)",
		"signed": -245,
		"start": -240,
		"end": 360,
		"status": "liquidated",
		"cutoff": -30,
		"items": [
			multi(
				"K-XAYDUNG",
				"Xây dựng phần mềm",
				"10%",
				150_000_000,
				"Phần trăm",
				[("Khởi động", 40, -200), ("Bàn giao bản thử", 40, -100), ("Nghiệm thu", 20, 100)],
			),
			once("Bảo hành mở rộng", "5%", 12_000_000, 60),
		],
		"invoices": [0, 1],
		"pays": {0: 1, 1: 0.5},
		"request": ([], False),
	},
	{
		"no": "MAU-010",
		"customer": 4,
		"title": "Hợp đồng bản quyền theo quý đã thanh lý (mẫu)",
		"signed": -372,
		"start": -365,
		"end": 365,
		"status": "liquidated",
		"cutoff": -90,
		"items": [recurring("Bản quyền dữ liệu", "Không chịu thuế", 18_000_000, "Quý")],
		"invoices": [0, 1, 2],
		"pays": {0: 1, 1: 0.5},
		"request": ([], False),
	},
	{
		"no": "MAU-011",
		"customer": 0,
		"title": "Hợp đồng tư vấn đang soạn thảo (mẫu)",
		"start": 10,
		"end": 200,
		"status": "draft",
		"items": [once("Tư vấn giải pháp", "10%", 25_000_000, 40)],
		"invoices": [],
		"pays": {},
		"request": ([], False),
	},
	{
		"no": "MAU-012",
		"customer": 1,
		"title": "Hợp đồng đào tạo đã hủy (mẫu)",
		"signed": -12,
		"start": -10,
		"end": 120,
		"status": "cancelled",
		"items": [once("Đào tạo nhân sự", "8%", 18_000_000, 30)],
		"invoices": [],
		"pays": {},
		"request": ([], False),
	},
	{
		"no": "MAU-013",
		"customer": 2,
		"title": "Hợp đồng bản quyền sắp hết hạn (mẫu)",
		"signed": -335,
		"start": -330,
		"end": 20,
		"status": "active",
		"items": [recurring("Bản quyền theo quý", "10%", 20_000_000, "Quý")],
		"invoices": [0],
		"pays": {0: 1},
		"request": ([], False),
	},
]


def _require_staging():
	if cint(frappe.conf.get("is_staging")) != 1:
		frappe.throw(_(MSG_NOT_STAGING))


def _d(offset):
	return add_days(today(), offset)


def _key_date(row):
	return getdate(row.get("period_from") or row.get("due_date"))


# ---------------------------------------------------------------- seed


def seed():
	"""Nạp dữ liệu mẫu. Chạy lại được: hợp đồng MAU-* đã có thì bỏ qua."""
	_require_staging()
	created, skipped = Counter(), Counter()
	ensure_vat_rates()
	customers = _ensure_customers(created)
	types = _ensure_contract_types(created)
	for index, spec in enumerate(CONTRACTS):
		if frappe.db.exists("Contract", spec["no"]):
			skipped["Contract"] += 1
			continue
		_create_contract(spec, customers[spec["customer"]], types[index % len(types)], created)
	return _report("created", created, skipped)


def _ensure_customers(created):
	names = []
	for i, data in enumerate(CUSTOMERS, 1):
		tax_code = f"{CUSTOMER_TAX_PREFIX}{i:02d}"
		name = frappe.db.get_value("Contract Customer", {"tax_code": tax_code}, "name")
		if not name:
			name = frappe.get_doc({"doctype": "Contract Customer", "tax_code": tax_code, **data}).insert().name
			created["Contract Customer"] += 1
		names.append(name)
	return names


def _ensure_contract_types(created):
	# Lọc bằng Python: trong SQL LIKE, "_" khớp mọi ký tự nên sẽ bắt nhầm loại thật như MAUA1.
	rows = frappe.get_all("Contract Type", fields=["name", "code", "is_active"], order_by="name asc")
	real = [r.name for r in rows if r.is_active and not r.code.startswith(TYPE_CODE_PREFIX)][:TYPE_COUNT]
	sample = [r.name for r in rows if r.code.startswith(TYPE_CODE_PREFIX)]
	types = (real + sample)[:TYPE_COUNT]
	n = 1
	while len(types) < TYPE_COUNT:
		code = f"{TYPE_CODE_PREFIX}LOAI_{n}"
		if code not in types:
			frappe.get_doc({"doctype": "Contract Type", "code": code, "type_name": TYPE_NAMES[n - 1]}).insert()
			created["Contract Type"] += 1
			types.append(code)
		n += 1
	return types


def _build_doc(spec, customer, contract_type):
	items, milestones = [], []
	for n, it in enumerate(spec["items"], 1):
		base = {"item_name": it["name"], "vat_rate": it["vat"], "requires_acceptance": 0}
		if it["kind"] == "once":
			items.append(
				{
					**base,
					"item_key": f"K{n}",
					"billing_type": "Một lần",
					"amount": it["amount"],
					"due_date": _d(it["due"]),
					"requires_acceptance": it["acc"],
				}
			)
		elif it["kind"] == "multi":
			items.append(
				{
					**base,
					"item_key": it["key"],
					"billing_type": "Nhiều đợt",
					"item_value": it["value"],
					"milestone_input": it["mode"],
				}
			)
			field = "percent" if it["mode"] == "Phần trăm" else "amount"
			for name, value, off in it["milestones"]:
				milestones.append(
					{"item_key": it["key"], "milestone_name": name, field: value, "due_date": _d(off)}
				)
		else:
			items.append(
				{
					**base,
					"item_key": f"K{n}",
					"billing_type": "Định kỳ",
					"unit_price": it["price"],
					"period": it["period"],
					"period_days": it["days"],
					"period_start": _d(spec["start"]),
					"period_end": _d(spec["end"]),
					"credit_days": it["credit"],
				}
			)
	return frappe.get_doc(
		{
			"doctype": "Contract",
			"contract_no": spec["no"],
			"contract_title": spec["title"],
			"customer": customer,
			"contract_type": contract_type,
			"signed_date": _d(spec["signed"]) if "signed" in spec else None,
			"start_date": _d(spec["start"]),
			"end_date": _d(spec["end"]),
			"items": items,
			"milestones": milestones,
		}
	)


def _schedules(contract):
	return frappe.get_all(
		"Payment Schedule",
		filters={"contract": contract},
		fields=["name", "period_from", "due_date", "total_amount"],
		order_by="due_date asc, name asc",
	)


def _create_contract(spec, customer, contract_type, created):
	doc = _build_doc(spec, customer, contract_type).insert()
	if spec["status"] in ("draft", "cancelled"):
		# Nháp và Đã hủy không có chứng từ: không kích hoạt.
		if spec["status"] == "cancelled":
			doc.cancel_contract()
		refresh_contract_amounts(doc.name)
		created["Contract"] += 1
		created["Payment Schedule"] += len(_schedules(doc.name))
		return
	doc.activate()
	name = doc.name
	rows = _schedules(name)
	liquidated = spec["status"] == "liquidated"
	cutoff = getdate(_d(spec["cutoff"])) if liquidated else None
	if liquidated:
		eligible = [r for r in rows if _key_date(r) <= cutoff]
	else:
		eligible = [r for r in rows if getdate(r.due_date) <= getdate(today())]
	pool = eligible if liquidated else rows

	invoiced = {}
	for i in spec["invoices"]:
		if i < len(eligible):
			invoiced[i] = eligible[i]
			_make_invoice(customer, eligible[i], created)
	for i, ratio in spec["pays"].items():
		if i in invoiced:
			_make_receipt(customer, invoiced[i], ratio, created)
	request_idx, sent = spec["request"]
	request_rows = [pool[i] for i in request_idx if i < len(pool)]
	if request_rows:
		_make_request(customer, request_rows, sent, created)

	if spec["status"] == "expired":
		# Giống tasks.expire_contracts nhưng chỉ cho hợp đồng mẫu: gọi thẳng hàm đó sẽ đổi cả hợp đồng thật.
		frappe.db.set_value("Contract", name, "status", STATUS_EXPIRED, update_modified=False)
	elif liquidated:
		doc.reload()
		doc.liquidate()
		_drop_schedules_after(name, cutoff)
	refresh_contract_amounts(name)
	created["Contract"] += 1
	created["Payment Schedule"] += len(_schedules(name))


def _next_invoice_no():
	n = 1
	while frappe.db.exists(
		"Sales Invoice Record",
		{"invoice_no": f"{INVOICE_PREFIX}{n:04d}", "invoice_series": INVOICE_SERIES, "status": "Hiệu lực"},
	):
		n += 1
	return f"{INVOICE_PREFIX}{n:04d}"


def _make_invoice(customer, row, created):
	frappe.get_doc(
		{
			"doctype": "Sales Invoice Record",
			"customer": customer,
			"invoice_no": _next_invoice_no(),
			"invoice_series": INVOICE_SERIES,
			"invoice_date": min(getdate(row.due_date), getdate(today())),
			"items": [{"schedule": row.name}],
		}
	).insert()
	created["Sales Invoice Record"] += 1


def _make_receipt(customer, row, ratio, created):
	total = frappe.db.get_value("Payment Schedule", row.name, "total_amount")
	amount = round_vnd(total) if ratio >= 1 else round_vnd(total * ratio)
	frappe.get_doc(
		{
			"doctype": "Payment Receipt",
			"customer": customer,
			"receipt_date": min(getdate(add_days(row.due_date, 5)), getdate(today())),
			"amount": amount,
			"method": "Chuyển khoản" if ratio >= 1 else "Tiền mặt",
			"allocations": [{"schedule": row.name, "allocated_amount": amount}],
		}
	).insert()
	created["Payment Receipt"] += 1


def _make_request(customer, rows, sent, created):
	doc = frappe.get_doc(
		{
			"doctype": "Payment Request",
			"customer": customer,
			"request_date": today(),
			"due_date": _d(15),
			"items": [{"schedule": r.name} for r in rows],
		}
	).insert()
	if sent:
		doc.mark_sent()
	created["Payment Request"] += 1


def _drop_schedules_after(contract, cutoff):
	"""Hệ thống giữ nguyên mọi đợt đã sinh khi thanh lý; dữ liệu mẫu bỏ đợt sau mốc mà chưa có chứng từ nào."""
	rows = frappe.get_all("Payment Schedule", filters={"contract": contract}, fields=["*"])
	minutes = minutes_by_schedule([r.name for r in rows])
	for row in rows:
		if (
			_key_date(row) > cutoff
			and not has_documents(row)
			and row.request_status == "Chưa lập"
			and row.name not in minutes
		):
			frappe.delete_doc("Payment Schedule", row.name, ignore_permissions=True, force=True)
	refresh_contract_amounts(contract)


# ---------------------------------------------------------------- clear

# (DocType con, DocType cha) theo thứ tự xóa: phiếu thu → đề nghị → biên bản → hóa đơn.
CHILD_TABLES = [
	("Payment Receipt Allocation", "Payment Receipt"),
	("Payment Request Item", "Payment Request"),
	("Acceptance Minutes Item", "Acceptance Minutes"),
	("Sales Invoice Record Item", "Sales Invoice Record"),
]


def _parents_with_schedules(child, parent, schedules):
	"""{mã chứng từ: tập đợt thu của mọi dòng} cho các chứng từ có dòng thuộc `schedules`."""
	if not schedules:
		return {}
	t = frappe.qb.DocType(child)
	parents = [
		r[0]
		for r in frappe.qb.from_(t)
		.select(t.parent)
		.distinct()
		.where(t.schedule.isin(schedules))
		.where(t.parenttype == parent)
		.run()
	]
	if not parents:
		return {}
	result = {p: set() for p in parents}
	for p, s in frappe.qb.from_(t).select(t.parent, t.schedule).where(t.parent.isin(parents)).where(
		t.parenttype == parent
	).run():
		result[p].add(s)
	return result


def _delete(doctype, name):
	frappe.delete_doc(
		doctype, name, ignore_permissions=True, force=True, ignore_on_trash=True, delete_permanently=True
	)


def clear():
	"""Xóa hợp đồng MAU-* cùng chứng từ con. Chứng từ có cả đợt không phải mẫu thì giữ lại."""
	_require_staging()
	deleted, skipped = Counter(), Counter()
	contracts = frappe.get_all("Contract", filters={"name": ["like", f"{PREFIX}%"]}, pluck="name")
	schedules = (
		frappe.get_all("Payment Schedule", filters={"contract": ["in", contracts]}, fields=["name", "contract"])
		if contracts
		else []
	)
	mine = {r.name for r in schedules}

	blocked = set()  # đợt mẫu còn được chứng từ lẫn dữ liệu thật tham chiếu
	for child, parent in CHILD_TABLES:
		for name, used in _parents_with_schedules(child, parent, list(mine)).items():
			if used <= mine:
				_delete(parent, name)
				deleted[parent] += 1
			else:
				skipped[parent] += 1
				blocked |= used & mine

	if blocked:
		# Chứng từ mẫu cùng đợt đã bị xóa: tính lại trạng thái các đợt còn giữ.
		refresh_schedules(list(blocked))
	blocked_contracts = {r.contract for r in schedules if r.name in blocked}
	for r in schedules:
		if r.contract not in blocked_contracts:
			frappe.delete_doc("Payment Schedule", r.name, ignore_permissions=True, force=True)
			deleted["Payment Schedule"] += 1
	for name in contracts:
		if name in blocked_contracts:
			skipped["Contract"] += 1
		else:
			_delete("Contract", name)
			deleted["Contract"] += 1

	_delete_unused("Contract Customer", {"tax_code": ["like", f"{CUSTOMER_TAX_PREFIX}%"]}, deleted, skipped)
	_delete_unused("Contract Type", {"code": ["like", "MAU%"]}, deleted, skipped, prefix=TYPE_CODE_PREFIX)
	return _report("deleted", deleted, skipped)


def _delete_unused(doctype, filters, deleted, skipped, prefix=None):
	"""Không dùng force: bản ghi còn nơi dùng thì LinkExistsError và được giữ lại."""
	fieldname = next(iter(filters))
	for row in frappe.get_all(doctype, filters=filters, fields=["name", fieldname]):
		name = row.name
		if prefix and not (row.get(fieldname) or "").startswith(prefix):
			continue  # LIKE chỉ lọc thô ("_" khớp mọi ký tự); kiểm lại tiền tố chính xác bằng Python
		frappe.db.savepoint("demo_clear")
		try:
			frappe.delete_doc(doctype, name, ignore_permissions=True)
			deleted[doctype] += 1
		except frappe.LinkExistsError:
			frappe.db.rollback(save_point="demo_clear")
			skipped[doctype] += 1


def _report(verb, done, skipped):
	result = {
		verb: {dt: done.get(dt, 0) for dt in DOCTYPES},
		"skipped": {dt: skipped.get(dt, 0) for dt in DOCTYPES},
	}
	label = "tạo" if verb == "created" else "xóa"
	counts = result[verb]
	print(
		f"Đã {label} {counts['Contract']} hợp đồng, {counts['Payment Schedule']} đợt thu, "
		f"{counts['Sales Invoice Record']} hóa đơn, {counts['Payment Receipt']} phiếu thu, "
		f"{counts['Payment Request']} đề nghị thanh toán, {counts['Contract Customer']} khách hàng, "
		f"{counts['Contract Type']} loại hợp đồng; bỏ qua {result['skipped']['Contract']} hợp đồng."
	)
	return result
