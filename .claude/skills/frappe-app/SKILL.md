---
name: frappe-app
description: Cách viết DocType, controller, test, báo cáo, tác vụ định kỳ và bản dịch trong custom app Frappe v16 này. Đọc trước khi tạo hoặc sửa DocType, report, hooks hay patch.
---

# Viết mã trong custom app Frappe v16

Repo là thư mục app. Mọi thay đổi là file trong repo; không tạo DocType qua giao diện hay API.
Kiểm tra bằng `bash scripts/verify.sh` (migrate + test trên bench test). Lỗi JSON hiện ở bước migrate.

## 1. Tạo DocType mới

Tên DocType tiếng Anh, viết hoa chữ đầu mỗi từ, ví dụ `Contract`, `Contract Payment`.
Thư mục = tên viết thường, khoảng trắng thành `_`: `contract_tracker/contract_tracker/doctype/contract_payment/`.

Năm file bắt buộc:

| File | Nội dung |
|---|---|
| `__init__.py` | để trống |
| `<ten>.json` | định nghĩa DocType (xem dưới) |
| `<ten>.py` | `class ContractPayment(Document)`: tên lớp là tên DocType bỏ khoảng trắng |
| `<ten>.js` | script form; để khung trống như `contract_type.js` nếu chưa cần |
| `test_<ten>.py` | test, theo mẫu `test_contract_type.py` |

### File JSON

Chép `contract_type.json` làm khung rồi sửa. Các khóa phải có:

- `"doctype": "DocType"`, `"name"`, `"module": "Contract Tracker"`, `"custom": 0`, `"engine": "InnoDB"`.
- `"fields"`: mỗi trường có `fieldname` (snake_case tiếng Anh), `fieldtype`, `label` (tiếng Việt có dấu).
- `"field_order"`: liệt kê đủ mọi `fieldname`, đúng thứ tự hiển thị. Thiếu là trường bị đặt lung tung.
- `"permissions"`: ít nhất một dòng cho `System Manager` như mẫu.
- `"modified"`: khi sửa một file JSON đã có, tăng giá trị này lên thời điểm mới hơn.
- Bỏ các khóa `owner`, `creation`, `modified_by` cũng được; giữ nguyên nếu chép từ mẫu.

Kiểu trường hay dùng:

| Nhu cầu | `fieldtype` | Lưu ý |
|---|---|---|
| Chữ ngắn | `Data` | `length` nếu cần giới hạn |
| Chữ dài | `Small Text`, `Text Editor` | |
| Số tiền | `Currency` | |
| Số | `Int`, `Float`, `Percent` | |
| Ngày | `Date`, `Datetime` | |
| Chọn từ danh sách cố định | `Select` | `options`: các giá trị cách nhau bằng `\n`, giá trị tiếng Việt được |
| Tham chiếu DocType khác | `Link` | `options`: tên DocType đích |
| Bảng con | `Table` | `options`: tên DocType con (DocType con có `"istable": 1`, `"permissions": []`) |
| Có/không | `Check` | `default` là chuỗi `"0"` hoặc `"1"` |
| Đính kèm | `Attach` | |
| Bố cục | `Section Break`, `Column Break`, `Tab Break` | không có `label` cũng được |

Thuộc tính trường hay dùng: `reqd`, `unique`, `default`, `read_only`, `set_only_once`, `in_list_view`,
`in_standard_filter`, `description`, `depends_on` (ví dụ `"eval:doc.status=='Đã ký'"`).

### Đặt tên bản ghi

- Theo một trường mã: `"autoname": "field:code"`, `"naming_rule": "By fieldname"` (như mẫu).
- Số tự tăng theo năm: `"autoname": "HD-.YYYY.-.#####"`, `"naming_rule": "Expression"`.
  Không dùng dạng `format:...` (Frappe v16 đã khuyến cáo bỏ).

## 2. Controller

- Chuẩn hóa dữ liệu trong `before_insert` nếu trường đó dùng để đặt tên (tên được đặt ngay sau
  `before_insert`, trước `validate`); chuẩn hóa thêm trong `validate` cho lần sửa.
- Kiểm tra quy tắc nghiệp vụ trong `validate`, báo lỗi bằng `frappe.throw(_("..."))`.
- Trường `reqd` do Frappe tự kiểm tra (báo `MandatoryError`); không kiểm tra lại trong `validate`,
  vì `validate` chạy trước và sẽ báo sai loại lỗi.
