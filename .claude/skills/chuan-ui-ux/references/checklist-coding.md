# Checklist UX — Giai đoạn Coding / Implement

Áp dụng khi implement FE: behavior, validation, keyboard, session, upload, virtual keyboard. Luật BB_xxx = Rất quan trọng (bắt buộc pass), LT_xxx = Quan trọng.

## Mục lục nhóm luật

Theme, Layout, Menu, Form, Interaction, Message, Label, Button, Radio button, Checkbox, Dropdown, Language, Upload, Icon, Data Table, UI element, Content, Popup, Search box, Search result, Session, AppError, Hamburger menu, Virtual Keyboard, ListView, Nguyên tắc hé lộ thông tin, Pagination, Switch, Breadcrumb, Textbox, Access Right, Bottom Navigation, Listview, Customer Experience

## Theme

- **BB_117** [Web/Landing]: Phải có favicon để nhận diện ứng dụng trên browser.
  - *Ghi chú*: Mở trình duyệt, vào ứng dụng, rồi bookmark ứng dụng lại. Yêu cầu: — - Trên tab của trình duyệt có favicon (cả trạng thái chưa login và đã login); — - Ở danh sách bookmarked có favicon; — Không dùng icon mặc định của Web server (ví dụ hình con mèo của Appache Tomcat). — Từ ảnh thiết kế, có thể sử dụng tool để generate ra bộ favicon cần thiết:…
- **BB_118** [Web]: Logo của web/ứng dụng phải nằm ở cùng một vị trí trên tất cả các trang và khi bấm vào sẽ trở về cùng một trang (trang chủ).
  - *Ghi chú*: Vào lần lượt từng menu xem logo nằm ở đâu. Click vào logo/tên ứng dụng xem có quay về trang chủ không.

## Layout

- **BB_119** [Web/Win/Mobile/Landing]: Trang được thiết kế dạng lưới cơ bản, khoảng cách giữa các UI element cân đối, căn chỉnh, gióng hàng thẳng/đều.
  - *Ghi chú*: Vào ngẫu nhiên vài menu và xem label/ô nhập liệu có được căn chỉnh đúng dạng lưới không (dóng hàng ngang và dọc).
- **LT_055** [Web/Win/Landing]: Ứng dụng cho phép sử dụng mà không phải scroll ngang.
  - *Ghi chú*: Nhìn lướt thử qua các trang xem có phải scroll ngang không.

## Menu

- **BB_120** [Web/Win/Mobile/Landing]: Người dùng có thể dễ dàng lựa chọn một menu item mong muốn.
  - *Ghi chú*: Vd trường hợp Fail: — 1.Khi chọn submenu từ leftmenu (TieredMenu), di chuột chéo từ menu cha qua submenu list thường bị close lại và mở submenu khác. Người dùng phải di chuột cẩn thận trong phạm vi tương tác của menu cha và submenu mới chọn được. — 2.Leftmenu: menu bị thu hẹp mở rộng, chạy vị trí rất khó kiểm soát. Menu list dài bị ẩn phải cuộn…
- **BB_121** [Web/Win/Landing]: Khi click vào menu item thì trang load ra phải trên cùng cửa sổ (interlink), không được load sang tab mới hoặc new windows của trình duyệt. — External link thì mở new tab hoặc new windows, không mở cùng tab với ứng dụng
  - *Ghi chú*: Mục đích: thể hiện sự nhất quán, kết nối thông tin của ứng dụng. — Nếu ứng dụng có nhu cầu mở cùng lúc nhiều menu thì nên hiển thị multi tabs ngay trong ứng dụng. — Internal link: link tới các trang trong cùng website của mình. — External link: link tới các website khác ngoài ứng dụng.

## Form

- **BB_122** [Web/Win/Landing]: - Khi mở form, trỏ chuột phải focus vào UI element đầu tiên có thể tương tác được. — - Luồng tab và shift tab di chuyển qua tất cả các editable element trên form, theo luồng từ trái sang phải, từ trên xuống dưới.
  - *Ghi chú*: - Tất cả các object có thể tương tác đều tab focus được để user có thể thực hiện thao tác bằng cả chuột và bàn phím: menu, textbox, checkbox, radiobutton, hyperlink, button, icon chức năng, calendar,… — - Có button chức năng mặc định (default button: user chỉ cần nhấn Enter là có thể thực hiện chức năng button, ngoài tab focus)
- **BB_123** [Web/Win/Mobile/Landing]: Dữ liệu phải được kiểm tra tính hợp lệ cơ bản nhất tại client trước khi gửi (submit) lên server. — Một dữ liệu được coi là hợp lệ khi đạt các tiêu chí như: định dạng dữ liệu cho phép, độ dài/dung lượng cho phép, nhập đủ các trường bắt buộc,…
  - *Ghi chú*: Web: — * Chuẩn bị: F12 >> Tab Network >> Click "Reload" >> Click thùng rác để xóa all trước khi test. — * Test: điền linh tinh sao cho không hợp lệ, rồi click submit button. Yêu cầu: — - Không được có lệnh POST lên server; — - Form báo lỗi nhập liệu. — Winform/Tablet/Mobile: — Thử tắt mạng đi và submit, yêu cầu phải báo ra message lỗi nhập liệu…
