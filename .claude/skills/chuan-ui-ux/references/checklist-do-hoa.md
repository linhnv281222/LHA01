# Checklist UX — Giai đoạn Thiết kế đồ họa (Visual Design)

Áp dụng khi quyết định typography, màu sắc, icon, spacing, trạng thái UI element. Luật BB_xxx = Rất quan trọng (bắt buộc pass), LT_xxx = Quan trọng.

## Mục lục nhóm luật

Favicon, Launcher Icon, Typography, Menu, Tabs, Layout, Message, Label, Button, Date Picker, Color, Dropdown, Icon, Data Table, UI element, Content, Search box, Form, Tabs, Touch target size, Breadcrumb, Popup, AppIcon, App bar, Bottom Navigation, ListView

## Favicon

- **BB_078** [Web/Landing]: Favicon phải rõ nét, không nên có qúa nhiều chi tiết và nhiều text vì favicon vốn đã rất nhỏ (16x16px). — Favicon và logo nên đồng bộ với nhau thể hiện tính nhất quán trong nhận diện hệ thống.
  - *Ghi chú*: Không đưa text dài vào favicon. — Favicon cần nổi bật trên cả nền sáng và tối. (favicon nên có sẵn màu nền riêng) — ***Không áp dụng đối với các favicon do KH yêu cầu. (nên tư vấn cho KH)

## Launcher Icon

- **BB_079** [Mobile]: Yêu cầu: — - Đơn giản, dễ nhớ; — - Màu sắc phù hợp với logo chủ đạo; — - Tránh sử dụng tên ứng dụng trên launcher icon; — - Có trọng lượng tương đương các launcher icon phổ biến khác.

## Typography

- **BB_080** [Web/Win/Mobile/Landing]: Font chữ phải được sử dụng nhất quán và dễ nhìn. — - Không sử dụng quá 3 fonts trong 1 ứng dụng (kể cả Logo Font). — - Không sử dụng font chữ có chân cho body text (trừ magazine: thuộc dòng serif, ví dụ Times-New Roman). — - Đối với các nội dung quan trọng/ thường đọc: sử dụng font tối thiểu là 14pt để đảm bảo không bị mỏi mắt.
  - *Ghi chú*: Nhìn xem font hiển thị tiếng Việt có dễ đọc không, có bị lỗi font không. — Landing page: min fontsize: 16pt. — Kiểm tra trên SP: Vào ứng dụng, thấy chỗ nào nghi ngờ nhiều loại font thì F12, focus vào từng khu vực thông tin để xem đang dùng font gì. — Trường hợp loại trừ: — - Các trang tin tức có các trang design kiểu magazine riêng theo chủ đề…
- **BB_081** [Web/Win/Mobile/Landing]: Text trên trang cần có mức độ phân cấp rõ ràng: header, subheader, bodytext, caption. — Cấp độ highlight giảm dần. — Phân biệt và nhất quán fontstyle (font, size, weight, color, texture,...) giữa các cấp độ text.
  - *Ghi chú*: Text trên trang nên có ít nhất 3 mức độ phân cấp: header, subheader, bodytext. Cấp độ highlight giảm dần. — VD: font chữ header 40pt normal, subheader: 28pt bold, bodytext 18pt normal.
- **BB_082** [Web/Win/Mobile]: Không sử dụng chữ in nghiêng (italic), chữ in đậm (bold), chữ in hoa (all caps), trừ khi muốn highlight một số nội dung có ít text.
  - *Ghi chú*: Các sản phẩm thường hay gặp vấn đề: — - Quá nhiều label viết đậm; — - In nghiêng cả một đoạn văn dài; — - Label, menu và button toàn viết hoa, không biết là ý đồ muốn nhấn mạnh sự chú ý vào đâu.

## Menu, Tabs

- **BB_083** [Web/Win/Mobile/Landing]: Selected menu/tab và Unselected menu/tab cần được phân biệt rõ bằng dấu hiệu hình dạng, hoặc màu tương phản.
  - *Ghi chú*: Chú ý: Chỉ sử dụng màu sắc có thể khiến người dùng mù màu khó phân biệt. — Cách thường dùng (standard way) để làm nổi bật với hình dạng là đặt một gạch chân đậm bên dưới nhãn.

## Layout

