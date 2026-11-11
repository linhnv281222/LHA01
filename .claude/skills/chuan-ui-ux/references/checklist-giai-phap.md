# Checklist UX — Giai đoạn Giải pháp / Thiết kế wireframe & mockup

Áp dụng khi thiết kế luồng màn hình, layout, form, bảng dữ liệu, navigation — TRƯỚC khi vẽ đồ họa chi tiết. Luật BB_xxx = Rất quan trọng (bắt buộc pass), LT_xxx = Quan trọng. Tag [Web/Win/Mobile/Landing] chỉ phạm vi áp dụng.

## Mục lục nhóm luật

Navigation, AppInfo, Layout, Homepage, Menu, Breadcrumb, Form, Textarea, Confirmation, Label, Button, Date Picker, Radio button, Checkbox, Dropdown, Import data file, Upload, Data Table, Kiểm soát thông tin, Popup, Search box, Search result, Password, Bottom Navigation, ListView, Message, Content, Error page, Privacy and policy, Customer Experience, Textbox, Language, Icon, Tabs, Gesture-based Navigation, Export to Excel, Access Right

## Navigation

- **BB_001** [Web/Win/Mobile]: Không được có ngõ cụt (dead end). — Ngõ cụt là nơi người dùng không biết nên làm gì/đi đâu tiếp.
  - *Ghi chú*: Đi thử một lượt qua các trang, xem có chỗ nào vào được mà không có nút để tắt/back lại trang trước đó/đi tiếp sang một trang khác không. — Từ màn hình đích phải có link/button quay lại (không tính menu)

## AppInfo

- **BB_002** [Win/Mobile]: Có màn hình hiển thị thông tin ứng dụng như phiên bản, bản quyền, và chính sách bảo mật, điều khoản dịch vụ, … (Vd: màn hình About của các ứng dụng trên WINapp, term of service, security privacy,...)

## Layout

- **BB_003** [Web/Landing]: Các thông tin về bản quyền được hiển thị rõ ràng tại cuối trang.
  - *Ghi chú*: Áp dụng ở tất cả các trang với các Website thương mại điện tử và Landing page.
- **BB_004** [Web/Win/Mobile/Landing]: Nếu trong 1 trang có các thành phần thông tin khác nhau thì cần thiết kế tách biệt rõ ràng, mỗi phần (panel) phải có tiêu đề (Header) mô tả rõ ý nghĩa của phần đó.
  - *Ghi chú*: Đa phần các trang của Viettel đều có chức năng tìm kiếm và thống kê kết quả. Thì yêu cầu phần "Tiêu chí tìm kiếm" và "Thống kê kết quả" phải: — - Thiết kế tách biệt rõ ràng bằng màu sắc, đường kẻ, badge,… — - Có header mô tả rõ ý nghĩa.
- **BB_005** [Web/Win/Mobile]: Các control element/button thuộc nhóm thông tin nào, thì cần để đúng ở nhóm đó.
  - *Ghi chú*: Ví dụ, khi có 1 popup gồm 2 phần là "Tiêu chí tìm kiếm" và "Kết quả": phần "Tiêu chí tìm kiếm" ở Popup không thể chứa button "Close" popup vì button này tác động tới toàn bộ popup chứ không chỉ panel "Tiêu chí tìm kiếm".
- **BB_006** [Web/Win/Mobile/Landing]: Sử dụng layout quen thuộc, nhất quán trong toàn bộ ứng dụng. — Nhất quán cách điều hướng giữa các chức năng tương tự (vị trí, tên, style).
  - *Ghi chú*: Vd: Next luôn ở bên phải, Back ở bên trái. Các positive button luôn ở bên phải, các neutral button luôn ở bên trái. — Đã sử dụng breadcrumb thì toàn bộ hệ thống sử dụng breadcrumb cho các màn hình kể cả màn hình chỉ phân cấp đến cấp 2. — Yêu cầu phải cùng phong cách layout, menu ở cùng một phía.

## Homepage

- **BB_007** [Web/Win/Mobile]: Trang chủ có nội dung tổng hợp, quan trọng nhất, thiết kế đơn giản, dễ hiểu; Không đưa quá nhiều thông tin lên trang chủ gây choáng ngợp.
  - *Ghi chú*: Áp dụng với các hệ thống quản lý nghiệp vụ có yêu cầu dashboard riêng — Trên dashboard cần có các thông tin thống kê tổng hợp, các biểu đồ số liệu theo các nghiệp vụ chính; thông tin quan trọng theo KH yêu cầu; các tính năng thường sử dụng.

## Menu

- **BB_008** [Web/Win/Mobile/Landing]: Tên của menu phải giống với tiêu đề/nội dung của trang đích.
  - *Ghi chú*: Nhấn vào menu và so sánh tên menu vs tên trang (xem tên trang ở app bar/bottom navigation/tab/breadcrumb).
- **BB_009** [Web/Landing]: Sử dụng sticky menu nếu hệ thống sử dụng topmenu/horizontal menu.
  - *Ghi chú*: Tham khảo các trang nội bộ: viettelfamily, skyt, ttns,…
- **BB_010** [Web/Win]: Hệ thống menu điều hướng có ít mức độ phân cấp (nhiều nhất là ba mức). Các thông tin, thao tác quan trọng phải được truy cập trong nhiều nhất ba click kể từ trang chủ.
- **BB_011** [Web/Win]: Main Menu item chỉ tối đa 9 items. — - Có thể đưa bớt các menu ít sử dụng nhưng cần thiết vào thành menu cấp thấp hơn/đặt tên- gom nhóm.
- **LT_001** [Web/Win/Mobile/Landing]: Không sử dụng các từ giống hệt nhau để bắt đầu mỗi tên submenu.
  - *Ghi chú*: Các sp có tần suất gặp vd này là 90%. Rất nhiều menu list sử dụng các từ giống hệt nhau ở đầu các tên khiến menu vô cùng khó phân biệt và bị wraptext do tên dài nhìn menu rất xấu. — Trường hợp lỗi, cần nghiên cứu gom nhóm lại và lược bỏ các từ lặp.
- **LT_002** [Web/Win]: Có ít nhất 2 cách để đến một trang nội dung. — Người dùng có thể tìm trang cần đến thông qua: menu, breadcrumb, site map, site search, danh sách trang thường sử dụng tại trang Home,…
  - *Ghi chú*: Cách thường dùng nhất là có hệ thống menu và site search.