- **BB_124** [Web/Win/Landing]: Khi Enter phải focus vào một button quan trọng và an toàn nhất (default button). — - Ví dụ khi edit hoặc search thì focus vào button "Lưu"/"Tìm kiếm". — - Đối với các thao tác chức năng nguy hiểm (xóa, từ chối, reset,…), cần default vào button Cancel.
  - *Ghi chú*: Chú ý: khi enter thì button đó cũng phải có hiệu ứng đổi màu.
- **BB_125** [Web/Mobile]: Cần hỗ trợ người dùng xóa nhanh text nhập liệu bằng cách: — Hiển thị icon xóa toàn bộ ở cuối ô nhập liệu: — - Khi người dùng focus vào ô nhập liệu. — - Và có ít nhất 1 ký tự đã được nhập, hoặc 1 giá trị đã được chọn. — Áp dụng với các textbox, dropdown, textarea, datetime picker.
  - *Ghi chú*: Khi chưa có dữ liệu trong ô nhập liệu thì không hiển thị icon xóa text.
- **BB_126** [Web/Win/Mobile/Landing]: Sau khi submit và gặp lỗi input không hợp lệ: không được clear những ô nhập liệu đã hợp lệ rồi, để người dùng không phải nhập lại.
- **LT_057** [Web/Win/Mobile/Landing]: Sử dụng tabular figures trong bảng, hoặc những vị trí mà các số cần có có sự gióng hàng theo chiều dọc.
  - *Ghi chú*: Tabular figures sẽ gióng theo chiều dọc từng hàng đơn vị/chục/trăm/..., rõ ràng hơn cho việc scan. — Tabular figures có cùng chiều rộng ký tự, bao gồm chiều rộng của nét, cộng với khoảng trắng ở bên phải và bên trái của nó. — Tabular figures được thiết kế để cho phép các chữ số thẳng hàng trong các bảng, cũng như bảng giá, hóa đơn, báo cáo tài…

## Interaction

- **BB_127** [Web/Win]: Xác nhận (confirm) với người dùng về các thao tác nguy hiểm/quan trọng, ảnh hưởng đến dữ liệu, nhiều user và không thể undo. — Ví dụ: — - các thao tác xóa, từ chối, phê duyệt; — - gửi thông tin quan trọng cho nhiều người; — - confirm về việc mất dữ liệu, nếu có thay đổi, khi close form mà chưa save.
- **BB_128** [Web/Win]: Cho phép người dùng dễ dàng hủy bỏ các tác vụ nguy hiểm, quan trọng. — Ví dụ: người dùng chọn nhầm button xóa -> người dùng có thể Cancel tác vụ xóa và quay trở về màn hình chính. Hoặc có chức năng Undo.
- **BB_129** [Mobile]: Người dùng có thể hủy bỏ thao tác nguy hiểm bằng cách: — - Chọn “Cancel” ở Confirmation Dialog. — - Trên Android: nhấn Back. — - Chạm vào vùng tối xung quanh Dialog.
  - *Ghi chú*: Thử xóa, xem Confirmation dialog có hỗ trợ Cancel hoặc Back lại không. Nếu không có cách nào thì là Failed.
