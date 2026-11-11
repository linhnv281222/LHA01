<!-- Tài liệu nghiệp vụ gốc "LHA-quan-ly-hop-dong.md", người giao việc gửi qua Telegram. Kế hoạch: Quản lý hợp đồng và thu tiền LHA - giai đoạn 1. Không sửa tay file này trong ticket. -->

# Quản lý hợp đồng và thu tiền - Công ty LHA (giai đoạn 1)

## 1. Mục tiêu
Quản lý tập trung hợp đồng với khách hàng, các hạng mục phải thu, lịch các đợt thu, và chứng từ đi kèm mỗi
đợt: biên bản nghiệm thu, đề nghị thanh toán, hóa đơn, thu tiền. Trả lời nhanh được:
- Tháng này phải thu những khoản nào, của ai, bao nhiêu?
- Đợt nào đến hạn mà chưa nghiệm thu, chưa lập đề nghị thanh toán, chưa xuất hóa đơn?
- Khoản nào đã xuất hóa đơn nhưng quá hạn chưa thu tiền?

Không làm ở giai đoạn này: xuất hóa đơn điện tử thật (chỉ ghi nhận số hóa đơn), kế toán tổng hợp,
đa tiền tệ (chỉ VND), duyệt nhiều cấp, gửi email/nhắc hạn tự động, tự gia hạn hợp đồng.

## 2. Danh mục (master data)
- Thuế suất GTGT: tên (ví dụ "10%", "8%", "Không chịu thuế"), tỷ lệ %, cờ "Không chịu thuế", đang dùng/ngừng dùng.
  Dữ liệu ban đầu: 0%, 5%, 8%, 10%, Không chịu thuế. Thuế suất đã dùng trong hợp đồng thì không xóa, chỉ ngừng dùng.
- Loại hợp đồng: dùng danh mục đã có.
- Khách hàng: tên (bắt buộc), mã số thuế (không trùng nếu có), địa chỉ, người liên hệ, chức vụ người đại diện,
  số điện thoại, email, số tài khoản và ngân hàng, ghi chú.

## 3. Dữ liệu chính

### 3.1 Hợp đồng
- Số hợp đồng (bắt buộc, không trùng, nhập theo số trên hợp đồng giấy), khách hàng (bắt buộc), loại hợp đồng,
  tên/nội dung hợp đồng.
- Ngày ký, ngày bắt đầu hiệu lực (bắt buộc), ngày kết thúc (bắt buộc với hợp đồng có hạng mục định kỳ).
- Người phụ trách, file hợp đồng đính kèm, ghi chú.
- Trạng thái: Nháp → Đang hiệu lực → Hết hạn / Đã thanh lý / Đã hủy.
- Số tổng (tự tính, chỉ đọc): giá trị trước thuế, tiền thuế, tổng sau thuế, đã xuất hóa đơn, đã thu, còn phải thu.

### 3.2 Hạng mục (bảng con trong hợp đồng)
Mỗi hạng mục: tên (bắt buộc), thuế suất (chọn từ danh mục, bắt buộc), cần nghiệm thu (có/không; mặc định có với
Một lần và Nhiều đợt, không với Định kỳ; với Nhiều đợt chỉnh được theo từng mốc, ví dụ Tạm ứng: không), kiểu thu và
thông tin theo kiểu thu:

| Kiểu thu | Thông tin nhập |
|---|---|
| Một lần | Số tiền trước thuế, ngày đến hạn |
| Nhiều đợt (theo mốc) | Danh sách mốc: tên (ví dụ "Tạm ứng", "Nghiệm thu"), số tiền hoặc % giá trị hạng mục, ngày đến hạn |
| Định kỳ (license) | Đơn giá mỗi kỳ trước thuế, chu kỳ (tháng / quý / 6 tháng / năm), ngày bắt đầu kỳ đầu, ngày kết thúc (mặc định = ngày kết thúc hợp đồng), thu đầu kỳ hay cuối kỳ (mặc định đầu kỳ), số ngày được nợ (mặc định 0) |

### 3.3 Đợt thu (tự sinh từ hạng mục)
- Một lần: 1 đợt. Nhiều đợt: mỗi mốc 1 đợt. Định kỳ: mỗi kỳ 1 đợt cho toàn bộ thời hạn, tên ghi rõ kỳ
  ("License T01/2027", "Quý 1/2027"); kỳ cuối lẻ tính tiền theo số ngày thực tế.
- Mỗi đợt: hợp đồng, khách hàng, hạng mục, tên đợt, kỳ từ - đến (định kỳ), ngày đến hạn, tiền trước thuế,
  thuế suất, tiền thuế, tổng tiền.
