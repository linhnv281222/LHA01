"""Dữ liệu mẫu cho ticket #38: hợp đồng Nháp để thử xóa nhiều, hợp đồng Đang hiệu lực để thử Chuyển về Nháp."""
import json

CUSTOMER_NAME = "Công ty Demo Xóa HĐ"


def customer(t):
    return t.ensure({"doctype": "Contract Customer", "customer_name": CUSTOMER_NAME},
                    key=["customer_name"])["name"]


def contract_doc(t, no, amount=5_000_000, items=None):
    return {
        "doctype": "Contract", "contract_no": no, "customer": customer(t),
        "start_date": "2027-01-01", "end_date": "2027-12-31",
        "items": items or [{"item_name": "Đào tạo", "vat_rate": "8%", "billing_type": "Một lần",
                            "amount": amount, "due_date": "2027-02-01"}],
    }


def quarterly_items():
    return [{"item_name": "License", "vat_rate": "Không chịu thuế", "billing_type": "Định kỳ",
             "unit_price": 15_000_000, "period": "Quý", "period_start": "2027-01-01",
             "period_end": "2027-12-31", "requires_acceptance": 0}]


def run_method(t, name, method):
    doc = t.api_get(f"/api/resource/Contract/{name}")["data"]
    r = t._api.post(t.url("/api/method/run_doc_method"),
                    data=json.dumps({"docs": json.dumps(doc), "method": method}),
                    headers={"Content-Type": "application/json"})
    assert r.ok, f"{method} {name}: HTTP {r.status} {r.text()[:300]}"


def activate(t, name):
    run_method(t, name, "activate")


def seed(t):
    for i in range(1, 6):
        t.ensure(contract_doc(t, f"DEMO-NHAP-{i}", i * 1_000_000), key=["contract_no"])
    # Đang hiệu lực, 4 đợt thu (Quý), chưa chứng từ: Admin thử Chuyển về Nháp
    r = t.ensure(contract_doc(t, "DEMO-HIEULUC-1", items=quarterly_items()), key=["contract_no"])
    if t.get_list("Contract", {"name": r["name"]}, ["status"])[0]["status"] == "Nháp":
        activate(t, r["name"])
