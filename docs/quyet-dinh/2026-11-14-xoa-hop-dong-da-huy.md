# Đề xuất: Cho xóa hợp đồng Đã hủy (ticket #43)

Trạng thái: **chờ người duyệt xác nhận**. Mã đã làm theo khuyến nghị bên dưới; nếu chọn phương án khác thì sửa ở ticket sau.

## Bối cảnh

- `vong-doi-chung-tu.md` §2.1 và lệch #8 đang ghi hợp đồng Đã hủy "không xóa"; `on_trash` chỉ cho xóa hợp đồng Nháp.
- Người giao việc yêu cầu cho xóa hợp đồng Đã hủy (chọn nhiều ở danh sách và nút ở panel chi tiết).
- Hợp đồng chỉ chuyển sang Đã hủy được khi chưa có đợt gắn chứng từ (hóa đơn Hiệu lực hoặc tiền thu).

## Phương án

- **A. (khuyến nghị)** Cho xóa hợp đồng Nháp hoặc Đã hủy, với điều kiện không có đợt gắn chứng từ
  (dùng `has_billed_installments`). Các trạng thái Đang hiệu lực, Hết hạn, Đã thanh lý vẫn không xóa được.
- B. Giữ nguyên, hợp đồng Đã hủy không xóa. Không chọn: trái chỉ đạo của người giao việc, dữ liệu hủy tích tụ.

## Khuyến nghị

Chọn A. Theo B5, hợp đồng Đã hủy không có đợt gắn chứng từ nên xóa không làm mất dấu vết giao dịch.
Quyền xóa giữ nguyên (vai có quyền `delete` trên Contract). Kiểm tra ở server (`on_trash`, `delete_contracts`) là chốt chặn;
giao diện chỉ ẩn/hiện nút cho khớp.

## Điểm cần người duyệt lưu ý

- Hợp đồng Đã hủy mà đợt còn được đề nghị thanh toán hoặc biên bản nghiệm thu trỏ tới thì Frappe chặn vì còn liên kết;
  hợp đồng vào danh sách "bỏ qua" kèm lý do, như hiện nay.
- Ticket này không sửa `vong-doi-chung-tu.md`; nếu duyệt thì cần cập nhật §2.1 và lệch #8 ở ticket tài liệu.
