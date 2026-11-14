"""Ticket #38: xóa hợp đồng (chọn nhiều), Admin chuyển về Nháp."""
import itertools
import json
import time

import runpy
import sys
from pathlib import Path

_d = runpy.run_path(str(Path(__file__).with_name("demo.py")))
activate, contract_doc, quarterly_items, run_method = (
    _d["activate"], _d["contract_doc"], _d["quarterly_items"], _d["run_method"])

_seq = itertools.count(int(time.time()) % 100000)
LIST = "/contracts/contracts"


def mk(t, active=False, items=None):
    no = f"E2E-{next(_seq)}"
    t.insert(contract_doc(t, no, items=items))
    if active:
        activate(t, no)
    return no


def status(t, no):
    r = t.get_list("Contract", {"name": no}, ["status"])
    return r[0]["status"] if r else None


def installments(t, no):
    return len(t.get_list("Payment Schedule", {"contract": no}))


def post(t, endpoint, /, **kw):
    """Gọi API như người dùng đang đăng nhập trên trình duyệt (bypass giao diện)."""
    t.page.goto(t.url(LIST))
    t.see("Hợp đồng")
    return t.page.evaluate(
        """async ([m, b]) => { const r = await fetch('/api/method/' + m, {method:'POST',
        headers:{'Content-Type':'application/json','X-Frappe-CSRF-Token': window.csrf_token || ''},
        body: JSON.stringify(b)}); return {status: r.status, body: await r.text()}; }""",
        [endpoint, kw])


def tick(t, no):
    t.page.get_by_label(f"Chọn hợp đồng {no}").check()


def test_xoa_3_nhap(t):
    """Chọn 3 hợp đồng Nháp, Xóa đã chọn, xác nhận: 'Đã xóa 3, bỏ qua 0', hết dòng được chọn."""
    t.login_as("Quản lý hợp đồng")
    nos = [mk(t) for _ in range(3)]
    t.page.goto(t.url(LIST))
    t.see(nos[0])
    for n in nos:
        tick(t, n)
    t.see("Đã chọn 3")
    t.step("Đã chọn 3")
    t.page.get_by_role("button", name="Xóa đã chọn").click()
    t.see("Xóa 3 hợp đồng?")
    t.step("Hộp thoại xác nhận")
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 3, bỏ qua 0")
    t.step("Kết quả")
    t.page.get_by_role("button", name="Đóng").click()
    for n in nos:
        assert status(t, n) is None, f"{n} vẫn còn"
    t.not_see("Đã chọn")


def test_xoa_hon_hop(t):
    """5 hợp đồng: 3 Nháp bị xóa, 2 Đang hiệu lực còn nguyên, liệt kê kèm lý do."""
    t.login_as("Quản lý hợp đồng")
    drafts = [mk(t) for _ in range(3)]
    act = [mk(t, True) for _ in range(2)]
    t.page.goto(t.url(LIST))
    t.see(act[0])
    for n in drafts + act:
        tick(t, n)
    t.page.get_by_role("button", name="Xóa đã chọn").click()
    t.see("Xóa 5 hợp đồng?")
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 3, bỏ qua 2")
    t.see("Chỉ xóa được hợp đồng ở trạng thái Nháp")
    t.step("Danh sách bỏ qua")
    for n in drafts:
        assert status(t, n) is None
    for n in act:
        assert status(t, n) == "Đang hiệu lực", f"{n} bị đổi"


def test_quan_ly_goi_api(t):
    """Vai Quản lý hợp đồng gọi delete_contracts cho hợp đồng Nháp: xóa được."""
    no = mk(t)
    t.login_as("Quản lý hợp đồng")
    r = post(t, "contract_tracker.api.delete_contracts", names=[no])
    assert r["status"] == 200, f"HTTP {r['status']}: {r['body'][:200]}"
    assert no in json.loads(r["body"])["message"]["deleted"]
    assert status(t, no) is None


def test_xem_khong_xoa(t):
    """Vai Xem hợp đồng: không thấy checkbox/nút xóa; gọi API trực tiếp bị từ chối."""
    no = mk(t)
    t.login_as("Xem hợp đồng")
    t.page.goto(t.url(LIST))
    t.see(no)
    assert t.page.get_by_label(f"Chọn hợp đồng {no}").count() == 0, "Vai Xem vẫn thấy checkbox"
    t.not_see("Xóa đã chọn")
    t.not_see("Chọn tất cả")
    t.step("Vai Xem không có ô chọn")
    t.page.get_by_text(no).first.click()
    t.not_see("Xóa hợp đồng")
    r = post(t, "contract_tracker.api.delete_contracts", names=[no])
    assert r["status"] in (401, 403), f"Server không từ chối (HTTP {r['status']})"
    assert status(t, no) == "Nháp", "Hợp đồng bị xóa"