## Breadcrumb

- **BB_012** [Web/Win]: Yêu cầu hệ thống có bất kỳ page nào có >=3 levels phân cấp phải có breadcrumb nhất quán ở tất cả các page, đúng thứ tự các cấp, để người dùng biết mình đang đứng ở đâu trong hệ thống. — Breadcrumb bắt đầu phải là Trang chủ/Dashboard

## Form

- **BB_013** [Web/Win/Mobile/Landing]: Các form cần phải có tiêu đề nói rõ form này là làm gì.
  - *Ghi chú*: Nếu form trong một panel thì cần có Header ở đầu panel, hoặc dùng field-set có tiêu đề của field-set.
- **BB_014** [Web/Win/Mobile/Landing]: Tất cả các Input data control cần có label mô tả ý nghĩa dữ liệu nhập vào. Không sử dụng placeholder để thay thế label. — Trường hợp loại trừ: Ô global search chỉ cần có icon kính lúp.
- **BB_015** [Web/Win/Mobile/Landing]: Sắp xếp thông tin theo thứ tự logic luồng nhập liệu và click button để xử lý, từ trên xuống dưới. — Các thông tin có liên quan với nhau được nhóm lại gần nhau nhất có thể để giúp người dùng dễ dàng hiểu thông tin hơn. — Gom nhóm thông tin bằng việc kết hợp: — - Card, Panel, khung frame; — - Khoảng trắng; — - Gióng hàng.
  - *Ghi chú*: Thường gặp ở các form: tiêu chí tìm kiếm, chi tiết thông tin. Các thông tin này đổ hết ra màn hình mà không thể hiện rõ các nhóm thông tin, button để trên đầu ngược luồng xử lý. Khi phát hiện ra thì cần nghiên cứu sắp xếp lại. — -Với các form nhập liệu không phải cuộn dọc: Nên chuyển button chức năng liên quan (Save/Submit/Cancel) xuống phía dưới…
- **BB_016** [Web/Win/Mobile/Landing]: Sử dụng checkbox, radio button hoặc dropdown trong trường hợp dữ liệu cho phép người dùng nhập bị hạn chế và nếu để textbox người dùng sẽ rất dễ nhập sai.
  - *Ghi chú*: Ví dụ thường gặp: số ngày trong tháng (khoảng [1-30]), giới tính, tỉnh,… — Ví dụ textbox mà lại cho nhập thông tin giới tính Nam/Nữ.
- **BB_017** [Web/Win/Mobile]: Khi ở trạng thái readonly (cả form là readonly), sử dụng readonly label. — Vì textbox dạng disabled bị mờ đi, rất khó đọc.
  - *Ghi chú*: Chỉ bắt buộc khi là cả form là readony. Nếu chỉ có một vài thông tin thì tùy SP chọn disable hay readonly label.
- **BB_018** [Web/Win/Mobile]: Không sử dụng quá nhiều button trong một form, vì sẽ khiến người dùng xao nhãng, không biết mục tiêu chính của form là làm gì, click button nào.
  - *Ghi chú*: Mỗi một màn hình chỉ nên làm một việc. (một mục đích chính có tác động server, send POST method) — Các form nhập liệu thường chỉ có 2 button: 1 positive, 1 neutral. — Các form đánh giá, xem xét phê duyệt thường có 3 button: 1 positive, 1 negative, 1 neutral. — Các form quản lý dữ liệu dạng danh mục, master data thì có thể có thêm: negative,…
- **BB_019** [Mobile]: Form càng ngắn và đơn giản càng tốt.
  - *Ghi chú*: Xem trong form có các trường nhập liệu nào là optional, không thực sự cần thiết, hay có thể gộp lại/bỏ bớt mà ko ảnh hưởng tới nghiệp vụ không?
- **LT_003** [Web/Win/Mobile/Landing]: Không sử dụng placeholder/helptext lặp lại nội dung của label, cho các data input control.
  - *Ghi chú*: Bỏ hết các placeholder trong các ô nhập liệu lặp lại label. Chỉ để các hint quan trọng hướng dẫn nhập liệu các trường dữ liệu có format đặc biệt. Nếu hint quan trọng thì nên để bên dưới ô nhập liệu, cũng không sử dụng placeholder.
- **LT_004** [Web/Win/Mobile]: Người dùng không phải nhập lại các thông tin tương tự trên các form khác nhau.
  - *Ghi chú*: Nếu trên các form có thông tin tương tự thì chỉ yêu cầu user nhập một lần đầu tiên, các form khác chỉ hiển thị lại thông tin, không bắt user phải nhập lại.

## Textarea

- **BB_020** [Web/Win/Mobile/Landing]: Đối với các trường nhập liệu dài, ví dụ như Description, nên sử dụng Textarea thay vì Textbox.
  - *Ghi chú*: Các sản phẩm của Viettel rất hay gặp lỗi này. — VD là ô Description/Mô tả/Nội dung/Ý kiến/Địa chỉ. Bình thường textbox của mình không nên dài quá 700px, text cần nhập mà vượt quá tức là sẽ bị hide trên textbox thì chuyển thành dạng textarea.

## Confirmation

- **BB_021** [Web/Win/Mobile]: Các hành động nguy hiểm, quan trọng thì cần có confirmation (dạng Dialog) để xác nhận. — Khi không có confirmation, thì ít nhất cũng phải cung cấp chức năng Undo trong vài giây (tham khảo Gmail). — Ví dụ: — - các thao tác xóa, từ chối, phê duyệt; — - gửi thông tin quan trọng cho nhiều người; — - confirm về việc mất dữ liệu, nếu có thay đổi, khi close form mà chưa save.
  - *Ghi chú*: Test thử trên danh sách 1 list mà cung cấp chức năng xóa trực tiếp (không cần phải chọn vào details một list-item), xem có xóa luôn không hay có confirmation. — Nếu không có confirmation, mà cũng không có chức năng Undo như Gmail, là Failed.
- **BB_022** [Web/Win/Mobile]: Nội dung cần ngắn gọn xúc tích nhưng vẫn đầy đủ các ý quan trọng. — Confirmation message cần mô tả cho người dùng thật rõ về hành động cần xác nhận, tránh việc mô tả chung chung như "Bạn có muốn xóa?". Phải mô tả rõ để đề phòng người dùng chọn nhầm bản ghi và xóa.
  - *Ghi chú*: Ví dụ: popup yêu cầu người dùng xác nhận việc xóa một số nội dung thì cần liệt kê rõ các nội dung bị xóa. — "Bạn có muốn xóa thông tin khách hàng "ABC" không?"
