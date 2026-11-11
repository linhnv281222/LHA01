# Contract Tracker (Frappe v16 + Frappe UI)

Custom app Frappe để theo dõi hợp đồng. Repo này chính là thư mục app (`bench new-app`), không chứa bench.
Có hai giao diện:

- **Giao diện người dùng** (mặc định cho mọi màn hình mới): Vue 3 + frappe-ui trong `frontend/`, phục vụ ở
  `/contracts`, theo chuẩn UI/UX nội bộ. Đọc skill `chuan-ui-ux` trước khi làm màn hình.
- **Desk** của Frappe (`/app/...`): dùng cho quản trị, cấu hình. Chỉ làm màn Desk khi yêu cầu nói rõ.

## Kiểm tra

Một lệnh duy nhất, phải qua trước khi báo xong:

```
bash scripts/verify.sh
```

Lệnh này: (0) sinh kiểu TypeScript từ DocType, kiểm tra chuẩn UI/UX, kiểm tra kiểu, chạy test và build
giao diện; (1-4) chép mã vào bench test, `bench migrate`, chạy toàn bộ test Python của app.
Khi chỉ sửa giao diện, chạy nhanh `bash scripts/verify.sh frontend` (khoảng 30 giây), rồi chạy đầy đủ trước khi báo xong.

Không có lệnh `bench`, `npm`, `npx` nào khác được phép; mọi thứ đi qua script này.

## Cấu trúc

```
contract_tracker/                 gói Python của app
  hooks.py                        móc nối với Frappe (route /contracts, scheduler, doc_events...)
  www/contracts.py                trang chứa giao diện Vue (contracts.html do build sinh ra, không sửa)
  locale/vi.po                    bản dịch tiếng Việt
  contract_tracker/doctype/       mỗi DocType một thư mục (skill frappe-app)
  contract_tracker/report/        báo cáo (Script Report)
frontend/                         giao diện Vue (skill chuan-ui-ux và frappe-ui)
  src/standard/                   thành phần chuẩn UI/UX (BẢO VỆ)
  src/pages/<man-hinh>/           màn hình; mẫu: src/pages/contract-types/
  src/menu.ts, src/router.ts      menu chính, route
  src/types/doctypes.ts           sinh tự động từ DocType (không sửa tay)
```

## Mẫu để làm theo

- Backend: DocType "Contract Type" (Loại hợp đồng) trong `contract_tracker/contract_tracker/doctype/contract_type/`.
- Giao diện: `frontend/src/pages/contract-types/` (danh sách + form + logic + test).

Một tính năng mới thường gồm: DocType (JSON + controller + test Python) → màn hình Vue (danh sách + form +
logic + test) → mục menu + route → bản dịch.

## Quy ước

- Tên DocType và fieldname bằng tiếng Anh; nhãn, mô tả, thông báo bằng tiếng Việt có dấu.
  Tên DocType và tên module phải có bản dịch trong `contract_tracker/locale/vi.po`.
- Python: thông báo cho người dùng bọc trong `_()`: `frappe.throw(_("..."))`.
- Quy tắc kiểm tra dữ liệu viết ở cả hai nơi: controller Python (bắt buộc, là chốt chặn) và `<man-hinh>.ts`
  ở giao diện (để báo lỗi ngay, không gửi request sai). Hai nơi phải khớp nhau.
- Mỗi DocType mới có test Python; mỗi màn hình mới có test vitest cho file logic.
- Không sửa mã của Frappe hay ERPNext. Không viết SQL nối chuỗi; dùng `frappe.get_all`, `frappe.db.get_value`
  hoặc `frappe.qb`.
- Không đổi `fieldname` hay xóa trường đã có dữ liệu; thêm trường mới. Đổi dữ liệu cũ thì viết patch.
- Không thêm thư viện (Python hay npm). Cần thư viện thì ghi trong báo cáo để người quyết.
- Không sửa: `crew.toml`, `scripts/`, `.claude/`, `.github/`, `pyproject.toml`, `frontend/src/standard/`,
  `frontend/package*.json` và các file cấu hình trong `frontend/` (vite, vitest, tailwind, postcss, tsconfig, index.html).
- Đường dẫn màn hình để chụp ảnh: giao diện Vue `/contracts/<man-hinh>` và `/contracts/<man-hinh>/new`
  (ví dụ `/contracts/contract-types`); Desk `/app/<ten-doctype-gach-ngang>`.
