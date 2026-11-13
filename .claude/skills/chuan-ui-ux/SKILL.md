---
name: chuan-ui-ux
description: Chuẩn UI/UX nội bộ cho giao diện Vue (Frappe UI) trong frontend/ - bố cục split layout, bảng danh sách chuẩn, form chuẩn, kiểm tra dữ liệu, thông báo. Đọc trước khi tạo hoặc sửa bất kỳ màn hình nào trong frontend/, và khi review giao diện.
---

# Làm màn hình theo chuẩn UI/UX

Giao diện người dùng nằm trong `frontend/` (Vue 3 + frappe-ui 1.0.2), phục vụ ở `/contracts`.
Chuẩn đã được đóng thành thành phần trong `frontend/src/standard/` (thư mục bảo vệ, không sửa).
Làm màn hình mới = ghép các thành phần đó theo mẫu `frontend/src/pages/contract-types/`.

Cách viết component frappe-ui (Button, Dialog, toast, useList...) xem skill `frappe-ui`.
Khi hai skill khác nhau, skill này thắng.

## 1. Cấu trúc

```
frontend/src/
  standard/            bộ thành phần chuẩn (BẢO VỆ - không sửa, không chép ra sửa lại)
  pages/<man-hinh>/    mỗi màn hình một thư mục, tên tiếng Anh gạch ngang (contracts, contract-payments)
    <Ten>List.vue      màn danh sách
    <Ten>Form.vue      màn thêm mới / cập nhật (dùng chung, có prop name khi sửa)
    <ten>.ts           logic không giao diện: cột, trạng thái, quy tắc kiểm tra, bộ lọc gửi server
    <ten>.test.ts      test cho <ten>.ts (bắt buộc)
  menu.ts              menu chính: thêm 1 mục cho màn hình mới
  router.ts            thêm route: /<man-hinh>, /<man-hinh>/new, /<man-hinh>/:name/edit
  types/doctypes.ts    SINH TỰ ĐỘNG từ JSON DocType khi chạy verify - không sửa tay, import kiểu từ đây
```

Ảnh chụp cho người duyệt: `/contracts/<man-hinh>` và `/contracts/<man-hinh>/new`.

## 2. Thành phần chuẩn (import từ `@/standard`)