- Tính toán số liệu (tổng tiền, số ngày còn lại) trong `validate`, không tính ở `.js`.
- Đọc dữ liệu: `frappe.get_all(doctype, filters={...}, fields=[...])`, `frappe.db.get_value(...)`,
  `frappe.db.exists(...)`. Không viết SQL nối chuỗi.
- Ngày giờ: `frappe.utils.today()`, `getdate()`, `add_days()`, `date_diff()`; không dùng `datetime.now()`.

## 3. Test

- Đặt cạnh DocType: `test_<ten>.py`, lớp kế thừa `frappe.tests.IntegrationTestCase`.
- Mỗi test chạy trong transaction và được rollback; không cần tự xóa dữ liệu.
- Viết hàm `make_<ten>(**kwargs)` trả về `frappe.get_doc({...})` chưa insert, như mẫu.
- Lỗi cần kiểm: `frappe.ValidationError` (quy tắc trong `validate`), `frappe.MandatoryError`,
  `frappe.DuplicateEntryError` (trùng tên bản ghi), `frappe.UniqueValidationError` (trùng trường `unique`
  không phải tên), `frappe.LinkValidationError` (Link trỏ tới bản ghi không tồn tại).
- DocType có Link tới DocType khác: tạo bản ghi đích trong test trước khi insert.
- Mỗi tiêu chí nghiệm thu về dữ liệu có ít nhất một test.

## 4. Tác vụ định kỳ (nhắc hạn, quét hằng ngày)

- Hàm trong `contract_tracker/tasks.py`, ví dụ `def notify_expiring_contracts(): ...`.
- Khai báo trong `hooks.py`: `scheduler_events = {"daily": ["contract_tracker.tasks.notify_expiring_contracts"]}`.
- Test bằng cách gọi thẳng hàm trong test; không chờ scheduler.

## 5. Báo cáo (Script Report)

Thư mục `contract_tracker/contract_tracker/report/<ten_bao_cao>/` gồm `__init__.py`, `<ten>.json`, `<ten>.py`,
`<ten>.js`. JSON có `"doctype": "Report"`, `"report_type": "Script Report"`, `"is_standard": "Yes"`,
`"ref_doctype"`, `"module": "Contract Tracker"`, `"name"` và `"report_name"` (tên tiếng Anh), `"roles"`.
File `.py` có `def execute(filters=None): return columns, data`. Đường dẫn xem: `/app/query-report/<Tên Báo Cáo>`.

## 6. Bản dịch

Mỗi tên DocType, tên báo cáo, nhãn tiếng Anh và chuỗi `_("...")` tiếng Anh mới phải có mục trong
`contract_tracker/locale/vi.po`:

```
msgid "Contract Payment"
msgstr "Thanh toán hợp đồng"
```

Chuỗi đã viết sẵn bằng tiếng Việt thì không cần dịch.

## 7. Thay đổi trên dữ liệu đã có

- Không đổi `fieldname`, không đổi `fieldtype` sang kiểu khác hẳn, không xóa trường. Thêm trường mới.
- Cần sửa dữ liệu cũ: viết patch `contract_tracker/patches/v0_x/<mo_ta>.py` có `def execute(): ...`,
  thêm dòng `contract_tracker.patches.v0_x.<mo_ta>` vào `[post_model_sync]` của `patches.txt`.

## 8. Lỗi hay gặp

- Quên `__init__.py` trong thư mục DocType hoặc report: migrate không thấy.
- `field_order` thiếu trường, hoặc `fieldname` trùng nhau.
- `Link` trỏ tới DocType chưa tồn tại hoặc sai chính tả.
- Tên lớp Python không khớp tên DocType.
- Sửa JSON mà không tăng `modified`.

## 9. Giao diện cho người dùng

Màn hình cho người dùng làm bằng Vue trong `frontend/` theo skill `chuan-ui-ux`, không làm bằng Desk
(trừ khi yêu cầu nói rõ). DocType mới thì interface TypeScript tự sinh vào `frontend/src/types/doctypes.ts`
khi chạy verify; import kiểu từ đó. Giao diện đọc ghi qua REST của Frappe (`/api/v2/document/<DocType>`),
nên quyền theo role trong `permissions` của DocType vẫn được Frappe kiểm. Số liệu tổng hợp phức tạp (báo cáo,
thống kê) viết hàm `@frappe.whitelist()` trong `contract_tracker/api.py`, có test, rồi gọi bằng `useCall`.