- **LT_006** [Web/Win/Mobile]: Cần cung cấp preview page và confirmation page để user xác nhận lại đối với các nội dung dài.
  - *Ghi chú*: Ví dụ: — 1.Sau khi thực hiện chọn mặt hàng, trước khi thanh toán, cần hiển thị xác nhận và xem lại toàn bộ mặt hàng. — 2.Cho user preview hóa đơn trước khi print.

## Label

- **BB_023** [Web/Win/Mobile/Landing]: Phải là danh từ/cụm danh từ.
  - *Ghi chú*: Trường hợp loại trừ: “Confirm Password” – “Xác nhận mật khẩu” được dùng như một cụm danh từ phổ biến.
- **BB_024** [Web/Win/Mobile/Landing]: Nhãn của ô nhập liệu phải mô tả đúng về ô nhập liệu đó (thông tin nhập liệu là gì).
- **BB_025** [Mobile]: Sử dụng Top-Left Aligned Label hoặc là dạng Floating Label. — Không nên sử dụng Left-Aligned Label vì tốn diện tích màn hình, khiến cho ô nhập liệu bị ngắn, không đủ để nhìn thấy toàn bộ dữ liệu thường nhập.
  - *Ghi chú*: Nếu như sử dụng Left-Aligned Label, mà có ô nhập liệu nào bị ngắn (không đủ độ dài cần thiết để hiển thị hết content thường nhập), là Failed.
- **BB_026** [Web/Win/Landing]: Để gần ô nhập liệu hoặc khu vực thông tin mà nó mô tả nhất có thể. — - Thông thường trong form thì label căn phải còn ô nhập liệu căn trái. Nhưng tốt nhất hiện nay là để ngay phía trên ô nhập liệu (top-aligned): tiết kiệm tối đa khoảng thời gian di chuyển mắt.

## Button

- **BB_027** [Web/Win/Mobile]: Vị trí các nút trên form cần nhất quán trong toàn hệ thống. — 1.Các nút khiến user chuyển tiếp màn hình thì nên đặt bên tay phải (điều hướng Next); các nút khiến user quay trở lại màn hình trước thì nên đặt bên trái (điều hướng Back) — 2.Nhóm button mang tính chất lựa chọn (yes,no) thì nên đặt các button ngay cạnh nhau.
  - *Ghi chú*: Các sp hay gặp lỗi: — 1.Vị trí positive button đặt ko đúng theo partern sử dụng. — 2.Cùng nhóm lựa chọn yes,no nhưng một nút đặt bên trái, một nút đặt bên phải của form. — 3.Vị trí các nút đặt không theo quy luật nào và thiếu nhất quán trong hệ thống.
- **BB_028** [Web/Win/Mobile/Landing]: Tên button phải là động từ/cụm động từ, dễ hiểu, thể hiện trực tiếp hành động sẽ thực hiện. — Vd: save, send, share, update or create... — Không sử dụng các từ chung chung, gây khó hiểu về hành động như: submit, done, ok or close.
  - *Ghi chú*: Ví dụ, nếu là "trình ký" thì đặt luôn tên button là "Trình ký". — Sử dụng các từ, cụm từ và khái niệm quen thuộc với người dùng. Giúp người dùng có thể hiểu các lựa chọn dựa vào tiêu đề của các nút.
- **BB_066** [Landing]: Công thức chung cho một CTA (call action button) tốt là: — ĐỘNG TỪ + LỢI ÍCH + TÍNH CẤP THIẾT
  - *Ghi chú*: Động từ: là hành động user sẽ làm. — Lợi ích: là những gì họ sẽ nhận được (nếu động từ đã bao gồm nó thì không cần). — Tính cấp thiết: THỜI GIAN HẤP DẪN hoặc ĐỊA ĐIỂM, khung thời gian như "NOW", hay một địa điểm như "HERE". Từ "Miễn phí" cũng có thể tạo ra sự cấp thiết nếu nó phù hợp với tình huống.

## Date Picker

- **BB_029** [Web/Win/Mobile]: Từ ngày… Đến ngày… có liên quan tới nhau, phải để gần nhau nhất có thể, sử dụng chung một label ‘Thời gian/Ngày abc’. — - Khi cả 2 trường là bắt buộc: gộp 2 thông tin này vào luôn 1 ô nhập liệu để tiết kiệm tối đa thao tác của người dùng. Dùng 1 datetime — - Khi có ít nhất 1 trong 2 trường là optional: thiết kế gần nhau và thể hiện được mối liên hệ.

## Radio button

- **BB_030** [Web/Win/Mobile]: Phải có label mô tả nhóm radio button.
- **BB_031** [Web/Win/Mobile]: Dùng để config (không tự submit, không được dùng để thực thi hành động).
  - *Ghi chú*: Chỉ là một lựa chọn input đầu vào trên form, sau đó có button để thực hiện. — Không submit khi nhấn vào radio button
- **LT_007** [Web/Win/Mobile]: Khi người dùng cần phải chọn giữa các tùy chọn khác nhau, thì những tùy chọn đó phải rõ ràng – không gây khó hiểu cho người dùng. — Ví dụ: 2 tùy chọn có nghĩa cần giống nhau khiến cho người dùng không biết chọn cái nào.
  - *Ghi chú*: VD: Có các giá trị khiến user khó hiểu: Giá tốt nhất, Giá từ thấp đến cao, Giá từ cao đến thấp.
- **LT_008** [Web/Win/Mobile]: Đối với các lựa chọn nhị phân (YES/NO) mà sử dụng 1 checkbox, giá trị ngược lại không phải là giá trị phủ định duy nhất của giá trị hiển thị, thì chuyển thành radio button có label group đầy đủ.
  - *Ghi chú*: VD: — 1. Checkbox 'Tôi đồng ý….': giá trị ngược lại 'Tôi không đồng ý…' là giá trị phủ định duy nhất của giá trị đang hiển thị. --> Accept việc sử dụng 1 checkbox. — 2. Checkbox 'Landscape': giá trị ngược lại không phải giá trị phủ định mà là một hoặc nhiều lựa chọn khác. --> sử dụng radio button.