- **BB_084** [Web/Win/Landing]: Diện tích tương tác tối thiểu của các UI element để click: 25x25px @1x. Khoảng cách giữa 2 element kề cận, tương tác được, tối thiểu là 8px @1x.
  - *Ghi chú*: Đối với non-touch-UIs

## Message

- **BB_085** [Web/Win/Mobile/Landing]: Global message/Feedback message: — 1- Là message thông báo từ phía backend gửi về front-end, cho người dùng biết kết quả việc thực thi một action nào đó. Do đó, message chỉ là thông báo, không được bắt người dùng phải xác nhận kết quả (click button OK). — 2- Cần thiết kế sao cho người dùng dễ dàng nắm bắt thông tin (thông báo chung/thành công/cảnh báo/thất bại) bằng các yếu tố theo thứ tự là: màu sắc >> icon >> message. — 3- Vị trí đặt message không che khuất các control quan trọng khác của ứng dụng.
  - *Ghi chú*: Có 2 cách đặt vị trí: — + Đặt ở trong form mà đã submit hành động đó, phía trên cùng của các ô nhập liệu, và không che mờ các control của form, chỉ ẩn đi (reset lại) khi người dùng submit button hoặc người dùng click tắt. Chú ý: nếu form là popup, sau khi thực thi xong phải tắt form đi thì không dùng cách này được. — + Đặt ở cạnh trên/dưới màn…
- **BB_112** [Web/Mobile]: Validation message: — Là message báo cho người dùng biết ô nhập liệu nào bị sai điều kiện ràng buộc (ví dụ: không để rỗng, không đúng định dạng,...). — Yêu cầu: — - Message phải giúp người dùng dễ dàng tìm vị trí lỗi. — - Vị trí đặt message không che khuất các control quan trọng khác của ứng dụng. — Ví dụ, khi người dùng nhập thông tin không hợp lệ vào một trường, ứng dụng sẽ đổi màu border ô nhập liệu thành đỏ/vàng, có message ngay bên dưới, đồng thời trỏ chuột vào ô nhập lỗi đó.
  - *Ghi chú*: Thử nhập liệu vào form sao cho giá trị không hợp lệ, đặc biệt là nhập không hợp lệ các ô nhập liệu phức tạp, xem báo lỗi ở đâu và như thế nào.
- **LT_053** [Web/Win/Mobile]: Tất cả các alert messages cần nhất quán visual style, vị trí, tình huống trong toàn hệ thống.

## Label

- **BB_086** [Web/Win/Mobile/Landing]: Không được để label lửng lơ giữa 2 ô nhập liệu khiến người dùng nhầm lẫn không biết label này là giải thích cho ô nhập liệu nào.
- **BB_114** [Web/Win/Mobile/Landing]: Phải viết hoa từ đầu tiên. Không dùng toàn bộ label là chữ in hoa

## Button

- **BB_087** [Web/Win/Mobile/Landing]: Cần phải bo viền button, không sử dụng góc vuông (vì vấn đề Contour Bias).
  - *Ghi chú*: Thông thường bo góc (border-radius) min khoảng 2px tới 3px (@1x).
- **BB_088** [Web/Win/Mobile]: * Cần phân biệt 3 loại button sau: — - Positive – Changes, sends, or adds information — - Neutral – Makes no change or takes users back a screen (e.g. Cancel) — - Negative – Deletes, resets or blocks information — * Sau đó thiết kế cấp độ tương phản màu sắc theo công thức từ cao tới thấp là: Positive > Negative > Neutral.
  - *Ghi chú*: Thiết kế phân biệt Primary vs Secondary action button trong một form nhằm giảm thiểu việc người dùng gây ra lỗi (do không nhận biết được Cancel hay Save chẳng hạn). — Button nào quan trọng nhất (Call To Action - CTA) thì cần bắt mắt nhất để gây sự chú ý tới người dùng và nên đặt bên tay phải.
- **LT_042** [Web/Win]: Sử dụng cả icon lẫn tên trong button, để giúp người dùng nhìn thoáng qua icon cũng biết được button đó làm gì, cần đảm bảo: — - Icon cùng màu label trong mọi trường hợp hover/ active/ focus/… — - Icon height tương đương với lineheight của button label.
  - *Ghi chú*: .
- **LT_043** [Web/Win/Mobile/Landing]: Hiệu ứng khi tương tác với các button cần rõ ràng cho từng trạng thái

## Date Picker