| Thành phần | Dùng cho | Điểm chính |
|---|---|---|
| `SplitLayout` | khung màn danh sách | slot `#group` (cây), `#filters` (ô lọc), mặc định (vùng phải); emit `search` (nút Tìm kiếm/Enter). Người dùng kéo mép panel trái để giãn 220-480px, hoặc thu gọn cả panel (nút ở tiêu đề panel) |
| `GroupTree` | "Truy vấn nhóm" | `:nodes` (TreeNode[] có `count`, `title` = chữ đầy đủ khi rê chuột), `v-model` = key nút lá đang chọn, `:default-expanded` = các nút mở sẵn (ví dụ năm hiện tại: `['y:2026']`; không truyền thì mở hết). Có sẵn nút Mở rộng/Thu gọn tất cả. Nhiều cấp được (ví dụ Năm → Tháng → Khách hàng → Chứng từ); mỗi cấp một icon và `tone` riêng để nhìn là biết cấp (Năm: `lucide-calendar-range` blue + `strong`, Tháng: `lucide-calendar-days` violet, Đối tác: `lucide-building-2` amber, Chứng từ: `lucide-file-text` gray); nhãn trên cây viết ngắn (bỏ "Công ty TNHH/CP", nút lá chỉ ghi số chứng từ), chữ đầy đủ để ở `title` |
| `PageTitle` | tiêu đề trang | `title`, `count`; slot `#actions`: nút Xuất Excel (outline) rồi nút chính |
| `StatCards` | dải số liệu (các ô chung một khung) | `:cards` (StatCard[]), `compact` (chữ nhỏ, dùng trong `DetailPanel #aside`), `v-model:active` = ô trạng thái đang lọc. StatCard: `tone` (green = tốt như đã thu, amber = cần chú ý như còn phải thu, red = quá hạn), `hint` (dòng phụ), `progress` (0-100, thanh tiến độ) |
| `DataTable` | bảng danh sách, thao tác như Excel | `:columns` (Column[]), `:rows`, `v-model:selected`, `:loading`, `:external-filter-active`; slot `#cell-<key>`; ref `exportExcel(tenFile)`. Người dùng tự kéo giãn cột, khóa cột trái/phải (menu ⋮ ở tiêu đề), chọn chiều cao dòng, kẻ ô dọc; chọn vùng ô và Ctrl+C dán sang Excel, phím tắt như Excel (mũi tên, Shift, Ctrl+A, PageUp/Down, Enter mở chi tiết); thiết lập tự lưu theo từng bảng. Trang KHÔNG tự làm các việc này, không chặn phím trong bảng |
| `DetailPanel` | chi tiết dòng chọn, dưới bảng | `title`, `:fields` (DetailField[]; trống tự hiện "Không có"); slot `#badge` (StatusBadge cạnh tiêu đề), `#actions` (nút "Cập nhật", quick action), `#aside` (khối bên phải, ví dụ `StatCards` tóm tắt tiền), mặc định (bảng phụ) |
| `MiniTable` | bảng phụ nhỏ (lịch sử, dòng con trong chi tiết) | `:columns`, `:rows`, `:totals` (dòng Tổng: giá trị theo key cột, cột đầu là nhãn) |
| `FormPage` | khung form | `title`, `back-to`, `:dirty`; emit `submit`; slot `#actions` (nút chính), `#summary` (số tổng cập nhật khi nhập, ở thanh đáy); ref `allowLeave()` sau khi lưu |
| `FormSection` | nhóm ô trong form | `title`, `muted` (vùng phụ nền xám), `:columns` 1-4 (ô ngắn dùng 4); ô rộng hơn đặt `class="col-span-2"` lên FnField |
| `LineItems` | bảng nhập nhiều dòng trong form (hạng mục, dòng chi tiết) | `:columns` (LineColumn[]: `key`, `label`, `width` kiểu lưới CSS, `align`, `required`, `readonly` = cột tự tính), `:rows`, `add-label`, `:totals`; emit `add`, `remove(index)`; slot `#cell-<key>` (đặt `FnField hide-label`), `#extra` (ô phụ của dòng, hiện ngay dưới dòng) |
| `FnField` | MỌI ô nhập | `field`, `label`, `type` (text, number, currency, date, select, textarea, checkbox), `required`, `:error`, `hint`, `unit`, `:options`, `hide-label` (chỉ trong `LineItems`: tiêu đề cột là nhãn); emit `blur` |
| `PrimaryButton` | nút chính (màu chủ đạo) | như `Button` của frappe-ui; mỗi màn hình MỘT nút chính |
| `StatusBadge` | trạng thái | `:status` (StatusDef: label + icon + tone) |

Hàm: `formatDate`, `formatDateTime`, `formatNumber`, `formatCurrency`, `maskSensitive`,
`useFormValidation`, `serverErrorMessage`, `COMMON_STATUS`, `validateMenu`.

### Khai báo cột (`Column`)

```ts
{ key: '_index', label: 'STT', width: 56, type: 'index', pin: 'left' },
{ key: 'contract_no', label: 'Số hợp đồng', width: 150, pin: 'left', required: true },
{ key: 'party', label: 'Đối tác', width: 260 },
{ key: 'amount', label: 'Giá trị (VND)', width: 160, type: 'currency', sum: true },
{ key: 'status', label: 'Trạng thái', width: 150, type: 'status', status: statusOf, filter: 'select', options: [...] },
{ key: 'end_date', label: 'Ngày hết hạn', width: 120, type: 'date' },
{ key: '_actions', label: 'Thao tác', width: 110, pin: 'right', sortable: false, filter: 'none', required: true },
```

