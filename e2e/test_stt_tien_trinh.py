"""Ticket #43: STT đợt thu, cột Tiến trình, xóa hợp đồng Đã hủy."""
import itertools
import json
import runpy
import time
from pathlib import Path

_d = runpy.run_path(str(Path(__file__).with_name("demo.py")))
activate, contract_doc, run_method = _d["activate"], _d["contract_doc"], _d["run_method"]

_seq = itertools.count(int(time.time()) % 100000 + 50000)
LIST = "/contracts/contracts"
PS = "/contracts/payment-schedules"
DATES = ["2027-01-15", "2027-02-15", "2027-03-15"]


def items(dates, acc=1, amount=11_000_000):
    return [{"item_name": f"Hạng mục {i}", "vat_rate": "8%", "billing_type": "Một lần", "amount": amount,
             "due_date": d, "requires_acceptance": acc} for i, d in enumerate(dates, 1)]


def mk(t, dates=("2027-02-01",), acc=1, active=True, start="2027-01-01"):
    no = f"E2E-{next(_seq)}"
    d = contract_doc(t, no, items=items(dates, acc))
    d["start_date"] = start
    t.insert(d)
    if active:
        activate(t, no)
    return no


def status(t, no):
    r = t.get_list("Contract", {"name": no}, ["status"])
    return r[0]["status"] if r else None


def post(t, endpoint, **kw):
    t.page.goto(t.url(LIST))
    t.see("Hợp đồng")
    return t.page.evaluate(
        """async ([m, b]) => { const r = await fetch('/api/method/' + m, {method:'POST',
        headers:{'Content-Type':'application/json','X-Frappe-CSRF-Token': window.csrf_token || ''},
        body: JSON.stringify(b)}); return {status: r.status, body: await r.text()}; }""",
        [endpoint, kw])


def cancelled(t):
    no = mk(t, active=False)
    run_method(t, no, "cancel_contract")
    assert status(t, no) == "Đã hủy", "Không hủy được hợp đồng để chuẩn bị dữ liệu"
    return no


def open_ps(t, no):
    """Mở màn Lịch thu, lọc theo số hợp đồng (ô lọc cột Số hợp đồng)."""
    t.page.goto(t.url(PS))
    t.see("Lịch thu tiền")
    t.page.get_by_label("Lọc theo Số hợp đồng").fill(no)
    t.see(no)


def open_schedule_tab(t, no):
    t.page.goto(t.url(f"/contracts/contracts/{no}/edit"))
    t.see("Hạng mục")
    t.page.get_by_text("Lịch thu", exact=True).first.click()


def set_schedule(t, contract, **values):
    """Chuẩn bị dữ liệu: đặt trạng thái đợt (trạng thái đợt do hệ thống tính khi có chứng từ)."""
    for s in t.get_list("Payment Schedule", {"contract": contract}):
        for k, v in values.items():
            t.call("frappe.client.set_value", doctype="Payment Schedule", name=s["name"], fieldname=k, value=v)


def row_texts(t, no):
    loc = t.page.locator("tr").filter(has_text=no)
    return [loc.nth(i).inner_text() for i in range(loc.count())]


def test_stt_man_lich_thu(t):
    """3 đợt 15/01, 15/02, 15/03/2027: màn Lịch thu hiện Đợt 1, 2, 3; hợp đồng khác đếm riêng từ Đợt 1."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, DATES)
    b = mk(t, ["2027-05-01"])
    open_ps(t, a)
    joined = "\n".join(row_texts(t, a))
    for n in (1, 2, 3):
        assert f"Đợt {n}" in joined, f"Thiếu 'Đợt {n}' ở các dòng của {a}"
    t.step("STT Đợt n của HD thứ nhất")
    t.page.get_by_label("Lọc theo Số hợp đồng").fill(b)
    t.see(b)
    assert "Đợt 1" in "\n".join(row_texts(t, b)), "Hợp đồng thứ hai không bắt đầu từ Đợt 1"
    t.step("STT Đợt n")


def test_stt_chi_tiet_hop_dong(t):
    """Chi tiết hợp đồng, tab Lịch thu: Đợt 1, Đợt 2, Đợt 3 và cột Tiến trình."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, DATES)
    open_schedule_tab(t, a)
    for n in (1, 2, 3):
        t.see(f"Đợt {n}")
    t.see("Tiến trình")
    t.see("Nghiệm thu")
    t.step("Tab Lịch thu")