- **BB_089** [Web/Win/Mobile]: Cuối ô nhập liệu ngày/tháng/năm nên có icon thể hiện là 'chọn được từ calendar', không chỉ là gõ nhập.
- **BB_090** [Web/Win/Mobile]: Khi mở ra một Date Picker thì bảng chọn ngày/tháng/năm cần chỉ rõ current date ở đâu.

## Color

- **BB_091** [Web/Win/Mobile/Landing]: Màu sắc các thành phần giao diện rất quan trọng (label, input text, icon…), so với màu nền cần có sự tương phản tốt, để bảo đảm dễ đọc và nhận biết được ở các trạng thái khác nhau. — 1.Trạng thái active của text với mục đích truyền tải nội dung: — - Text dưới 18pt regular nên có độ tương phản tối thiểu là 4.5:1. — - Text lớn (từ 14pt bold/ 18pt regular) thì nên có độ tương phản tối thiểu là 3:1. — (Độ tương phản tối thiểu tốt nhất là 7:1 (chuẩn AAA)) — 2. Các non-text UI elements không đi kèm visible text (các chi tiết trên icon so với màu nền, các trạng thái của từng UI elements): độ tương phản tối thiểu 3:1 — 3. Trường hợp loại trừ: — - Trạng thái inactive, disable — - Text được dùng không phải với mục đích truyền tải nội dung: text là một phần nội dung của ảnh để trang trí, text trên ảnh chụp thực tế, ảnh chụp màn hình, logo, brand name.
  - *Ghi chú*: * Cách 1 (dùng khi test UX): sử dụng công cụ để đo mã màu: https://addons.mozilla.org/en-US/firefox/addon/colorzilla/. — => Tính toán contrast ratio bởi link: http://leaverou.github.io/contrast-ratio/. Trong đó nó có kết luận là có đạt tiêu chuẩn hay không sẵn rồi. — * Cách 2 (thường dùng khi thiết kế hoặc góp ý cho đội thiết kế/dự án) chọn màu…
- **BB_092** [Web/Win/Mobile/Landing]: Không sử dụng quá 4 màu text trên 1 màn hình. — (không bao gồm text trên button, message, status)
- **BB_093** [Web/Win/Mobile/Landing]: Chỉ sử dụng text màu đỏ để báo lỗi, không dùng để hiển thị các thông tin thông thường (trừ khi cần gây sự chú ý đặc biệt).
- **LT_044** [Web/Win/Mobile/Landing]: KHÔNG sử dụng chỉ màu sắc để phân biệt các trạng thái, hành động, thông tin. Vì với những người suy giảm thị lực về màu sắc sẽ không thể phân biệt. — Ngoài màu sắc, cần có các ký hiệu hình học, biểu tượng, hoặc text để phân biệt kèm.

## Dropdown

- **BB_094** [Web/Win/Mobile/Landing]: Khi di chuột qua hoặc nhấn chọn các item của dropdown, cần phải có hiệu ứng rõ nét cho người dùng biết mình đang di chuột vào item nào.
- **BB_095** [Web/Win/Mobile/Landing]: Item được chọn trong dropdown cần được highlight nổi bật và khác biệt hiệu ứng với các trạng thái khác
- **BB_096** [Web/Win/Mobile/Landing]: Độ cao của các item trong dropdown list cần đảm bảo diện tích tương tác và dễ đọc text.
  - *Ghi chú*: Gợi ý: — Min Text padding: 5px (8dp) @1x — Min Item Height: 32px (32dp) @1x — Min left/right margin: 16px (16dp) @1x
- **LT_045** [Web/Win/Mobile/Landing]: Dropdown list mở ra cần có trục Oz cao hơn, hơi đổ bóng, border rõ ràng để phân biệt với nội dung màn hình cha.
  - *Ghi chú*: Item list tắt khi: nhấn ra ngoài, chọn 1 item trong list, nhấn button trên list.

## Icon

- **BB_097** [Web/Win/Mobile/Landing]: Hình ảnh icon phù hợp ý nghĩa chức năng mà nó đại diện.
  - *Ghi chú*: Nếu thấy icon không phù hợp thì nên tìm và góp ý cho dự án icon phù hợp hơn. Ví dụ, tìm ở link: http://iconfinder.com/ — http://www.flaticon.com/