- **LT_009** [Web/Win/Mobile]: Hiển thị danh sách các hạng mục (item) liên quan dưới dạng danh sách chiều dọc, hạn chế hiển thị dưới dạng văn bản liên tục vì sẽ khó đọc hơn.
  - *Ghi chú*: Tốt nhất là sắp xếp theo chiều dọc, nếu để theo chiều ngang cho phù hợp layout chung, cần tăng khoảng cách giữa mỗi option đảm bảo khoảng cách tương tác tối thiểu.
- **LT_010** [Web/Win/Mobile]: Sử dụng radio button khi có <= 4 lựa chọn. — Nếu nhiều hơn thì chuyển thành Dropdown để tiết kiệm diện tích.
  - *Ghi chú*: Tùy biến theo tên option. Nếu có <= 4 option nhưng tên dài không tiện sử dụng radiobutton làm xấu layout thì có thể sử dụng luôn dropdown.

## Checkbox

- **BB_032** [Web/Win/Mobile]: Khi có 1 list các option của checkbox, phải có label chung mô tả mục đích/ý nghĩa của nhóm. — Checkbox ở đầu datatable thì không cần.
- **BB_033** [Web/Win/Mobile]: Khi người dùng cần phải chọn giữa các tùy chọn khác nhau, thì những tùy chọn đó phải rõ ràng – không gây khó hiểu cho người dùng. — Ví dụ: 2 tùy chọn có nghĩa cần giống nhau khiến cho người dùng không biết chọn cái nào.
  - *Ghi chú*: Các nhãn mơ hồ, gây hiểu lầm hoặc mô tả các tùy chọn mà người dùng trung bình không thể hiểu được
- **BB_034** [Web/Win/Mobile]: Dùng để config (không tự submit, không được dùng để thực thi hành động).
  - *Ghi chú*: Chỉ là một lựa chọn input đầu vào trên form, sau đó có button để thực hiện. — Không submit khi nhấn vào checkbox
- **LT_011** [Web/Win/Mobile]: Hiển thị danh sách các hạng mục (item) liên quan dưới dạng danh sách chiều dọc, tránh hiển thị dưới dạng văn bản liên tục.
  - *Ghi chú*: Tốt nhất là sắp xếp theo chiều dọc, nếu để theo chiều ngang cho phù hợp layout chung, cần tăng khoảng cách giữa mỗi option đảm bảo khoảng cách tương tác tối thiểu.
- **LT_012** [Web/Mobile]: Sử dụng checkbox khi có <= 4 lựa chọn. — Nếu nhiều hơn thì chuyển thành dropdown dạng TAG.
  - *Ghi chú*: Tùy biến theo tên option. Nếu có <= 4 option nhưng tên dài không tiện sử dụng checkbox thì có thể sử dụng luôn dạng TAG.

## Dropdown

- **BB_035** [Web/Win/Mobile/Landing]: Multiple choices dropdown: — 1- Các item được chọn nên hiển thị dạng tag cho dễ nhìn. Bởi vì theo lý thuyết, danh sách hiển thị theo chiều ngang (ví dụ item1, item2, item3,...) sẽ rất khó đọc. Đưa vào tag thì dễ nhìn và cũng dễ xóa bớt. — 2- Nên hỗ trợ gõ và auto-suggestion. — 3- Nếu không có quá nhiều lựa chọn, thì cân nhắc chuyển thành Checkbox.
- **BB_036** [Web/Win/Mobile/Landing]: Khi người dùng cần phải chọn giữa các tùy chọn khác nhau, thì những tùy chọn đó phải rõ ràng – không gây khó hiểu cho người dùng. Ví dụ: 2 tùy chọn có nghĩa gần giống nhau khiến cho người dùng không biết chọn cái nào.

## Import data file

- **BB_037** [Web/Win]: Cung cấp file mẫu cho người dùng tải về và nhập liệu.
  - *Ghi chú*: Yêu cầu: người dùng có thể dễ dàng lấy file mẫu về. Tốt nhất là để gần chỗ import dữ liệu theo lô luôn.
- **BB_038** [Web/Win]: Khi import bị lỗi do nhập liệu thì cần thông báo cho người dùng biết dòng nào trong file excel bị lỗi; nguyên nhân lỗi; cách sửa; và thông báo sao cho người dùng thuận tiện sửa nhất có thể.
  - *Ghi chú*: VD: Báo lỗi bằng cách xuất ra cả file lỗi, người dùng sẽ xem nội dung file và sửa dòng bị lỗi trực tiếp luôn cho nhanh.
- **BB_039** [Web/Win]: File Excel mẫu cần giúp người dùng dễ dàng nhập liệu nhất có thể. — Ví dụ, nếu 1 cell cần phải có giá trị hợp lệ là 1 trong danh sách list các giá trị, thì bản thân cell đó phải cung cấp sẵn dropdown cho người dùng lựa chọn.
  - *Ghi chú*: Yêu cầu: nhập thử ít nhất 30 dòng dữ liệu. — => Nhận xét xem có thuận tiện không. Nếu cần, attach luôn file nhập liệu đó vào file report để dự án biết.

## Upload

- **BB_040** [Web/Win/Mobile]: Phải thông báo rõ ràng cho người dùng biết về định dạng và kích cỡ file cho phép.
- **LT_014** [Web]: Hỗ trợ drag-and-drop (kéo và thả) file.

## Data Table

- **BB_041** [Web/Win/Mobile]: Bảng phải có tiêu đề.
- **BB_042** [Web/Win]: Cần phải đánh STT cho các dòng trong bảng, bắt đầu từ 1.
- **BB_043** [Web/Win]: Menu Actions để ở cột cuối cùng, vì thông thường người dùng sẽ phải đọc thông tin rồi mới quyết định hành động. — Trường hợp loại trừ: có thể để action icon ngay sau một cột thông tin quan trọng nhất đủ để quyết định action
  - *Ghi chú*: VD khi bảng có quá nhiều cột: chọn các cột quan trọng hiển thị, đủ để user quyết định các action (vì đặt ở đầu tiên bị ngược luồng xử lý thông tin thông thường). Chi tiết xem trên màn hình mới, hoặc mở chi tiết xuống bên dưới. Cần thì xuất ra file tất cả cột/ chọn hiển thị nhiều cột. Khi hiện thị thêm cột phải cuộn mà có action column thì nên đóng…