def test_stt_giu_khi_loc_va_sap_xep(t):
    """Số đợt tính theo toàn bộ đợt của hợp đồng (API): 15/03 là Đợt 3; đảo thứ tự màn Lịch thu vẫn Đợt 1-3."""
    a = mk(t, DATES)
    sch = t.get_list("Payment Schedule", {"contract": a}, ["name", "due_date"])
    nums = t.call("contract_tracker.api.get_installment_numbers", contracts=[a])
    by_date = {s["due_date"]: nums[s["name"]] for s in sch}
    assert by_date == {"2027-01-15": 1, "2027-02-15": 2, "2027-03-15": 3}, by_date
    t.login_as("Quản lý hợp đồng")
    open_ps(t, a)
    hdr =t.page.get_by_text("Đến hạn", exact=False).first
    hdr.click()
    hdr.click()
    t.page.wait_for_timeout(800)
    joined = "\n".join(row_texts(t, a))
    for n in (1, 2, 3):
        assert f"Đợt {n}" in joined
    t.step("Sắp xếp ngược")


def test_tien_trinh_4_buoc(t):
    """Đợt cần nghiệm thu, mọi bước chưa xong: 4 bước, Nghiệm thu là bước hiện tại, không có Quá hạn."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, ["2027-04-01"], acc=1)
    open_ps(t, a)
    tl = t.page.locator("tr").filter(has_text=a).first.locator("ol[aria-label='Tiến trình đợt thu']")
    assert tl.count() == 1, "Không thấy cột Tiến trình"
    assert tl.locator("li").count() == 4, "Cần 4 bước"
    cur = tl.locator("li[aria-current='step']")
    assert cur.count() == 1 and "Nghiệm thu" in cur.first.inner_text(), "Nghiệm thu phải là bước hiện tại"
    txt = tl.inner_text()
    for w in ("Nghiệm thu", "Đề nghị", "Hóa đơn", "Thanh toán", "Chưa lập", "Chưa xuất", "Chưa thu"):
        assert w in txt, f"Thiếu '{w}' trong Tiến trình"
    assert "Quá hạn" not in txt, "Đợt chưa quá hạn không được có nhãn"
    t.step("Tiến trình 4 bước")


def test_tien_trinh_thu_mot_phan(t):
    """Đợt 33.000.000 đã thu 20.000.000, đã xuất hóa đơn, đã lập đề nghị: Đề nghị, Hóa đơn xong; Thanh toán 'Thu một phần'."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, ["2027-04-01"], acc=0)
    set_schedule(t, a, total_amount=33_000_000, paid_amount=20_000_000, payment_status="Thu một phần",
                 invoice_status="Đã xuất", request_status="Đã lập")
    open_ps(t, a)
    tl = t.page.locator("tr").filter(has_text=a).first.locator("ol[aria-label='Tiến trình đợt thu']")
    assert tl.locator("li").count() == 3
    txt = tl.inner_text()
    assert "Đề nghị: Đã lập" in txt and "Hóa đơn: Đã xuất" in txt, txt
    assert "Thanh toán: Thu một phần" in txt and "20.000.000" in txt, txt
    cur = tl.locator("li[aria-current='step']")
    assert cur.count() == 1 and "Thanh toán" in cur.first.inner_text()
    assert tl.locator("[class*=lucide-circle-check]").count() == 2, "Hai bước xong phải có biểu tượng tích"
    assert tl.locator("[class*=lucide-circle-dot]").count() == 1, "Bước đang dở phải có biểu tượng riêng"
    t.step("Thu một phần")


