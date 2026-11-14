# Đề xuất: Chuyển hợp đồng Đang hiệu lực về Nháp (ticket #38)

Trạng thái: **chờ người duyệt xác nhận**. Mã đã làm theo khuyến nghị bên dưới; nếu chọn phương án khác thì sửa ở ticket sau.

## Bối cảnh

- Cần xóa nhiều hợp đồng ở màn Quản lý hợp đồng. `on_trash` chỉ cho xóa hợp đồng Nháp chưa có đợt gắn chứng từ
  (tài liệu `lha-quan-ly-hop-dong.md` §5.3, `vong-doi-chung-tu.md` lệch #8).
- Yêu cầu "Admin được xóa hết" mâu thuẫn với "hợp đồng đã duyệt (Kích hoạt) không xóa được".
- Lúc test, Admin cần dọn các hợp đồng đã Kích hoạt mà chưa có hóa đơn hay tiền thu.

## Phương án

- **A. (khuyến nghị)** Thêm chuyển trạng thái Đang hiệu lực → Nháp, chỉ System Manager, chỉ khi chưa có đợt gắn chứng từ
  (hóa đơn Hiệu lực hoặc tiền thu). Đợt chưa có chứng từ bị xóa cùng giao dịch (giống cách Hủy). Sau đó xóa như hợp đồng Nháp.
  Không phá quy tắc không xóa hợp đồng đã duyệt hay đã có chứng từ (B5).
- B. Cho Admin xóa thẳng hợp đồng Đang hiệu lực. Không chọn: trái quy tắc "đã duyệt thì không xóa", dễ mất dấu vết.
- C. Không làm gì; Admin phải Hủy rồi để đó. Không chọn: hợp đồng Đã hủy không xóa được nên dữ liệu test tích tụ.

## Khuyến nghị

Chọn A. Điều kiện chặn dùng cùng hàm `has_billed_installments` như Hủy hợp đồng. Ghi người và thời điểm nhờ `track_changes`
của Contract. Chuyển về Nháp không áp dụng cho Hết hạn, Đã thanh lý, Đã hủy.

## Điểm cần người duyệt lưu ý

- Đợt chưa có hóa đơn/tiền thu nhưng đang nằm trong đề nghị thanh toán hoặc biên bản nghiệm thu vẫn bị xóa (giống Hủy hiện nay),
  dòng đề nghị/biên bản sẽ trỏ vào đợt đã xóa (lệch #9). Khi đó xóa hợp đồng có thể bị Frappe chặn vì còn liên kết; hợp đồng
  vào danh sách "bỏ qua" kèm lý do.
- Việc lập hóa đơn/phiếu thu không khóa dòng hợp đồng, nên còn một khe hẹp về ghi đồng thời, giống `cancel_contract`.