- Mọi cột có `width` (px) hợp với nội dung: STT hẹp, tên rộng, ngày 120, tiền 140-170.
- Tổng `width` các cột hiện mặc định không vượt khoảng 1.300px (màn 1600px không có thanh cuộn ngang). Cột quan trọng
  (trạng thái, tiền) để trong tầm nhìn; cột ít dùng `hidden: true`. Hai thông tin liên quan gộp một cột 2 dòng qua slot
  `#cell-<key>` (dòng trên chữ chính, dòng dưới `text-sm text-ink-gray-5`), ví dụ "Khách hàng / Nội dung", "Hiệu lực".
- Ghim trái cột STT và cột mã/số; ghim phải cột Thao tác.
- Cột số cùng đơn vị đặt `sum: true` thì bảng tự có dòng Tổng (tính trên dữ liệu đã lọc). Đơn vị ghi trong tiêu đề.
- Cột ít dùng đặt `hidden: true` (người dùng bật lại bằng nút "Cột").
- Tiêu đề 2 cấp: các cột liền nhau cùng `group` được gộp ô tiêu đề cấp 1, ví dụ
  `{ key: 'start_date', label: 'Từ ngày', group: 'Hiệu lực' }, { key: 'end_date', label: 'Đến ngày', group: 'Hiệu lực' }`,
  hoặc nhóm "Giá trị (VND)" gồm Trước thuế/Thuế/Sau thuế. Cột không có `group` để nguyên. Dùng khi có từ 2 cột cùng chủ đề.
- `pin` trong khai báo là khóa MẶC ĐỊNH (STT, mã bên trái; Thao tác bên phải); người dùng đổi được bằng menu ⋮.
  `minWidth` (px) là độ rộng nhỏ nhất khi kéo, mặc định 48.
- Dữ liệu nhạy cảm (điện thoại, CCCD, số tài khoản): `format: (r) => maskSensitive(r.phone)`.

## 3. Công thức màn danh sách (theo `ContractTypeList.vue`)

1. `<ten>.ts`: `COLUMNS`, `statusOf`, `groupTree(rows)`, `PanelFilters` + `emptyFilters()` + `toFrappeFilters()` + `filtersActive()`.
2. Hai bộ lọc: `draft` (đang nhập ở panel) và `applied` (đã áp dụng). Chỉ chép draft sang applied khi `@search`.
3. Dữ liệu: `useList({ doctype, fields, filters: () => toFrappeFilters(applied.value), orderBy: 'modified desc', limit: 5000 })`.
   Lọc chính ở server (panel trái); lọc theo cột và sắp xếp ở bảng (client). Hơn 5000 dòng: báo người giao việc.
4. Thứ tự vùng phải: `PageTitle` → `StatCards` → thông báo lỗi tải (nếu có, kèm "Thử lại") → `DataTable` → `DetailPanel`.
5. Thẻ số liệu tính trên dữ liệu đã lọc; thẻ trạng thái bấm được để lọc (`v-model:active`).
6. Chọn dòng đồng bộ với `?selected=` để quay lại từ form thì dòng vừa lưu được chọn sẵn.
7. Chi tiết dòng hiện ngay dưới bảng, có nút "Cập nhật" (quick action sang form) và lịch sử liên quan (`MiniTable`).
8. Nút trên dòng (Sửa...) dùng slot `#cell-_actions`, thêm `@click.stop` để không chọn dòng.

Truy vấn nhóm của màn chứng từ (hợp đồng, đề nghị thanh toán, hóa đơn, phiếu thu...): cây Năm → Tháng → Đối tác → Chứng từ,
năm mới nhất trên, mặc định mở năm hiện tại; trạng thái lọc bằng thẻ số liệu và ô ở truy vấn chi tiết, không đưa vào cây.
Truy vấn chi tiết: đủ các trường người dùng hay tìm (mã/số, đối tác, loại, trạng thái, người phụ trách, khoảng ngày "từ - đến"
đặt 2 ô cạnh nhau trong `div class="grid grid-cols-2 gap-2"`, khoảng tiền, các ô tích điều kiện nghiệp vụ).