- Trạng thái chứng từ của đợt (tự cập nhật từ các chứng từ ở mục 3.4 - 3.7), mỗi đợt nhìn thấy:
  Nghiệm thu (Không cần / Chưa / Đã ký) · Đề nghị thanh toán (Chưa lập / Đã lập) · Hóa đơn (Chưa xuất / Đã xuất, số hóa đơn) ·
  Thanh toán (Chưa thu / Thu một phần / Đã thu, số tiền đã thu) · Quá hạn (qua ngày đến hạn mà chưa thu đủ).

### 3.4 Biên bản nghiệm thu
Chọn khách hàng và một hoặc nhiều đợt thu của khách hàng đó (có thể thuộc nhiều hợp đồng). Thông tin: số biên bản
(tự sinh theo chuẩn repo), ngày nghiệm thu, nội dung nghiệm thu (mặc định lấy tên hạng mục và kỳ của các đợt),
đại diện bên A, bên B, trạng thái Nháp / Đã ký, file scan biên bản đã ký. In ra theo mẫu (mục 4).

### 3.5 Đề nghị thanh toán
Chọn khách hàng và một hoặc nhiều đợt thu chưa thanh toán đủ của khách hàng đó. Thông tin: số đề nghị (tự sinh),
ngày lập, hạn thanh toán, bảng các đợt (nội dung, tiền trước thuế, thuế, tổng), tổng cộng, số tiền bằng chữ,
thông tin tài khoản nhận tiền của LHA. Trạng thái Nháp / Đã gửi. In ra theo mẫu (mục 4).

### 3.6 Hóa đơn (gộp được nhiều đợt)
Chọn khách hàng và một hoặc nhiều đợt chưa xuất hóa đơn của khách hàng đó (có thể thuộc nhiều hợp đồng; có thể
chọn từ một đề nghị thanh toán để lấy sẵn các đợt). Nhập số hóa đơn, ký hiệu, ngày xuất. Tổng tiền = tổng các đợt,
tách theo từng thuế suất. Mỗi đợt chỉ nằm trong một hóa đơn đang hiệu lực. Hủy hóa đơn được khi chưa có tiền thu
phân bổ vào các đợt của nó; hủy thì các đợt trở lại Chưa xuất.

### 3.7 Phiếu thu
Khách hàng, ngày thu, số tiền, hình thức (chuyển khoản / tiền mặt), ghi chú. Phân bổ số tiền vào các đợt còn nợ của
khách hàng: hệ thống gợi ý tự động (ưu tiên đợt thuộc hóa đơn đã chọn, rồi đợt đến hạn sớm nhất), người dùng sửa được.
Không phân bổ vượt số còn nợ của đợt; tổng phân bổ không vượt số tiền phiếu thu (phần dư ghi "chưa phân bổ").
Cho phép thu trước khi xuất hóa đơn (tạm ứng).

## 4. Mẫu in
Biên bản nghiệm thu và Đề nghị thanh toán in ra PDF theo mẫu của LHA (mẫu Word gửi kèm; nếu chưa có thì làm mẫu
chuẩn: tiêu đề, thông tin hai bên, bảng nội dung, tổng cộng, số tiền bằng chữ, chữ ký). Mẫu sửa được trên hệ thống
mà không cần sửa code (Print Format của Frappe).

## 5. Quy tắc nghiệp vụ
1. Hợp đồng Nháp thì sửa tự do và chưa có đợt thu. Bấm "Kích hoạt" (→ Đang hiệu lực) thì sinh đợt thu.
2. Sửa hạng mục của hợp đồng đang hiệu lực: đợt chưa có chứng từ nào (nghiệm thu, đề nghị, hóa đơn, thu tiền) thì
   sinh lại; đợt đã có chứng từ thì giữ nguyên, không tự xóa.
3. Không xóa hợp đồng đã có đợt gắn chứng từ; chỉ chuyển Đã hủy.
4. Tổng các mốc của hạng mục Nhiều đợt phải bằng giá trị hạng mục (theo % thì tổng 100%).
5. Hợp đồng tự chuyển Hết hạn sau ngày kết thúc (kiểm tra hằng ngày); vẫn theo dõi các đợt còn nợ.
6. Một chứng từ (biên bản, đề nghị, hóa đơn, phiếu thu) chỉ gồm các đợt của cùng một khách hàng.
7. Thứ tự chứng từ không bắt buộc (nghiệm thu, đề nghị, hóa đơn, thu tiền có thể làm theo bất kỳ thứ tự nào),
   hệ thống chỉ hiển thị đợt nào còn thiếu chứng từ nào.