- **BB_098** [Web/Win/Mobile]: Sử dụng Icon phải nhất quán cho chức năng tương đồng trên các màn hình khác nhau.
  - *Ghi chú*: Ví dụ: Cùng 1 loại chức năng Edit, nhưng ở 2 màn hình khác nhau lại sử dụng 2 icon khác nhau, là Failed. — Cùng 1 icon nhưng lại sử dụng cho 2 chức năng ý nghĩa khác nhau cũng Fail.
- **BB_099** [Web/Win/Mobile/Landing]: Icon phải nhất quán phong cách thiết kế cho từng nhóm thông tin đại diện trong toàn bộ ứng dụng.
  - *Ghi chú*: The same in terms of level of detail, optical weight, stroke weight, position, and perspective
- **BB_100** [Mobile]: Đối với icon tương tác được phải có các hiệu ứng rõ nét khi chạm vào như đổi màu nền hoặc màu icon, thay đổi kích cỡ,...
- **BB_101** [Mobile]: Khoảng cách tối thiểu cho các action icon (icon tương tác được) trên mobile: 8dp @1x

## Data Table

- **BB_102** [Web/Win/Mobile]: Các dòng chẵn/lẻ phải là dạng màu sắc ngựa vằn cho dễ đọc.
  - *Ghi chú*: VD: — - Dòng chẵn: #ffffff — - Dòng lẻ: #f0f3f5 — - Màu viền: 1px solid #c9cdd2 — - Khi di chuột vào 1 dòng: #c9cdd2 — Chú ý: Phải bảo đảm màu chữ đạt độ tương phản tốt với mọi màu nền ở các dòng chẵn/lẻ/hover/selected.
- **BB_103** [Web/Win]: Text trong các cell phải có padding tối thiểu 5px
- **LT_046** [Web/Win/Mobile]: Đối với các cột thông tin như Trạng thái xử lý, thì nên thiết kế dạng icon hoặc màu sắc phân biệt, để có thể tiết kiệm nỗ lực đọc của người dùng (chỉ cần nhìn lướt qua là biết dòng đó đang ở trạng thái nào).

## UI element

- **BB_104** [Web/Win/Mobile/Landing]: Nhất quán 1 màu sắc cho các UI element có thể tương tác trong toàn bộ hệ thống. — Vì dụ: Chọn màu blue là màu tương tác thì tất cả chỗ nào có text tương tác sử dụng màu blue. Các text còn lại tránh dùng màu này.
- **BB_105** [Web/Win/Mobile]: Nhất quán style (color, bgcolor, fonttype, fontsize, fontstyle, shape, elevation, label alignment, states, ...) cho các UI element trong toàn bộ hệ thống.
  - *Ghi chú*: Ví dụ: — 1. Các input control đều sử dụng border, radius = 2px, có top left aligned label và nền trắng, — 2. Các nút positive fill nền, đặt ở bên phải (với ý nghĩa điều hướng Next, khuyến khích user thực hiện hành động).

## Content

- **BB_106** [Web/Win/Mobile/Landing]: Lineheight nên ít nhất gấp 1,5 lần fontsize. — VD: fontsize =16 thì lineheight = 1.5x16 = 24.
- **BB_107** [Web/Win/Mobile/Landing]: Khoảng cách giữa các paragraphs: 1.25x fontsize — VD: — Fontsize 16, lineheight 24, paragraph spacing 20; — Fontsize 20, lineheight 30, paragraph spacing 25
- **BB_108** [Web/Mobile/Landing]: Paragraph: — Tránh các từ phải nối dòng (hyphenated word) và các dòng mồ côi (orphan).

## Search box

- **BB_109** [Web/Win/Mobile]: Kích thước ô tìm kiếm nên có độ dài tối thiểu đủ chứa 27 ký tự, không bao gồm spaces. — (Suggest: Width: 450px, height: 44px. — Trên Mobile App, ô Search dài hết chiều ngang màn hình, khoảng 300px)
  - *Ghi chú*: User có thể dễ dàng nhìn thấy ô tìm kiếm và sửa lại mà không phải cuộn text trong ô tìm kiếm.
- **LT_047** [Web/Win/Mobile]: Search icon: — Sử dụng một biểu tượng kính lúp đơn giản, ít chi tiết đồ họa.
  - *Ghi chú*: Icon này quen thuộc tới nỗi người dùng có thể nhận ra nó thậm chí không cần có label.

## Form