def test_tien_trinh_3_buoc_va_qua_han(t):
    """Đợt không cần nghiệm thu: 3 bước; đợt quá hạn có nhãn Quá hạn ở cuối dải."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, ["2020-01-10"], acc=0, start="2020-01-01")
    set_schedule(t, a, is_overdue=1)
    open_ps(t, a)
    tl = t.page.locator("tr").filter(has_text=a).first.locator("ol[aria-label='Tiến trình đợt thu']")
    assert "Nghiệm thu" not in tl.inner_text(), "Đợt không cần nghiệm thu vẫn có bước Nghiệm thu"
    assert tl.locator("li").count() == 4, "Cần 3 bước + nhãn Quá hạn"
    assert "Quá hạn" in tl.locator("li").last.inner_text()
    t.step("3 bước + Quá hạn")


SCROLL_ANCESTOR = """el => { for (let p = el.parentElement; p; p = p.parentElement) {
  const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return p.clientWidth < 600; }
  return false; }"""


def test_dien_thoai_man_lich_thu(t):
    """390px, màn Lịch thu: cột Tiến trình nằm trong khung bảng tự cuộn ngang (không nở rộng cả trang)."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, DATES)
    t.mobile()
    open_ps(t, a)
    ol = t.page.locator("ol[aria-label='Tiến trình đợt thu']").first
    assert ol.evaluate(SCROLL_ANCESTOR), "Tiến trình không nằm trong khung cuộn ngang hẹp"
    t.step("Lịch thu 390px")
    # Trang tổng thể còn rộng do thanh nút thao tác của màn Lịch thu (có từ trước ticket, mục H2); không tính vào ticket này.
    assert t.page.evaluate("document.querySelector(\"ol[aria-label='Tiến trình đợt thu']\").getBoundingClientRect().width") > 300


def test_dien_thoai_tab_lich_thu(t):
    """390px, tab Lịch thu của hợp đồng: trang không cuộn ngang, có Đợt 1 và cột Tiến trình."""
    t.login_as("Quản lý hợp đồng")
    a = mk(t, DATES)
    t.mobile()
    open_schedule_tab(t, a)
    t.see("Đợt 1")
    t.see("Tiến trình")
    t.step("Tab Lịch thu 390px")
    # Bảng nằm trong khung tự cuộn; trang không rộng hơn các trang khác của bộ chuẩn (min-width của khung chung, mục H2).
    wide = t.page.evaluate("document.documentElement.scrollWidth")
    t.page.goto(t.url("/contracts/contract-types"))
    t.see("Loại hợp đồng")
    base = t.page.evaluate("document.documentElement.scrollWidth")
    assert wide <= base + 2, f"Trang chi tiết hợp đồng rộng {wide}px, hơn trang chuẩn {base}px"
    t.page.goto(t.url(f"/contracts/contracts/{a}/edit"))
    t.page.get_by_text("Lịch thu", exact=True).first.click()
    t.see("Đợt 1")
    ol = t.page.locator("ol[aria-label='Tiến trình đợt thu']").first
    assert ol.evaluate(SCROLL_ANCESTOR), "Tiến trình không nằm trong khung cuộn ngang hẹp"


def test_xoa_da_huy_bang_chon(t):
    """Hợp đồng Đã hủy: chọn, Xóa đã chọn, xác nhận: 'Đã xóa 1, bỏ qua 0'."""
    t.login_as("Quản lý hợp đồng")
    no = cancelled(t)
    t.page.goto(t.url(LIST))
    t.see(no)
    t.page.get_by_label(f"Chọn hợp đồng {no}").check()
    t.page.get_by_role("button", name="Xóa đã chọn").click()
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 1, bỏ qua 0")
    t.step("Đã xóa")
    assert status(t, no) is None