Dữ liệu có nhiều loại với trường khác nhau: ô lọc đầu tiên là "Loại" dạng checkbox kèm số lượng,
"Chọn tất cả"/"Bỏ chọn hết", mặc định tích loại đầu, luôn giữ ít nhất 1 loại; trường riêng của loại chỉ
hiện khi tích đúng 1 loại; bảng gộp cột riêng thành "Thông tin chính" khi tích nhiều loại. Không chia tab.

## 4. Công thức form (theo `ContractTypeForm.vue`)

1. Form hơn 5 ô làm trang riêng với `FormPage`, không làm popup. Popup (`Dialog` của frappe-ui) chỉ cho
   xác nhận, thông báo, form dưới 5 ô; không popup chồng popup.
2. Chia nhóm bằng `FormSection`: "Thông tin chung" trước (nền trắng), vùng phụ `muted`. Không tô xám cả form.
   Các `FormSection` đặt thẳng trong `FormPage` (hoặc bọc trong `div class="space-y-4"`); không bọc bằng `class="contents"`
   (mất khoảng cách giữa các khối). Dữ liệu dạng dòng (hạng mục, chi tiết) nhập bằng `LineItems`, không làm mỗi dòng một khung.
   Form có số tiền: tổng cập nhật ngay ở slot `#summary` của `FormPage`.
3. Mỗi ô là `FnField` với `field` = tên trường (để focus ô lỗi). Nhãn là danh từ, không dùng placeholder thay nhãn.
4. Quy tắc kiểm tra khai báo trong `<ten>.ts` (`Rules<Form>`), trùng với kiểm tra ở controller Python.
   `useFormValidation(form, RULES)`; `@blur` gọi `validateField`; lưu thì `validateAll()` trước, sai thì DỪNG
   (không gửi request), không xóa ô đã hợp lệ.
5. Lưu: `useDoctype(DOCTYPE).insert.submit(payload)` hoặc `.setValue.submit({ name, ...payload })`.
   Nút chính `PrimaryButton type="submit"` có `:loading` và `:disabled` khi đang lưu (chống bấm hai lần).
6. Thành công: `toast.success('Đã thêm hợp đồng HD-...')`, gọi `allowLeave()`, quay về danh sách với `?selected=`.
   Thất bại: `Alert theme="red"` trên đầu form với `serverErrorMessage(err)` + `toast.error`.
7. `:dirty` = form khác dữ liệu đã lưu; `FormPage` tự hỏi xác nhận khi rời trang.
8. Trường không được sửa sau khi tạo (`set_only_once`): `:disabled="isEdit"` và `hint` giải thích.
9. Bảng nhập nhiều dòng (dòng con): luôn có sẵn 1 dòng trống.

## 5. Quy tắc bắt buộc

Tự động kiểm (`scripts/check_ui.py` trong verify, sai là verify thất bại):
- UI01 không dùng `<input>`, `<select>`, `<textarea>` trong trang: dùng `FnField`.
- UI02 không tự vẽ `<table>`: `DataTable` hoặc `MiniTable`.
- UI03, UI04, UI07 không dùng màu Tailwind thô (`bg-red-500`), mã màu, màu inline: dùng token (`text-ink-gray-7`, `bg-surface-gray-1`, `border-outline-gray-2`) hoặc lớp `fn-*`.
- UI05 không `alert/confirm/prompt`: dùng `dialog.confirm` / `toast` của frappe-ui.
- UI06 nhãn nút tiếng Việt, động từ cụ thể: "Lưu", "Trình ký", "Thêm hợp đồng", "Xuất Excel" (không "Submit", "OK").
- UI08 không để `console.log`.
- UI09 không import TextInput, Textarea, FormControl, Select, Combobox, DatePicker, Checkbox, ListView từ frappe-ui trong trang.
- Menu: tối đa 9 mục cấp 1, tối đa 3 cấp (test `menu.test.ts`). Mục cùng nhóm đặt `group` (ví dụ "Chứng từ") và nằm liền nhau.