## 6. Màn hình (giao diện Vue, theo chuẩn giao diện của repo)
1. Danh mục Thuế suất, Khách hàng: danh sách + form.
2. Hợp đồng - danh sách: lọc theo trạng thái, khách hàng, người phụ trách, loại hợp đồng; thẻ số liệu: số hợp đồng
   đang hiệu lực, tổng giá trị, đã thu, còn phải thu; cột còn phải thu cộng ở dòng Tổng.
3. Hợp đồng - form: thông tin chung, bảng hạng mục, tab "Lịch thu" (các đợt và trạng thái chứng từ), nút "Kích hoạt".
4. Lịch thu tiền (toàn công ty) - màn làm việc chính:
   - Lọc nhanh: Đến hạn tháng này, Quá hạn, Chưa nghiệm thu, Chưa lập đề nghị, Chưa xuất hóa đơn,
     Đã xuất hóa đơn chưa thu; lọc theo khoảng ngày đến hạn, khách hàng, người phụ trách, hợp đồng.
   - Thẻ số liệu: phải thu trong kỳ, đã thu, quá hạn, chưa xuất hóa đơn.
   - Chọn nhiều đợt (cùng khách hàng) rồi bấm: "Lập biên bản nghiệm thu", "Lập đề nghị thanh toán",
     "Ghi nhận hóa đơn", "Ghi nhận thu tiền".
5. Biên bản nghiệm thu, Đề nghị thanh toán, Hóa đơn, Phiếu thu: danh sách + form, nút In (với biên bản và đề nghị).

## 7. Phân quyền
- Quản lý hợp đồng: thêm, sửa, xóa, in mọi thứ ở trên.
- Xem hợp đồng: chỉ xem và in, không sửa gì.
- System Manager: toàn quyền.

## 8. Thứ tự làm (gợi ý tách ticket)
1. Vai "Quản lý hợp đồng", "Xem hợp đồng"; danh mục Thuế suất (có dữ liệu ban đầu); Khách hàng.
2. Hợp đồng và hạng mục: DocType, danh sách, form, trạng thái (chưa sinh đợt thu).
3. Sinh đợt thu (một lần, nhiều đợt, định kỳ có kỳ lẻ) khi kích hoạt, sinh lại khi sửa; tab Lịch thu.
4. Hóa đơn gộp nhiều đợt và Phiếu thu có phân bổ; trạng thái đợt; số tổng trên hợp đồng; quá hạn; tự Hết hạn.
5. Màn Lịch thu tiền toàn công ty: bộ lọc nhanh, thẻ số liệu, chọn nhiều đợt để ghi nhận hóa đơn và thu tiền.
6. Đề nghị thanh toán gộp nhiều đợt + mẫu in; nút trên màn Lịch thu.
7. Biên bản nghiệm thu gộp nhiều đợt + mẫu in; nút trên màn Lịch thu.

## 9. Ví dụ để kiểm tra
Hợp đồng HD-001 với Công ty ABC, hiệu lực 01/01/2027 - 31/12/2027:
- "Triển khai": Nhiều đợt, 100.000.000 đ, thuế 10%: Tạm ứng 30% hạn 05/01/2027, Nghiệm thu 70% hạn 31/03/2027
  → 2 đợt: 33.000.000 đ và 77.000.000 đ sau thuế.
- "License phần mềm": Định kỳ quý, 15.000.000 đ/quý, Không chịu thuế, thu đầu kỳ, nợ 15 ngày, từ 01/01/2027
  → 4 đợt Quý 1..4/2027, hạn 16/01, 16/04, 16/07, 16/10, mỗi đợt 15.000.000 đ.
- "Đào tạo": Một lần, 5.000.000 đ, thuế 8%, hạn 15/02/2027 → 1 đợt 5.400.000 đ.
Tổng sau thuế: 33.000.000 + 77.000.000 + 60.000.000 + 5.400.000 = 175.400.000 đ.

Gộp chứng từ: một đề nghị thanh toán và một hóa đơn gồm "Tạm ứng" (33.000.000) và "License Quý 1/2027" (15.000.000)
= 48.000.000 đ, trong đó thuế 10% là 3.000.000 đ và phần không chịu thuế là 15.000.000 đ. Phiếu thu 40.000.000 đ
phân bổ tự động: Tạm ứng (hạn 05/01) nhận đủ 33.000.000 → Đã thu; License Quý 1 (hạn 16/01) nhận 7.000.000
→ Thu một phần, còn nợ 8.000.000.