- **BB_110** [Web/Win/Mobile/Landing]: Thông tin bắt buộc nhập: — - Phải có dấu hiệu phân biệt rõ ràng giữa các trường thông tin bắt buộc và không bắt buộc. — - Nhất quán dấu hiệu phân biệt trong toàn bộ hệ thống. — - Có chú thích để user nhận biết dấu hiệu bắt buộc nhập.VD: *: thông tin cần nhập đầy đủ.
  - *Ghi chú*: Chú ý: thường phân biệt bằng dấu *. Có 1 số dự án Viettel phân biệt bằng icon hình tam giác mờ ở đầu label nhìn khá khó hiểu và khó phân biệt.
- **LT_048** [Web/Win/Mobile/Landing]: Các input data control cần có dấu hiệu trực quan rõ ràng về khả năng click (clickability and empty space).
  - *Ghi chú*: Nền ô nhập liệu cần cho sáng hơn nền của form để user focus, làm rõ sự trống rỗng chưa có dữ liệu của textbox. — Nếu là khác màu nền thì nên sáng hơn. Cùng màu nền thì có border phân biệt rõ.
- **LT_052** [Mobile]: Độ rộng của lề trái, phải ít nhất 16dp @1x

## Tabs

- **BB_111** [Mobile]: Cần phân biệt rõ trạng thái của các TAB (normal, hover, focused, pressed)

## Touch target size

- **BB_113** [Mobile]: Diện tích tương tác ít nhất 48x48dp @1x.

## Breadcrumb

- **BB_115** [Web/Win]: Dấu phân cách trên breadcrumb cần thể hiện chỉ hướng như ">". Không dùng "|" hoặc "/" vì những ký tự này biểu thị sự ngang hàng chứ không phải dẫn đường.

## Popup

- **BB_116** [Web/Win/Mobile/Landing]: Màu nền xung quanh (overlay) tối vừa phải, giúp người dùng tập trung vào nội dung của popup và người dùng biết rằng trang nền hiện không hoạt động.
  - *Ghi chú*: Khi overlay không hợp lý, thì F12 rồi focus vào phần overlay, chỉnh thử mã màu xem có phù hợp không, chụp ảnh gợi ý cho dự án. (VD dùng màu #000000 và chỉnh Opacity)

## AppIcon

- **LT_041** [Win]: Windows application icon: — - Icon phải rõ nét, không nên có qúa nhiều chi tiết và nhiều text. — - Icon và logo nên đồng bộ với nhau thể hiện tính nhất quán trong nhận diện hệ thống. — - App icon cần có tối thiểu các cỡ sau: 16, 32, 48 and 256. — (Để đảm bảo cover tất cả các standard resolutions, bao gồm thêm các cỡ 20, 24, 40, 60, and 72.)
  - *Ghi chú*: ***Không áp dụng đối với các icon do KH yêu cầu. (nên tư vấn cho KH) — Windows sử dụng app icon ở các vị trí: — Desktop shortcut — Start menu — Taskbar — Taskbar pop-up — Form control (góc trên bên trái các WinApp) — Task manager — Task switcher

## App bar

- **LT_049** [Mobile]: Các action icon trên app bar cùng màu.
  - *Ghi chú*: Appbar Min Height: — Mobile Landscape: 48dp @1x — Mobile Portrait: 56dp @1x

## Bottom Navigation

- **LT_050** [Mobile]: Không sử dụng các icon/label có nhiều màu khác nhau. Thay vào đó, nên sử dụng màu Primary của ứng dụng cho Menu Item được chọn.
  - *Ghi chú*: So sánh màu Primary của ứng dụng và màu icon/label. — Chú ý: cần đo chính xác mã màu.
- **LT_051** [Mobile]: Các menu item phải bao gồm icon + text, không sử dụng chỉ icon.
  - *Ghi chú*: Gợi ý thiết kế: @1x — -Height: 72dp — -Icon: 24 x 24dp — -Text and icon căn giữa — -Padding: — 10dp between icon and text — 16dp under text — 'Text: — - 14sp Roboto Medium — - 12sp when wrapped across a maximum of two lines — - Horizontally and vertically centered

## ListView

- **LT_054** [Mobile]: Icon sử dụng ở đầu mà không có tính chất phân biệt list item thì bỏ. (không áp dụng đối với các list là kết quả của việc tìm kiếm hoặc lọc)