Người duyệt kiểm (làm đúng ngay từ đầu):
1. Không ngõ cụt: trang nào cũng có đường quay lại; thao tác chính không quá 3 lần bấm từ trang chủ.
2. Nút: trung tính bên trái ("Hủy"), nút chính bên phải; một nút chính mỗi màn hình; vị trí, màu, kiểu nút giống mọi màn hình khác.
3. Hành động nguy hiểm (xóa, từ chối, phê duyệt, hủy hợp đồng): `dialog.confirm` nêu rõ đối tượng bị tác động
   ("Xóa hợp đồng HD-2026-00012?"), `theme: 'red'`, nút xác nhận là động từ cụ thể.
4. Mọi thao tác báo kết quả (toast thành công, Alert/toast thất bại). Việc mất hơn 1 giây có `:loading`.
5. Màu đỏ chỉ cho lỗi, từ chối, quá hạn. Trạng thái luôn có icon + chữ (`StatusBadge`), không chỉ màu.
6. Chữ tiếng Việt có dấu, câu ngắn. Ngày `DD/MM/YYYY`, tiền `1.234.567` và đơn vị trong nhãn.
7. Không cuộn ngang cả trang (bảng được cuộn ngang trong khung của nó).
8. Thông báo trống có hướng dẫn tiếp ("Chưa có hợp đồng. Bấm Thêm hợp đồng để tạo.").

Chi tiết từng luật (mã BB_xxx bắt buộc, LT_xxx nên có): `references/checklist-giai-phap.md` (bố cục, form,
bảng, menu, popup), `references/checklist-do-hoa.md` (màu, chữ, icon), `references/checklist-coding.md`
(hành vi: kiểm tra dữ liệu, bàn phím, thông báo, phiên làm việc). Chỉ mở file cần cho việc đang làm.

## 6. Test

`<ten>.test.ts` cho mọi hàm trong `<ten>.ts`: quy tắc kiểm tra (đúng và từng trường hợp sai), đổi bộ lọc
sang filters Frappe, chuẩn hóa payload, tính toán (tổng, số ngày còn lại...). Test chạy bằng vitest trong verify.
Không test bằng cách gọi server.

## 7. Khi chuẩn chưa có thứ cần dùng

Không tự viết lại thành phần tương tự trong trang và không lách quy tắc. Dùng thành phần gần nhất, ghi rõ
trong báo cáo cuối: "Cần bổ sung vào chuẩn: ...". Người duyệt sẽ quyết định bổ sung `src/standard/`.

## 8. Tự kiểm trước khi báo xong

- [ ] `bash scripts/verify.sh` qua (có thể chạy `bash scripts/verify.sh frontend` khi đang sửa giao diện).
- [ ] Màn mới có trong `menu.ts` và `router.ts`; đường dẫn ảnh chụp `/contracts/<man-hinh>` có trong báo cáo.
- [ ] Danh sách: panel trái đủ hai nhóm, nút Tìm kiếm; tiêu đề có số lượng, Xuất Excel, nút thêm mới; thẻ số liệu; cột có độ rộng, cột ghim; dòng Tổng nếu có cột tiền/số lượng; chi tiết dưới bảng có nút Cập nhật.
- [ ] Form: nhóm rõ ràng, trường bắt buộc có `required`, quy tắc trùng với Python, lưu xong quay về danh sách chọn sẵn dòng mới.
- [ ] Nhãn, thông báo, nút đều tiếng Việt có dấu; không còn chữ tiếng Anh hiện ra cho người dùng.