- **BB_044** [Web/Win]: Đối với bảng hiển thị kết quả tìm kiếm: phải hiển thị rõ là bao nhiêu kết quả tìm thấy, bao nhiêu kết quả được lấy ra, số lượng kết quả mỗi trang.
- **BB_045** [Web/Win/Mobile]: Trường hợp có phân trang: phân trang phải giúp người dùng thuận tiện/dễ dàng khi next/back.
- **BB_046** [Web/Win]: Khi view/edit một bản ghi nào đó trong bảng bằng popup hoặc trang, thì tiêu đề của popup/trang đó cần nói rõ cho người dùng biết về bản ghi đó và về cả mục đích của popup. — Ví dụ: Sửa thông tin khách hàng "ABCDE".
- **LT_016** [Web/Win/Mobile]: Khi bảng có nhiều thông tin thì nên cung cấp: sắp xếp, lọc, tìm kiếm thông tin cho thuận tiện. — Khi các kết quả tìm kiếm của user dường như chưa đúng mong muốn hoặc quá nhiều kết quả để xử lý, thì lọc và sắp xếp giúp người dùng thu hẹp dữ liệu, nhanh đến đích hơn.
  - *Ghi chú*: Sau khi global search sẽ có thêm các chức năng thứ cấp hỗ trợ tiếp tục thu hẹp phạm vi dữ liệu cần tìm như sắp xếp, lọc. (Sẽ gặp nhiều ở các trang thương mại điện tử.) — Yêu cầu: — - Không đặt tính năng sắp xếp trong tính năng lọc, đây là hai nhiệm vụ riêng biệt. — - Hạn chế số lượng các tùy chọn lọc có thể nhìn thấy (thường khoảng 7 mục hoặc ít…
- **LT_017** [Web/Win]: Khi bản ghi có nhiều thông tin hơn thông tin được hiển thị ở bảng, chỉ nên hiển thị các cột thông tin quan trọng nhất. — Cung cấp chức năng hiển thị phần details.
  - *Ghi chú*: Khi bảng hiển thị quá nhiều cột, bắt đầu phải cuộn ngang thì phải cân nhắc hiển mặc định cột nào và ẩn cột nào. Khi cần xem thêm thì user có thể lựa chọn theo chức năng cung cấp. — vd: cung cấp view detail riêng màn hình, view expand dãn dòng xuống dưới, show thêm cột, readonly popup,...
- **LT_018** [Web/Win/Mobile]: Khi có các dòng thông tin cùng nhóm (category) trên dòng thì nên thiết kế gom nhóm các dòng này lại. — Chú ý: Trong bảng chỉ yêu cầu group 1 cấp.
  - *Ghi chú*: Manh mối: nhìn thử xem có cột nào có nhiều giá trị lặp hay không, có gom thành 1 category được không.
- **LT_019** [Web/Win/Mobile]: Không để các text dữ liệu lặp lại trong bảng. — Chỉ nên hiển thị các text đủ để phân biệt.

## Kiểm soát thông tin

- **BB_047** [Web/Win/Mobile/Landing]: Nếu có nhiều bước thực hiện, phải cho phép người dùng kiểm soát được các bước thực hiện và trình tự tương tác.
- **BB_048** [Web/Win/Mobile]: Trong một form, có thể sẽ có các control element được enable/disable/có giá trị cho phép: phụ thuộc vào một element khác. — Người dùng phải biết được sự phụ thuộc này, nếu không sẽ gây ra cảm giác mất kiểm soát. — - Có thể sử dụng các hình thức gom nhóm thông tin để giúp người dùng dễ nhận biết sự phụ thuộc. — - Luồng phụ thuộc dữ liệu nên từ trên xuống dưới, từ trái sang phải. — - Các element phụ thuộc không được thoắt ẩn/thoắt hiện.
  - *Ghi chú*: Thường gặp tình huống sau: — - Chọn vào checkbox/radio hoặc dropdown xong, tự dưng thấy màn hình nháy rồi một số ô nhập liệu được load ra hoặc bị reload giá trị, người dùng không thể kiểm soát được. — => Cần sắp xếp lại cho hợp lý.

## Popup

- **BB_049** [Web/Win/Landing]: Chỉ sử dụng popup khi thông báo, cảnh báo, xác nhận, hoặc các form có dưới 5 data input control.
  - *Ghi chú*: Không nên sử dụng popup/dialog nếu không thực sự cần thiết vì nó làm gián đoạn luồng xử lý nghiệp vụ/thao tác và gây cảm giác phiền phức cho user: — Modal Popup yêu cầu người dùng phải hành động ngay lập tức. Người dùng không thể tiếp tục những gì họ đang làm cho đến khi họ xác nhận hộp thoại. — Popup buộc người dùng rời khỏi các tác vụ mà họ đang…
- **BB_050** [Web/Win/Landing]: Phải có icon/link/button Đóng (X) ở góc trên cùng, bên phải của popup.
  - *Ghi chú*: Chú ý là icon này chỉ cần theo chuẩn icon, dễ click là được, không cần quá to vì đã yêu cầu có cả button "Cancel" hoặc "Close" ở botton của popup.
- **BB_051** [Web/Win/Mobile/Landing]: Popup cần có Cancel/Close button rõ ràng ở cuối form. — (Ngoài icon chữ X góc trên cùng bên phải popup trên Win/Web App).
- **BB_052** [Web/Win/Landing]: Popup không nên có nhiều hơn 2 hành động
- **BB_053** [Web/Win/Landing]: Không sử dụng progress/stepers trên popup.
  - *Ghi chú*: Nếu nội dung gồm nhiều bước thực hiện thì nên hiển thị dưới dạng child page
- **BB_054** [Web/Win/Mobile/Landing]: Nội dung trên popup không phải cuộn dọc để xem hết.
  - *Ghi chú*: Nếu quá nhiều control thì chuyển thành new child page
- **BB_055** [Mobile]: Khi hiển thị quá nhiều nội dung ở popup, nên hiển thị ở chế độ full-screen.
- **LT_020** [Web/Win/Landing]: Popup trên WEB và WINFORM gồm các yếu tố cơ bản: tiêu đề, nội dung và hành động (button)
- **LT_021** [Web/Win/Landing]: Diện tích popup không nên chiếm quá 50% màn hình.
  - *Ghi chú*: Trong trường hợp nhiều thông tin (ví dụ details của 1 bản ghi), phải scroll popup, thì nên đưa thành hẳn một new page. — Nếu width chiếm quá 2/3 màn hình là coi như Fail.
- **LT_022** [Web/Win/Mobile/Landing]: Không thiết kế popup chồng popup
  - *Ghi chú*: Sử dụng popup chồng popup sẽ làm tăng chiều sâu (z-depth) của trang, gây mất ngữ cảnh trong luồng nghiệp vụ đang thực hiện.
- **LT_023** [Mobile]: Popup trên MOBILE app: — Sử dụng tiêu đề cho các tình huống nguy hiểm, quan trọng.
  - *Ghi chú*: Các popup khác có thể không cần tiêu đề, chỉ cần nội dung và hành động (button) để tiết kiệm diện tích màn hình.
- **LT_024** [Web/Win]: Khi popup dùng để tạo mới bản ghi, thì cần hỗ trợ tạo mới 1 (tạo xong rồi ẩn popup) và tạo mới nhiều (tạo xong thì reset lại nhưng vẫn giữ nguyên popup).
  - *Ghi chú*: Nên: — - Mặc định tạo mới và close popup nếu thành công. — - Cung cấp một checkbox cho người dùng lựa chọn nếu muốn tạo nhiều. Khi chọn checkbox, rồi click Tạo mới, thì sau khi tạo thành công, popup không bị ẩn đi, chỉ có các ô nhập liệu trong popup là được reset lại. — Chú ý: không nên dùng 2 button "Save" và "Save and Close".

## Search box

- **BB_056** [Web/Win]: Thiết kế phần tìm kiếm đơn giản: — Chỉ nên hiển thị một ô điều kiện tìm kiếm (global search). — Tìm kiếm nâng cao (advanced search by query) chỉ nên dùng khi có nhiều dữ liệu phức tạp. — Không nên có quá nhiều tiêu chí tìm kiếm. Vì như vậy người dùng lại phải suy nghĩ xem nhập cái gì vào ô nào, xóa ô nhập cũ đi để nhập sang một ô khác,... => Tốn nỗ lực.
  - *Ghi chú*: Góp ý khắc phục bằng một trong hai cách sau: — - Cách 1: Cần nghiên cứu xem người dùng thường search theo tiêu chí nào => Bỏ bớt các tiêu chí ít dùng. Sau khi có kết quả tìm kiếm thì có thể thêm phần thống kê lọc theo các tiêu chí còn lại. Cách này dễ làm nhưng chưa phải là tối ưu để làm hài lòng người sử dụng. — - Cách 2: hỗ trợ tìm kiếm thông…
- **BB_057** [Web/Win]: Sử dụng một ô textbox cho chức năng Global search trên desktop app. (không dùng icon) — Khi có 1 ô tìm kiếm chung: Không nên sử dụng kiểu dropdown list, fix sẵn giá trị.
  - *Ghi chú*: Khi sử dụng 1 icon user sẽ phải đợi để ô tìm kiếm xuất hiện và tìm kiếm vị trí bắt đầu nhập nội dung tìm kiếm, rồi click 1 hoặc vài lần để focus vào ô tìm kiếm. Sử dụng luôn ô textbox tìm kiếm user sẽ đơn giản chỉ cần nhấn focus vào ô và bắt đầu nhập nội dung.
- **BB_058** [Web/Win]: Nên có 1 button nhấn để tìm kiếm: — - User có thể submit hành động bằng cách nhấn nút Search hoặc nhấn phím Enter. — - Diện tích tương tác của nút phải đủ lớn để user không phải định vị vị trí nhấn nút. — Áp dụng đối với các trang có đối tượng người dùng ở mức độ dưới trung bình về công nghệ.
  - *Ghi chú*: Nút tìm kiếm giúp mọi người nhận ra rằng có thêm một bước để kích hoạt hành động tìm kiếm - ngay cả khi họ thực hiện hành động tìm kiếm bằng cách nhấn Enter
- **BB_059** [Web/Win/Mobile]: Có ô tìm kiếm trên tất cả các trang có nhiều dữ liệu, để hỗ trợ user tiết kiệm nỗ lực tiếp cận dữ liệu mong muốn
  - *Ghi chú*: Nên cung cấp hộp tìm kiếm trên mỗi trang vì nếu người dùng không thể tìm thấy nội dung mà họ đang tìm kiếm, họ sẽ sử dụng chức năng này dù họ đang ở bất cứ đâu trong trang web
- **BB_060** [Web/Win]: Vị trí Search box: — Vị trí thuận lợi nhất cho người dùng là phía trên phía trên của mỗi page. — Không hiển thị Search box các thông tin chung trong menu điều hướng.
- **BB_061** [Web/Win/Mobile]: Chỉ dẫn nội dung search: — 1. Đưa ví dụ cụ thể về nội dung có thể search. — 2. Bổ sung hint trong Search box để làm rõ thông tin mà người dùng có thể tìm kiếm.
  - *Ghi chú*: Chỉ dẫn chỉ nên giới hạn bằng một vài từ (các từ này khả năng cho kết quả tìm kiếm tốt nhất)

## Search result

- **BB_062** [Web/Win/Mobile]: Điều kiện tìm kiếm của người dùng nên được hiển thị lại ở đầu trang kết quả tìm kiếm.
- **BB_063** [Web/Win/Mobile]: Hiển thị tổng số kết quả tìm thấy nổi bật ở đầu trang.
  - *Ghi chú*: Có thể sử dụng font chữ to, đậm
- **BB_064** [Web/Win/Mobile]: Khi không có kết quả tìm kiếm (tìm kiếm không thấy): — - Hiển thị message nổi bật. Giải thích rõ lý do không tìm kiếm được. Có icon 'Not Found' to và ấn tượng nữa thì càng tốt. — - Đề xuất/Gợi ý nội dung tìm kiếm phổ biến khác cho user.
  - *Ghi chú*: Gợi ý cho user: sửa nội dung để tìm kiếm lại, bỏ lọc, gợi ý các thông tin liên quan đến nội dung đã tìm kiếm.
- **BB_065** [Web/Win/Mobile]: Các danh sách dài cần cung cấp tính năng xem thêm các kết quả (View more, View all, Pagination, Infinite scroll) — Không hiển thị toàn bộ dữ liệu trên 1 trang.
  - *Ghi chú*: Trên Mobile thường sử dụng Infinite scroll
- **LT_025** [Web/Win/Mobile]: Lựa chọn bố cục trang kết quả tìm kiếm phù hợp với dữ liệu: — - Kết quả chi tiết thì sử dụng dạng list. — - Kết quả hình ảnh thì sử dụng dạng lưới.
  - *Ghi chú*: Có thể hiển thị kết quả tìm kiếm dạng lưới nếu cần so sánh thông tin chi tiết giữa các kết quả tìm kiếm với nhau ( thường các trang thương mại điện tử, so sánh các sản phầm)
- **LT_026** [Web/Win/Mobile]: Cho phép người dùng lựa chọn cách hiển thị kết quả tìm kiếm: ‘list-view’ or ‘grid-view’ — Chú ý: Chỉ áp dụng với các trang thương mại điện tử
  - *Ghi chú*: Cho phép người dùng có thể chọn cách xem kết quả theo cách thích hợp
- **LT_027** [Web]: Kết quả tìm kiếm ở các trang web thương mại điện tử: Mỗi sản phẩm trong danh sách kết quả phải có: tên sản phẩm, hình ảnh sản phẩm nhỏ và giá cả,…Các thông tin quan trọng khác như còn hàng hay hết hàng, khuyến mại hay không khuyến mại,…

## Password

- **BB_067** [Web/Win/Mobile]: Cung cấp tính năng cho phép người dùng nhìn thấy mật khẩu ở các trang Đăng nhập/ Đăng ký/ Đổi mật khẩu.
  - *Ghi chú*: Nhập thử vào ô mật khẩu, nếu chỉ hiển thị dạng “******” mà không có cách nào nhìn thấy được là Failed.

## Bottom Navigation

- **BB_068** [Mobile]: Tối đa 5 điều hướng và là các chức năng quan trọng thường dùng nhất. — Lý do: nhiều hơn thì diện tích tương tác nhỏ, khó chạm.
  - *Ghi chú*: Khi có nhiều hơn 5 điều hướng và chọn được 4 điều hướng quan trọng thì đưa ra Bottom Navigation, còn các điều hướng ít quan trọng hơn đưa vào menu "More" như hình bên.

## ListView

- **BB_069** [Mobile]: Khi list không có item nào thì cần hiển thị message và chỉ dẫn để người dùng biết lý do, cách thức tạo item (nếu có).
  - *Ghi chú*: Giả sử listview dùng để hiển thị kết quả tìm kiếm: thử tìm với tiêu chí mà dẫn tới không có kết quả nào xem hiện ra cái gì.
- **LT_030** [Mobile]: Các list item được lọc, sắp xếp theo một tiêu chí logic nào đó.
- **LT_031** [Mobile]: Đặt các thông tin phân biệt các list item căn trái. — Đối với các list item có nhiều dòng: đặt các nội dung có tính chất phân biệt các list item ở dòng đầu tiên.

## Message

- **BB_070** [Web/Win/Mobile/Landing]: Nhất quán từ ngữ, khái niệm cho các tình huống, chức năng tương tự.
- **LT_032** [Web/Win/Mobile/Landing]: Message cần thân thiện với user: nội dung rõ ràng, đúng tình huống, không nhấn mạnh lỗi user gây ra mà tập trung chỉ dẫn cách khắc phục, câu đầy đủ chủ vị, có dấu câu, đúng chính tả, biểu cảm thân thiện. Không sử dụng các từ kỹ thuật, câu mang nghĩa ra lệnh, yêu cầu user ‘bắt buộc phải’ nhập/chọn, hay nói người dùng không được làm gì.

## Content

- **BB_071** [Web/Win/Mobile/Landing]: Không viết tắt, trừ khi đó là một thuật ngữ đặc biệt của hệ thống.
  - *Ghi chú*: Chú ý: phải đọc tài liệu dự án, hoặc confirm với dự án các thuật ngữ đặc biệt, tránh đánh giá một cách chủ quan.
- **LT_035** [Web/Win/Mobile/Landing]: Text không có lỗi chính tả/đánh máy, lỗi ngữ pháp câu, lỗi ngữ nghĩa.
- **LT_036** [Web/Win/Landing]: Đối với các đoạn văn dài từ 3 dòng trở lên: độ dài của một dòng tối đa 80 ký tự trên 1 dòng, không bao gồm spaces.
- **LT_038** [Web/Mobile/Landing]: Sử dụng các từ 'Hôm qua, Hôm nay, Ngày mai' thay vì ngày cụ thể
  - *Ghi chú*: Chỉ áp dụng với các thông tin mang tính chất thông báo, cảnh báo, nhắc nhở, xác nhận. — Không áp dụng cho các datatable. — Các ngày khác thì vẫn để theo định dạng là dd/mm/yyyy. — Có thể sử dụng cả 2: Ngày mai (15/05/2020)
- **LT_039** [Web/Win/Mobile/Landing]: Sử dụng số thay vì chữ
  - *Ghi chú*: Chỉ áp dụng với các thông tin mang tính chất thông báo, cảnh báo, nhắc nhở, xác nhận.

## Error page

- **BB_072** [Web/Landing]: Phải có trang báo lỗi HTTP, Exception, Access denied riêng của hệ thống, không dùng trang mặc định. — Trang lỗi nói rõ nội dung lỗi, phải giúp người dùng dễ dàng quay về trang chủ (ví dụ button "Back to Dashboard").
  - *Ghi chú*: Vd 404 HTTP page: Sửa đuôi URL (từng vị trí giữa các slash) cho thêm vài ký tự lạ và Enter. Yêu cầu: hiển thị trang lỗi thân thiện, có button giúp quay về trang login. — Cấu hình trong web.xml hoặc webserver.

## Privacy and policy

- **BB_073** [Web/Mobile/Landing]: - Điều khoản người dùng: Người dùng có quyền biết và đồng ý hoặc không với các điều khoản sử dụng dịch vụ hoặc điều khoản về sử dụng, chia sẻ thông tin cho bên thứ 3. — - Người dùng có quyền lựa chọn mức độ bảo mật tài khoản và mức độ chia sẻ thông tin cá nhân.
  - *Ghi chú*: - Áp dụng ở luồng Đăng ký — - Thiết kế lại thành checkbox

## Customer Experience

- **BB_074** [Web/Mobile/Landing]: Thông tin người dùng: Người dùng cần cung cấp thông tin đầy đủ, chính xác, để sử dụng làm cơ sở dữ liệu người dùng, bao gồm: — - Họ và tên (bắt buộc); — - Số điện thoại (bắt buộc); — - Emai (bắt buộc); — - Giới tính (option); — - Ngày tháng năm sinh (option).
  - *Ghi chú*: - Để thuận tiện cho việc chăm sóc khách hàng, và cung cấp các chính sách ưu đãi. — - Thêm cảnh báo trong trường hợp ứng dụng đó cần thông tin chính xác để hoạt động đúng hoặc để đảm bảo lợi ích cho người dùng. — - Hệ thống khuyến khích người dùng cung cấp thông tin. — - Tuỳ thuộc vào yêu cầu nghiệp vụ của ứng dụng/yêu cầu của các bên.
- **BB_075** [Web/Mobile]: Cá nhân hóa giao diện: Những hệ thống có thể cùng core phát triển nhưng đối với mỗi đối tượng cần có sự thay đổi đảm bảo vẫn có tính nhận diện giữa các đơn vị sử dụng tránh việc nhân bản đơn thuần
- **BB_076** [Web/Win/Mobile]: Có hướng dẫn sử dụng nhanh dạng onboarding hoặc playbook cho người dùng mới hoặc khi có tính năng mới, bên cạnh sử dụng file dạng doc hoặc pdf. Tránh sử dụng file quá technical gây khó khăn cho người dùng
  - *Ghi chú*: - Áp dụng cho các chức năng chính/thường xuyên sử dụng của ứng dụng. — - Thiết kế lại minh hoạ — - Phạm vi áp dụng: ở Tất cả ứng dụng.
- **BB_077** [Web/Win/Mobile/Landing]: Chatbot: Bắt buộc có để hỗ trợ người dùng ở những bước đầu tiên.
  - *Ghi chú*: Yêu cầu chatbot tích hợp trên sản phẩm có chức năng tiếp nhận phản ánh khách hàng
- **LT_040** [Web/Mobile]: Lời chào khi người dùng đăng nhập: Mỗi khi người dùng đăng nhập hoặc sau 1 khoảng thời gian người dùng đăng nhập lại sẽ có lời chào.

## Textbox

- **LT_005** [Web/Win/Mobile]: Chỉ rõ cấu trúc của trường dữ liệu và độ dài cần thiết. — Đặc biệt đối với các dữ liệu có định dạng đặc biệt, nên có ví dụ minh họa dữ liệu đúng ở inline-label hoặc chỉ dẫn (hint) ngay phía dưới ô nhập liệu.
  - *Ghi chú*: Các textbox nhập các giá trị phức tạp như Date, Số bảo mật của Thẻ tín dụng,… cần được test kỹ xem: đã hướng dẫn người dùng cách nhập liệu đúng định dạng chưa.

## Language

- **LT_013** [Web/Win/Mobile/Landing]: Thông tin ngôn ngữ sử dụng được hiển thị rõ ràng. — Có tên ngôn ngữ rõ ràng bằng text, cờ +text, hoặc cờ + tooltip.
  - *Ghi chú*: Áp dụng trong trường hợp sử dụng từ 2 ngôn ngữ trở lên. — VD: — 1. Chỉ hiển thị cờ các nước mà ko có text hay tooltip để biết ngôn ngữ cuả nước nào > Fail. — 2. Không nhận biết được đang chọn ngôn ngữ nào trong list > Fail.

## Icon

- **LT_015** [Web/Win/Landing]: Đối với các action chính và tại các vị trí có diện tích rộng: — Không sử dụng chỉ icon, sử dụng 'icon + text'.
  - *Ghi chú*: Nếu chỉ có icon, người dùng phải mất công di chuột vào để đọc tooltip hoặc nhấn thực hiện rồi mới biết là hành động gì. Thậm chí ko nhận biết được là có thể tương tác với icon.

## Tabs

- **LT_028** [Mobile]: Không sử dụng quá 4 tab cố định. — Khi nhiều hơn 4 tab thì sử dụng scrollable tab.

## Gesture-based Navigation

- **LT_029** [Mobile]: Điều hướng >> Gesture-based Navigation: — Cần phải thiết kế cách thức tương tự các ứng dụng có sẵn/cùng loại. Cần đảm bảo đây không phải là cách duy nhất để thực hiện chức năng.
  - *Ghi chú*: Tìm các ứng dụng nổi tiếng, phổ biến trên các OS tương tự, và có chức năng tương tự. Nếu họ gạt trái để hiện ra action icons, thì ứng dụng của mình cũng nên làm như vậy. — Ví dụ, danh sách email ở Gmail có thể gạt ngang để archive; Danh sách tin nhắn, gạt trái để Xóa.

## Export to Excel

- **LT_033** [Web/Win/Mobile/Landing]: Khi search rồi export, thì file Excel xuất ra nên chứa cả tiêu chí tìm kiếm/thời gian xuất file để người dùng sau này xem lại có thể biết được chính xác file này chứa thông tin gì.
  - *Ghi chú*: Có thể để thời điểm xuất file ở cả tên file xuất ra. — Nếu SP có biểu mẫu quy định thì phải xuất theo đúng biểu mẫu
- **LT_034** [Web/Win/Mobile/Landing]: File Excel xuất ra cần config sao cho người dùng dễ xem file. Ví dụ, freezed (đóng băng) sẵn các header của bảng để khi có nhiều dữ liệu, người dùng kéo xuống vẫn biết được cell nào có ý nghĩa gì.

## Access Right

- **LT_037** [Web/Win/Mobile]: Đối với các action không thể thực hiện được do không đầy đủ các điều kiện thực hiện như: quyền truy cập, trạng thái dữ liệu. — Cần: disable, invisible chức năng, hoặc có các helptext chỉ dẫn để user có thể thực hiện được chức năng, nếu có. — Không áp dụng với các chức năng yêu cầu premium level (vẫn visible chức năng, nhưng khi nhấn thì mở ra các thông báo cần thiết để user nâng cấp level)
  - *Ghi chú*: Vd: — 1. Action không thực hiện được khi chưa login: thay vì cho user thực hiện xong mới yêu cầu login, thì nên có helptext chỉ dẫn việc 'login trước khi thực hiện'. — 2. Do phân quyền mà một số chức năng user sẽ không thực hiện được: cần disable/invisible chức năng ngay từ đầu. Tránh làm tốn nỗ lực user một cách vô ích, thực hiện xong rồi mới báo…