- **BB_130** [Web/Win/Mobile/Landing]: Khi xử lý xong tác vụ, cần phải có thông báo rõ ràng về kết quả thực hiện (kể cả thành công hay thất bại cũng phải thông báo). — Ví dụ: — - Đã thêm mới thành công 20 người dùng mới. — - Thông tin tài khoản đã tồn tại. Hãy chọn một tài khoản khác.
  - *Ghi chú*: Thực thi hành động tạo mới/sửa/xóa cho cả hai trường hợp thành công/thất bại. — Yêu cầu: phải hiện feedback message. Tiêu chí hiện feedbackmessage thì có ở các rule của category Message. — Đối với các trang thương mại điện tử, ngay sau khi submit thanh toán,cần hiển thị summary page rõ ràng những thông tin vừa submit (vd: sản phẩm đã mua, số…
- **BB_131** [Web/Win/Mobile/Landing]: Bất cứ tương tác nào cần hơn 1s để xử lý, thì phải sử dụng Progress Indicator. — Các xử lý có thời gian dài (từ 5s trở lên) cần hiển thị rõ tiến độ hoàn thành, hoặc thời gian còn lại cho user biết.
- **BB_132** [Web/Win/Mobile/Landing]: Không sử dụng các Progress Indicator dạng tĩnh. — Ví dụ chỉ sử dụng text “Loading…” hoặc “Please wait…” mà không có bất kỳ hiệu ứng chuyển động nào.
- **BB_133** [Mobile]: Khi cài đặt phần mềm hay login, cần nhập mã OTP/Activation code để tiếp tục, Nếu số điện thoại trên cùng máy với App, App cần xác nhận quyền truy cập tin nhắn và tự động lấy và đổ thông tin vào ô nhập liệu từ tin nhắn, sau đó tự động tiếp tục bước sau mà user không phải ấn nút Confirm. (Bắt buộc trên Android)
  - *Ghi chú*: Phải xác nhận quyền trước khi access tin nhắn lấy code. Nếu user không cấp thì để họ tự nhập. UX muốn nói ở đây là mình có hỏi xin user quyền để hỗ trợ họ nhập nhanh.
- **LT_059** [Web/Win/Mobile/Landing]: Không hiển thị màn hình trắng tinh hoặc các thông tin kỹ thuật trong quá trình tải trang. — Thông tin nên được load dần dần từng phần.
  - *Ghi chú*: VD trường hợp Fail:

## Message

- **BB_134** [Web/Win/Landing]: Không được hiển thị message là exception của hệ thống hoặc là các thông tin công nghệ/đường dẫn hệ thống. Bởi vì: — - Toàn thông tin kỹ thuật người dùng sẽ không hiểu gì; — - Vi phạm bảo mật thông tin. Những người có hiểu biết sẽ tìm cách hack hệ thống.
- **BB_135** [Web/Landing]: Không sử dụng message là hàm javascript mặc định: alert(), confirm(), prompt(). — Lý do: — - Không thân thiện và nhất quán style dialog/popup chung của hệ thống. — - Có trường hợp block cả trình duyệt;
- **LT_060** [Web/Win/Landing]: Tooltip message: — Trường hợp sử dụng tooltip để hiển thị thông tin trợ giúp, thì tooltip phải chứa đựng thông tin hữu ích chứ không chỉ đơn giản là sao chép nội dung text ở icon, link hoặc label.

## Label

- **BB_136** [Web/Win/Mobile/Landing]: Không wraptext (word, character) label. — Các label cần ngắn gọn, dễ hiểu và trên cùng 1 dòng.
  - *Ghi chú*: Label hạn chế tối đa việc bị wraptext. Các label dài có thể sửa lại cho ngắn. Ví dụ: — -'Nơi đặt cơ sở sản xuất, sử dụng, kho bảo quản *' >> Nơi sử dụng/lưu trữ. — -'Họ tên người phụ trách khai báo*' >> Người khai báo (bên trong box có hint là 'nhập đầy đủ họ tên')

## Button

- **BB_137** [Web/Win/Mobile/Landing]: Disable hoặc block Submit button ngay khi người dùng vừa click, để tránh click nhiều lần, đặc biệt nhất là lúc lưu thông tin sửa/xóa/tạo mới thành công. — Trường hợp loại trừ: — - Nhấn nút khi chưa hết lỗi validation — - Nút "Tìm kiếm"
  - *Ghi chú*: WEB App: — Click 2 lần thì không có 2 lệnh POST — Tablet/Mobile/Win App: — Khi chạm vào button Submit thì phải disable hoặc block màn hình, và có hiệu ứng processing.

## Radio button

- **BB_138** [Web/Win/Mobile]: Phải luôn có một lựa chọn mặc định, và lựa chọn đó là an toàn hoặc thường dùng nhất.
- **BB_139** [Web/Win/Mobile]: Khi nhấn vào label của option thì cũng phải coi như nhấn được vào option, vì diện tích tương tác lớn thì người dùng thuận tiện thao tác hơn.
- **LT_061** [Web/Win/Mobile]: Các lựa chọn ở radio button nên được sắp xếp theo một thứ tự logic, vd: — - Theo thứ tự quan trọng: cao xuống thấp; — - Theo ABC nếu không biết sắp xếp thế nào là quan trọng.
  - *Ghi chú*: Cần xác nhận với dự án để xác nhận xem các thông tin thì cái nào quan trọng nhất, xem có đúng sắp theo thứ tự quan trọng không.

## Checkbox

- **BB_140** [Web/Win/Mobile]: Khi nhấn vào label của option thì cũng phải coi như nhấn được vào option, vì diện tích tương tác lớn thì người dùng thuận tiện thao tác hơn.
- **BB_141** [Web/Win/Mobile]: Các lựa chọn ở checkbox nên được sắp xếp theo một thứ tự logic, vd: — - Theo thứ tự quan trọng: cao xuống thấp; — - Theo ABC nếu không biết sắp xếp thế nào là quan trọng.
  - *Ghi chú*: Cần xác nhận với SPDA để xác nhận xem các thông tin thì cái nào quan trọng nhất, xem có đúng sắp xếp theo thứ tự quan trọng không.

## Dropdown

- **BB_142** [Web/Win/Mobile/Landing]: Các item trong dropdown phải được sắp xếp theo một thứ tự logic. Ví dụ: — - Theo thứ tự quan trọng: cao xuống thấp; — - Theo ABC nếu không biết sắp xếp thế nào là quan trọng.
  - *Ghi chú*: Có thể kết hợp cả 2: quan trọng và ABC. Dropdown list có thể chia thành 2 phần: quan trọng (ví dụ lựa chọn gần đây nhất) bên trên, phân tách 1 đường kẻ nhẹ, và ABC các phần còn lại.
- **BB_143** [Web/Win/Mobile/Landing]: Các giá trị đặc biệt như "--Select all--" hoặc chỉ dẫn "--Chọn--" cần thiết kế sao cho phân biệt với các giá trị thật của dropdown và nhất quán trong toàn hệ thống.
- **BB_144** [Web/Win/Mobile/Landing]: Các dropdown là bắt buộc nhập thì không để giá trị mặc định là 1 trong các giá trị hợp lệ, người dùng có thể sẽ bỏ qua không chọn giá trị đúng. => Gây lỗi dữ liệu. — Áp dụng với các màn hình thêm mới hoàn toàn.
- **BB_145** [Web/Win/Mobile/Landing]: Khi dropdown có nhiều tùy chọn (>= 10), thì hỗ trợ search, gõ và auto-suggestion để người dùng dễ dàng lựa chọn được item mong muốn.
  - *Ghi chú*: Gõ thử vào textbox xem có tự filter danh sách item để chọn không.
- **BB_146** [Web/Win/Landing]: Khi dropdown có ít tùy chọn, không hỗ trợ gõ/auto-suggestion thì cần hỗ trợ: gõ chữ cái đầu tiên vẫn suggest nhảy tới item có từ đầu tiên đó.
- **LT_062** [Web/Win/Landing]: Khi tab-focus vào dropdown thì hiện luôn ra danh sách item như khi click chuột để người dùng dễ dàng dùng mũi tên di chuyển lên/xuống để lựa chọn.
- **LT_063** [Web/Win/Mobile/Landing]: Các dropdown là tùy chọn thì nghiên cứu xem người dùng thường chọn option nào nhất thì sắp xếp lên trên cùng item list, để tiết kiệm nỗ lực của người dùng. — Ví dụ, nhập "Quốc tịch", thì dựa vào IP máy hoặc location để gợi ý quốc tịch "Việt nam".

## Language

- **BB_147** [Web/Win/Mobile/Landing]: Khi đang ở chế độ ngôn ngữ nào thì trang cần được chuyển ngữ đúng loại ngôn ngữ đó.
  - *Ghi chú*: Test ngẫu nhiên: thử chuyển ngữ và nhìn qua menu, trang chủ, một vài trang chính xem dịch có hết không, có hiển thị ok không.

## Upload

- **BB_148** [Web/Win/Mobile]: Phải kiểm tra tính hợp lệ định dạng và dung lượng file cho phép trước khi upload lên server. — Yêu cầu: — - Không có lệnh POST lên server khi file không hợp lệ. — - Cần có "Validation Message" báo cho người dùng biết lý do.
  - *Ghi chú*: * Chuẩn bị: F12 >> Tab Network >> Click "Reload" >> Click thùng rác để xóa all trước khi test. — * Test: upload thử 1 file không hợp lệ, nếu vẫn thấy POST ở tab Network là failed. — Mobile: Cách test: chọn file > ngắt kết nối mạng > nhấn nút Upload > hệ thống phải báo lỗi validate định dạng và dung lượng tối đa. Ko báo lỗi mất kết nối.
- **BB_149** [Web/Win]: Tùy theo định dạng cho phép, thì ở cửa sổ chọn file nên lọc sẵn theo định dạng đó luôn, để giúp người dùng tìm nhanh và ngừa lỗi.
- **BB_150** [Web/Win]: Khi đang upload,quá trình upload trên 1 phút, nếu người dùng muốn, có thể cancel bất cứ lúc nào. — Yêu cầu: — - Phải có button để cancel hành động. — - Lệnh POST phải bị aborted ngay.
  - *Ghi chú*: * Chuẩn bị: F12 >> Tab Network >> Click "Reload" >> Click thùng rác để xóa all trước khi test. — * Thực hiện: Chọn một file nặng, upload lên, sẽ nhìn thấy lệnh POST. Khi chưa upload xong thì cancel. Nhìn ở mục Network xem có thấy lệnh POST bị aborted không.

## Icon

- **BB_151** [Web/Win/Landing]: Đối với icon tương tác được phải có các hiệu ứng khi di chuột vào như sau: — - Có tooltip giải thích ý nghĩa/ mục đích. — - Trỏ chuột thành hình bàn tay — - Đổi màu nền hoặc màu icon
  - *Ghi chú*: Đổi màu icon: flexible
- **BB_152** [Web/Win/Mobile/Landing]: Icon phải sắc nét trên mọi màn hình thiết bị. (sử dụng đúng kích cỡ icon cho từng vị trí)
  - *Ghi chú*: Tránh sử dụng dạng ảnh png vì sang màn hình điện thoại không phù hợp có khả năng bị nhòe. Khuyến khích sử dụng icon/ảnh dạng vector.

## Data Table

- **BB_153** [Web/Win/Mobile]: Trừ cột STT, dữ liệu dạng số cần căn phải và có đơn vị tính ở tiêu đề cột, còn lại căn trái. — Các cột có dữ liệu bằng nhau về số lượng ký tự và cùng định dạng thì căn giữa cho đẹp
- **LT_064** [Web/Win]: Đối với các bảng bắt buộc có dữ liệu dài, như báo cáo dạng HTML, cần đóng băng các các dòng/cột tiêu đề, khi cuộn view dữ liệu tràn sẽ dễ theo dõi hơn

## UI element

- **BB_154** [Web/Win/Mobile/Landing]: Các UI Element có độ lớn (width và height) tương ứng với nội dung mong muốn.
  - *Ghi chú*: Suggest: min height: 32px, min text padding: 3px — -Nếu height không đủ thì gõ chữ thấp "g" hoặc chữ cao "k" có thể sẽ bị cắt mất chữ. => Failed. — - Có những trường dữ liệu thường dài hơn là width của textbox, ví dụ trường "Địa chỉ" cần gõ đủ số nhà/đường/phố/phường/tỉnh. => Failed.
- **BB_155** [Web/Win/Mobile/Landing]: Các UI Element mà nhấn/chạm được, phải có manh mối nhận biết được khi nhìn là có thể tương tác. Manh mối không gây hiểu nhầm về hành động sẽ thực hiện. (ví dụ: hyperlink thì màu blue có kẻ chân chữ; list item thì thường có mũi tên ở cuối mỗi list item để mở detail, sử dụng button là nhấn để thực hiện action,...); — Khi di chuột/focus/click vào một UI Element mà tương tác được thì phải có hiệu ứng đồ họa, ví dụ đổi màu viền hoặc màu nền, cho người dùng biết.
  - *Ghi chú*: Khuyến nghị: — - Đổi màu viền đối với ô nhập liệu; — - Đổi màu nền đối với icon, button, dòng trong bảng. — - Đổi màu text/background với các hyperlink — Ngoài hiệu ứng đồ họa, trên Web cần có hiệu ứng trỏ chuột đổi sang hình bàn tay.
- **BB_156** [Web/Win/Mobile/Landing]: Các UI element không tương tác được (readonly, disable) thì không được có hiệu ứng tương tác.

## Content

- **BB_157** [Web/Win/Mobile/Landing]: Text không nên căn đều 2 bên (aligned justified) hay căn giữa. — Với các đoạn text nhiều từ từ 2 dòng trở lên, căn trái text để dễ scan, dễ đọc.
- **LT_065** [Web]: Hiển thị mã bảo mật sao cho người dùng có thể nhận biết được trong khoảng 3-5s. Captcha không cần thiết phải quá méo mó biến dạng quá khó nhận biết. — Hoặc sử dụng reCaptcha thay thế.
  - *Ghi chú*: http://www.google.com/recaptcha — http://textcaptcha.com/ — http://identipic.com/ — http://haacked.com/archive/2007/09/11/honeypot-captcha.aspx — http://www.webdesignfromscratch.com/javascript/human-form-validation-check-trick/
- **LT_066** [Web/Landing]: Các video, image cần phải có text thay thế (Text alternatives - ALT), và tiêu đề chú thích (captions).
  - *Ghi chú*: Text thay thế được chèn dưới dạng một thuộc tính trong HTML (Hypertext Markup Language) để cho người xem trang web biết bản chất hoặc nội dung của hình ảnh. — Text thay thế rất hữu ích khi không có liên kết hình ảnh do URL bị hỏng hoặc thay đổi, giúp những người ko thể nhìn thấy hình ảnh phải sử dụng công cụ hỗ trợ đọc hoặc một số vấn đề khác. —…

## Popup

- **BB_158** [Web/Win/Mobile/Landing]: Khi mở popup, tránh sử dụng hiệu ứng đột ngột, khiến người dùng giật mình hoặc khó chịu. — Popup mở ra phải nhanh.
  - *Ghi chú*: Mở popup quá 2s thì đưa vào cảnh báo luôn. — Note: >=1s thì phải có processing icon thể hiện loading.
- **BB_159** [Web/Win/Landing]: Popup không được khóa toàn bộ trình duyệt.
  - *Ghi chú*: Mở popup của ứng dụng, rồi thử truy cập sang ứng dụng khác trên cùng trình duyệt xem có được không.
- **BB_160** [Web/Win/Landing]: Popup có nội dung quan trọng, yêu cầu user tương tác trước khi tiếp tục: — Khi nhấn phím ESC hoặc click vào vùng tối xung quanh không cho phép close popup. (vì có thể vô tình mất dữ liệu đang edit của user)
  - *Ghi chú*: VD: Khi yêu cầu người dùng xác nhận thực sự muốn xóa thông tin quan trọng hoặc xác nhận đồng ý với các điều khoản và điều kiện,…
- **BB_161** [Web/Win/Mobile/Landing]: Khi popup là read-only (không có ô edit dữ liệu): — Cho phép người dùng ESC và click vào vùng tối xung quanh thì tắt được popup.
- **BB_162** [Web/Win/Landing]: Cho phép sử dụng bàn phím tương tác được với popup. — - Link hay button khởi tạo (click để mở popup): sử dụng bàn phím cũng phải mở ra popup như khi click chuột. — - Khi mở ra popup thì trỏ chuột phải focus vào nội dung đầu tiên trên cùng của popup mà có thể tương tác được. — - Luồng tab và shift tab chỉ di chuyển bên trong popup qua tất cả các editable element, cho đến khi popup được đóng.
  - *Ghi chú*: Accessible Rich Internet Applications (ARIA) defines ways to make Web content and Web applications more accessible. — ARIA tags can be helpful in creating an accessible modal: Role = “dialog” , aria-hidden, aria-label
- **BB_183** [Mobile]: Khi chỉ chọn 1 item trong danh sách lựa chọn trên dialog/popup, mà không có button submit, thì commit luôn và đóng popup.
  - *Ghi chú*: Trường hợp loại trừ: dialog có button submit, user cần xác nhận trước khi đóng trên các confirmation popup.
- **LT_067** [Web/Win]: Popup nên di chuyển được. — Đặc biệt khi cho mở cùng lúc nhiều popup chứa các nội dung cần xác nhận, so sánh với nhau.
  - *Ghi chú*: Tùy FW.
- **LT_068** [Web/Win/Landing]: Vị trí popup nên đặt ở nửa trên của màn hình. (Vì trong chế độ xem trên điện thoại di động có thể bị mất nếu đặt ở vị trí thấp hơn.)
  - *Ghi chú*: Áp dụng với các trang có responsive trên mobile.

## Search box

- **BB_163** [Web/Win/Mobile]: Lưu và hiển thị các nội dung search gần đây nhất cho user khi user focus vào search box. — Không áp dụng cho các hệ thống yêu cầu tính bảo mật thông tin cao.
  - *Ghi chú*: Hiển thị dưới 10 item và không có thanh cuộn, như vậy thông tin không bị cảm giác nặng nề.
- **LT_069** [Web/Win/Mobile]: Khi user nhập chữ cái đầu tiên trong ô tìm kiếm: — Sử dụng auto-suggestion, dự đoán từ, nhận diện từ.
  - *Ghi chú*: - Làm nổi bật sự khác biệt giữa thông tin được nhập và thông tin được đề xuất (ví dụ: search text có fontweight là normal, trong khi cụm từ gợi ý để font đậm) — - Auto suggestion nhanh nhất có thể (sau khi nhập ký tự thứ ba) — -Hiển thị ít hơn 10 item (người dùng không phải scroll) — - Cho phép điều hướng bằng bàn phím các item đề suất. Khi người…

## Search result

- **BB_164** [Web/Win/Mobile]: Không xóa điều kiện tìm kiếm sau khi nhấn button tìm kiếm
  - *Ghi chú*: Khi người dùng không tìm thấy kết quả tìm kiếm thì có thể tìm kiếm lại bằng cách sửa lại điều kiện tìm kiếm ban đầu.
- **BB_165** [Web/Win/Mobile]: Khi có điều kiện search mặc định: — Vừa load vào một trang tìm kiếm, thì nên tự search luôn theo tiêu chí tìm kiếm hiển thị mặc định, không chờ người dùng click "Search" rồi mới tìm.
  - *Ghi chú*: Ví dụ: Mở thử trang tìm kiếm, nếu không thấy có kết quả ở bảng phía dưới, nhưng lúc click thử "Tìm kiếm" lại ra kết quả là failed.
- **LT_070** [Web/Win/Mobile]: Hiển thị search progress khi thời gian search kéo dài. — Lý tưởng thì kết quả tìm kiếm nên được hiển thị ngay lập tức, nhưng nếu không thể, thì nên báo tiến trình cho người dùng. Cung cấp cho người dùng một dấu hiệu rõ ràng về thời gian họ phải chờ.
  - *Ghi chú*: Nếu thời gian tìm kiếm quá dài (hơn 10 giây) nên sử dụng hình ảnh động. Hình ảnh động đẹp có thể làm phân tán người dùng và khiến họ bỏ qua thời gian tìm kiếm dài.

## Session

- **BB_166** [Web/Mobile]: Khi hết session, mà người dùng thao tác trên ứng dụng: — 1. Tự mở ra Trang chủ public, nếu có (nếu hệ thống không yêu cầu login để vào trang này). — 2. Mở trang Đăng nhập (nếu hệ thống yêu cầu phải login mới sử dụng được).
- **BB_167** [Web]: Khi phiên được xác thực hết hạn (session timeout), sau khi xác thực lại, người dùng có thể tiếp tục hoạt động mà không mất dữ liệu.
  - *Ghi chú*: Vd: Khi đang edit mà session timeout, khi login trở lại thì cần hiển thị tiếp màn hình đang thao tác dở lúc trước để user tiếp tục edit

## AppError

- **BB_168** [Web/Win/Mobile]: Khi mất kết nối mà vẫn còn trong session: ứng dụng không được tự logout. Chỉ hiển thị màn hình báo lỗi kết nối và yêu cầu user check lại mạng rồi thử lại, tránh logout ra luôn để user mất công login lại. — Cần có màn hình báo lỗi connection riêng của hệ thống cho những trường hợp này.
- **LT_071** [Mobile]: Khi mất kết nối, mở ứng dụng từ app icon: mở ứng dụng và hiển thị error page với thông báo lỗi kết nối trên nền ứng dụng.
  - *Ghi chú*: Lỗi hay gặp: Không mở App mà hiển thị error msg ngay trên màn hình mobile là Fail.
- **LT_072** [Web/Win/Mobile/Landing]: Lỗi đồng bộ, fail khi loading nội dung từng phần: — -Chỉ báo lỗi phần không load được, tiêu đề và footer nếu có giữ nguyên. — -Loading icon: xoay trước khi xuất hiện lỗi, và xuất hiện tại vị trí cần load thông tin.

## Hamburger menu

- **BB_169** [Mobile]: Gạt trái hoặc chạm vào Hamburger icon đều phải mở ra được Hamburger Menu (Left-Menu).
  - *Ghi chú*: Chỉ áp dụng cho MobileApp. Không áp dụng cho Responsive web app.

## Virtual Keyboard

- **BB_170** [Mobile]: Khi mở ra một form có nhiều trường nhập liệu, không được tự mở ra bàn phím ảo vì sẽ che khuất các thông tin đó, khiến người dùng không nhìn được tổng quan màn hình.
  - *Ghi chú*: Chú ý: đối với các màn hình chỉ có 1 ô nhập liệu và một button, có thể hiện luôn ra bàn phím ảo sẵn, và đẩy form lên phía trên bàn phím ảo sao cho người dùng có thể nhìn thấy đầy đủ nội dung.
- **BB_171** [Mobile]: Bàn phím không được che khuất hoàn toàn ô nhập liệu kế tiếp. Mục đích: để người dùng biết là còn phải nhập tiếp. — Đối với button để submit, thì phải thỏa mãn: — - Bàn phím bảo không che khuất; — - Bàn phím ảo hỗ trợ button submit thay cho button đó.
  - *Ghi chú*: Kiểm tra tất cả các ô nhập liệu. Nếu ô nào hiển thị bàn phím ảo mà che hoàn toàn thông tin phía dưới là Failed. — Khi xuất hiện bàn phím ảo, form cần được đẩy lên.
- **BB_172** [Mobile]: Cần hỗ trợ next tới ô nhập liệu tiếp theo dễ dàng bằng bàn phím ảo. — (Nhấn nút Next trên bàn phím ảo thì sẽ focus vào ô nhập liệu tiếp theo)
- **BB_173** [Mobile]: Có thể submit dễ dàng nếu là ô nhập liệu cuối cùng. — (Nhấn Enter/H.thành trên bàn phím ảo sẽ thực hiện chức năng của nút chức năng chính trên màn hình)
  - *Ghi chú*: <input type="search"> — https://developer.apple.com/documentation/uikit/uikeyboardtype
- **BB_174** [Mobile]: Cần disable chế độ auto-correct/ auto-suggestion khi không cần thiết. — Ví dụ đối với các ô nhập liệu sau thì cần disable: — - Email — - Địa chỉ — - Tên — - Mật khẩu
  - *Ghi chú*: <input autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" /> — <textarea autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
- **BB_175** [Mobile]: Khi ô nhập liệu là dạng số: chỉ hiển thị bàn phím số.
  - *Ghi chú*: <input type="number">
- **BB_176** [Mobile]: Khi ô nhập liệu là dạng số điện thoại để gọi (Dial): cần hỗ trợ nhập số, các ký tự đặc biệt thường dùng "*#".
  - *Ghi chú*: <input type="tel">
- **BB_177** [Mobile]: Khi ô nhập liệu là dạng email: bàn phím ảo cần hỗ trợ nhập text, @, "."
  - *Ghi chú*: <input type="email">
- **BB_178** [Mobile]: Khi ô nhập liệu là dạng URL: bàn phím ảo cần hỗ trợ nhập text, "/", ".com", "."
  - *Ghi chú*: <input type="url">
- **BB_179** [Mobile]: Tắt bàn phím ảo bằng cách: tap vào khu vực ngoài 'bàn phím ảo và ô nhập liệu'. — Hoặc tap vào Back trên Android.

## ListView

- **BB_180** [Mobile]: Người dùng có thể refresh nội dung trong list bằng cách kéo màn hình xuống dưới (Pull to Refresh). — Refresh indicator xuất hiện sau hành động kéo màn hình xuống dưới, và biến mất khi hoàn thành việc load nội dung mới.
- **LT_076** [Mobile]: Người dùng có thể dễ dàng xem nội dung chi tiết của từng list item bằng cách lướt ngang, không cần phải quay lại list.
  - *Ghi chú*: Không áp dụng với các app tin tức. — VD: xem chi tiết từng nội dung email trong Gmail

## Nguyên tắc hé lộ thông tin

- **BB_181** [Mobile]: Khi 1 màn hình không hiện hết danh sách thông tin cần hiển thị, thì cần hiển thị sao cho hé lộ ra được phần thông tin tiếp theo, để giúp người dùng biết là còn/ biết scroll để xem tiếp.

## Pagination

- **BB_182** [Mobile]: Sử dụng infinite scroll trên các màn hình danh sách dài. — Không sử dụng phân trang trừ khi có nghiệp vụ đặc biệt bắt buộc.
  - *Ghi chú*: Khi có nghiệp vụ bắt buộc cần dùng phân trang thì cần xem xét kỹ giải pháp và yêu cầu nghiệp vụ từ khách hàng để quyết định.

## Switch

- **BB_184** [Mobile]: Nhấn vào lable cũng phải on/off được Switch

## Breadcrumb

- **LT_056** [Web/Win]: - Khi người dùng click vào Trang chủ thì sẽ điều hướng về Trang chủ. — - Di chuột vào các các lá khác trên breadcrumb - mà điều hướng được - cần có hiệu ứng clickable và thực hiện chuyển tới trang đích.

## Textbox

- **LT_058** [Web/Win/Mobile]: Hỗ trợ người dùng bằng cách tự động định dạng chuẩn dữ liệu đối với một số kiểu dữ liệu: tiền tệ, commas for 1000s, dấu cách, viết hoa đầu câu, viết hoa toàn bộ... Người dùng không phải nhập các ký tự như /, £ or %.
  - *Ghi chú*: Thường gặp những textbox khi cho nhập: số tiền, địa chỉ ip, số điện thoại, tỉ lệ,…

## Access Right

- **LT_073** [Mobile]: Không yêu cầu user cấp tất cả quyền truy cập ngay khi vừa vào ứng dụng. — Yêu cầu quyền truy cập vào máy điện thoại của user (phonebook, camera, gallery,…) đúng thời điểm và đúng vị trí cần quyền để lấy thông tin. Đồng thời giải thích rõ lý do vì sao App cần lấy những thông tin này.
  - *Ghi chú*: Vd: Khi ở màn hình 'Chuyển tiền qua số điện thoại', lúc này mới confirm xin user cấp quyền access phonebook, với lý do: để có thể search nhanh số điện thoại người nhận, trực tiếp từ danh bạ của user.

## Bottom Navigation

- **LT_074** [Mobile]: Bottom nav: — - Chạm vào các item thì chuyển trực tiếp đến view, hoặc refresh view hiện tại. Không mở menus hay popup. — - Không điều hướng giữa các action view bằng nút Back, hay vuốt. — - Có thể fix hoặc ẩn/hiện khi cuộn: cuộn lên thì hiện, cuộn xuống thì ẩn.

## Listview

- **LT_075** [Mobile]: Khi back lại listview từ màn hình detail không được reload lại list view vì sẽ mất vị trí item vừa chọn. — (Tương tự khi màn hình sử dụng gridview.)
  - *Ghi chú*: Việc reload/thay đổi vị trí để user tự làm, nếu cần, bằng cách vertical scroll/pull to refresh.

## Customer Experience

- **LT_077** [Web/Mobile]: Tùy chỉnh theo người dùng: Người dùng có quyền tùy chỉnh setting theo mong muốn, đưa những ứng dụng hay sử dụng lên trước hoặc thay đổi thứ tự
- **LT_078** [Mobile]: Hỗ trợ người dùng khôi phục tùy chỉnh setting của cá nhân sau khi re-install
- **LT_079** [Web/Mobile]: Người dùng có khả năng tùy chỉnh màu sắc của trang hoặc ứng dụng, đặc biệt là người mù màu. Nên có tối thiểu 2 màu để lựa chọn, 1 màu bình thường và 1 màu cho người mù màu