def test_xoa_hon_hop_co_da_huy(t):
    """5 hợp đồng (2 Nháp, 1 Đã hủy, 2 Đang hiệu lực): 'Đã xóa 3, bỏ qua 2' kèm lý do."""
    t.login_as("Quản lý hợp đồng")
    drafts = [mk(t, active=False) for _ in range(2)]
    c = cancelled(t)
    act = [mk(t) for _ in range(2)]
    t.page.goto(t.url(LIST))
    t.see(act[0])
    for n in drafts + [c] + act:
        t.page.get_by_label(f"Chọn hợp đồng {n}").check()
    t.page.get_by_role("button", name="Xóa đã chọn").click()
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 3, bỏ qua 2")
    t.see("Chỉ xóa được hợp đồng ở trạng thái Nháp hoặc Đã hủy")
    t.step("Kết quả hỗn hợp")
    for n in drafts + [c]:
        assert status(t, n) is None
    for n in act:
        assert status(t, n) == "Đang hiệu lực"


def test_nut_xoa_panel_theo_trang_thai(t):
    """Panel: hợp đồng Đã hủy có nút 'Xóa hợp đồng' (xóa được); Đang hiệu lực thì không có."""
    t.login_as("Quản lý hợp đồng")
    c = cancelled(t)
    act = mk(t)
    t.page.goto(t.url(LIST))
    t.see(c)
    t.page.get_by_text(c).first.click()
    t.see("Xóa hợp đồng")
    t.step("Đã hủy có nút Xóa")
    t.page.get_by_role("button", name="Xóa hợp đồng").click()
    t.see(f"Xóa hợp đồng {c}?")
    t.page.get_by_role("button", name="Xóa", exact=True).click()
    t.see("Đã xóa 1, bỏ qua 0")
    assert status(t, c) is None
    t.page.goto(t.url(LIST))
    t.see(act)
    t.page.get_by_text(act).first.click()
    t.see("Hạng mục")
    t.not_see("Xóa hợp đồng")


def test_xem_khong_xoa_da_huy(t):
    """Vai Xem hợp đồng: không thấy nút xóa; gọi delete_contracts cho hợp đồng Đã hủy bị từ chối, còn nguyên."""
    c = cancelled(t)
    t.login_as("Xem hợp đồng")
    t.page.goto(t.url(LIST))
    t.see(c)
    t.page.get_by_text(c).first.click()
    t.not_see("Xóa hợp đồng")
    r = post(t, "contract_tracker.api.delete_contracts", names=[c])
    assert r["status"] in (401, 403), f"Server không từ chối (HTTP {r['status']})"
    assert status(t, c) == "Đã hủy"


def test_quan_ly_xoa_da_huy_api(t):
    """Vai Quản lý hợp đồng gọi delete_contracts cho hợp đồng Đã hủy: xóa được."""
    c = cancelled(t)
    t.login_as("Quản lý hợp đồng")
    r = post(t, "contract_tracker.api.delete_contracts", names=[c])
    assert r["status"] == 200, r["body"][:200]
    assert c in json.loads(r["body"])["message"]["deleted"]
    assert status(t, c) is None


def test_xoa_truc_tiep_dang_hieu_luc_bi_chan(t):
    """Xóa trực tiếp hợp đồng Đang hiệu lực: bị on_trash chặn với câu mới."""
    no = mk(t)
    r = t._api.post(t.url("/api/method/frappe.client.delete"),
                    data=json.dumps({"doctype": "Contract", "name": no}),
                    headers={"Content-Type": "application/json"})
    assert not r.ok, "Xóa được hợp đồng Đang hiệu lực"
    assert "Chỉ xóa được hợp đồng ở trạng thái Nháp hoặc Đã hủy." in r.text()
    assert status(t, no) == "Đang hiệu lực"