def test_admin_khong_xoa_dang_hieu_luc(t):
    """Admin gọi xóa hợp đồng Đang hiệu lực: bị bỏ qua, không có ngoại lệ."""
    no = mk(t, True)
    r = t.call("contract_tracker.api.delete_contracts", names=[no])
    assert r["deleted"] == [], "Admin xóa được hợp đồng Đang hiệu lực"
    assert [s["name"] for s in r["skipped"]] == [no]
    assert "Chỉ xóa được hợp đồng ở trạng thái Nháp" in r["skipped"][0]["reason"]
    assert status(t, no) == "Đang hiệu lực"


def test_ve_nhap_4_dot_roi_xoa(t):
    """Admin bấm Chuyển về Nháp (4 đợt thu): thành Nháp, 4 đợt bị xóa, rồi xóa bằng nút."""
    no = mk(t, True, quarterly_items())
    assert installments(t, no) == 4, f"Sinh {installments(t, no)} đợt, cần 4"
    t.login()
    t.page.goto(t.url(LIST))
    t.see(no)
    t.page.get_by_text(no).first.click()
    t.page.get_by_role("button", name="Chuyển về Nháp").click()
    t.see("Các đợt thu chưa có hóa đơn hoặc tiền thu sẽ bị xóa")
    t.step("Xác nhận chuyển về Nháp")
    t.page.get_by_role("button", name="Chuyển về Nháp").last.click()
    t.see("Đã chuyển hợp đồng")
    t.step("Đã về Nháp")
    assert status(t, no) == "Nháp"
    assert installments(t, no) == 0, "Đợt thu chưa bị xóa"
    t.page.get_by_role("button", name="Xóa hợp đồng").click()
    t.see(f"Xóa hợp đồng {no}?")
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 1, bỏ qua 0")
    assert status(t, no) is None


def test_khong_phai_system_manager(t):
    """Quản lý hợp đồng (không phải System Manager): không thấy nút, server từ chối revert_to_draft."""
    no = mk(t, True)
    t.login_as("Quản lý hợp đồng")
    t.page.goto(t.url(LIST))
    t.see(no)
    t.page.get_by_text(no).first.click()
    t.see("Hạng mục")
    t.not_see("Chuyển về Nháp")
    t.step("Không có nút Chuyển về Nháp")
    doc = {"doctype": "Contract", "name": no}
    r = post(t, "run_doc_method", docs=json.dumps(doc), method="revert_to_draft")
    assert r["status"] >= 400, f"Server không từ chối (HTTP {r['status']})"
    assert status(t, no) == "Đang hiệu lực"


def test_tron_luong(t):
    """Kích hoạt → Về Nháp → Kích hoạt → Về Nháp → Xóa: đợt thu sinh lại cùng số tiền."""
    no = mk(t, True, quarterly_items())

    def snap():
        doc = t.api_get(f"/api/resource/Contract/{no}")["data"]
        rows = t.get_list("Payment Schedule", {"contract": no}, ["due_date", "total_amount"])
        return doc["total_after_tax"], sorted((r["due_date"], r["total_amount"]) for r in rows)

    first = snap()
    assert len(first[1]) == 4
    run_method(t, no, "revert_to_draft")
    assert status(t, no) == "Nháp" and installments(t, no) == 0
    activate(t, no)
    again = snap()
    assert again == first, f"Đợt thu sinh lại khác lần đầu: {again} vs {first}"
    run_method(t, no, "revert_to_draft")
    r = t.call("contract_tracker.api.delete_contracts", names=[no])
    assert r["deleted"] == [no], r


def test_panel_dong_khi_xoa(t):
    """Mở hợp đồng Nháp ở panel rồi chọn và xóa: panel đóng."""
    t.login_as("Quản lý hợp đồng")
    no = mk(t)
    t.page.goto(t.url(LIST))
    t.see(no)
    t.page.get_by_text(no).first.click()
    t.see("Xóa hợp đồng")
    tick(t, no)
    t.page.get_by_role("button", name="Xóa đã chọn").click()
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 1, bỏ qua 0")
    t.page.get_by_role("button", name="Đóng").click()
    t.not_see("Xóa hợp đồng")


def test_dien_thoai_thanh_chon(t):
    """390px: thanh thao tác chọn nhiều không làm trang cuộn ngang."""
    t.login_as("Quản lý hợp đồng")
    no = mk(t)
    t.mobile()
    t.page.goto(t.url(LIST))
    t.see(no)
    t.no_hscroll()
    tick(t, no)
    t.see("Đã chọn 1")
    t.no_hscroll()
    t.step("Thanh thao tác ở 390px")
