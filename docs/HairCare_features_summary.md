# TỔNG HỢP & PHÂN TÍCH HỆ THỐNG TÍNH NĂNG WEBSITE HAIRCARE INSIGHT
> **Dự án:** HairCare Insight — Hệ thống Thương mại Điện tử Moroccanoil tích hợp Hệ Chuyên gia Tư vấn Chăm sóc Tóc (Rule-based) & Dự báo Nhu cầu Tái nhập kho (Machine Learning)  
> **Quy mô:** 30 Màn hình Core (16 Storefront C01–C16 + 14 Quản trị A01–A14) & 73 Quy tắc nghiệp vụ chuẩn hóa (BR-ACC đến BR-RET)

---

## I. DUYỆT & TÌM KIẾM SẢN PHẨM (CATALOG, SEARCH & DISCOVERY)

* **Trang chủ & Trưng bày thương hiệu (Home Page):**
  * Hero Banner truyền thông thương hiệu tinh dầu Moroccanoil Argan Oil.
  * Hiển thị lưới trực quan 6 danh mục ngành hàng cốt lõi (Shampoo, Hair Masks, Treatment/Oil, Dry Shampoo, Conditioner, Styling & Finishing).
  * Danh sách sản phẩm nổi bật / Bán chạy nhất (Best Sellers) hiển thị giá chuẩn USD theo biến thể mặc định.
  * Banner CTA điều hướng tương tác tham gia Hair Routine Quiz ("Find Your Custom Routine").
  * Header đa năng (thanh tìm kiếm nhanh, huy hiệu giỏ hàng đếm số lượng thời gian thực, biểu tượng tài khoản/đăng nhập).
  * Footer quy chuẩn (chính sách giao hàng $5 USD, đổi trả 7 ngày, điều khoản dịch vụ, thông tin liên hệ).

* **Tìm kiếm sản phẩm thông minh (Smart Search):**
  * Tìm kiếm không phân biệt hoa thường (Case-insensitive) và hỗ trợ tìm kiếm mờ (Fuzzy Search với khoảng cách chỉnh sửa Levenshtein $\le 2$).
  * Phạm vi quét dữ liệu đa trường: Tên sản phẩm, Danh mục chính (`category`), Công dụng / Lợi ích chính (`key_benefits`), Thành phần nổi bật (`ingredients`).
  * Tự động loại trừ các sản phẩm ở trạng thái ngừng kinh doanh (`Inactive`).

* **Lọc sản phẩm đa tiêu chí (Multi-criteria Filtering):**
  * Lọc theo 6 Danh mục chăm sóc tóc chuẩn hóa: Dầu gội (Shampoo), Dầu xả (Conditioner), Mặt nạ tóc (Hair Masks), Tinh dầu dưỡng (Treatment / Oil), Dầu gội khô (Dry Shampoo), Tạo kiểu & Hoàn thiện (Styling & Finishing).
  * Lọc theo khoảng giá linh hoạt (Min - Max theo đơn vị USD).
  * Lọc theo tình trạng tồn kho hàng hóa (Còn hàng / Tạm hết hàng).

* **Sắp xếp danh mục sản phẩm (Sorting):**
  * Sắp xếp theo giá bán USD (Giá tăng dần, Giá giảm dần).
  * Sắp xếp theo mức độ phổ biến / Bán chạy nhất (Best Sellers).
  * Sắp xếp theo ngày cập nhật mới nhất (Newest Arrivals).

* **Xem chi tiết sản phẩm chuyên sâu (Product Detail Page):**
  * Thư viện hình ảnh độ phân giải cao (ảnh chính và các góc chụp thực tế).
  * Thông tin định danh: Tên sản phẩm, Thương hiệu (Moroccanoil), Danh mục gốc.
  * Bộ chọn dung tích biến thể SKU (Travel 2.4 oz, Full 8.5 oz, Half-Liter 16.9 oz, Liter 33.8 oz): tự động cập nhật đơn giá USD và kiểm tra tồn kho khả dụng (`Available`) tức thì theo từng dung tích.
  * Cụm điều chỉnh số lượng mua kèm kiểm soát giới hạn tồn kho.
  * Hệ thống Tab thông tin đa tầng: Mô tả chi tiết (Product Description), Lợi ích chính (Key Benefits), Bảng thành phần đầy đủ (Full Ingredients), Hướng dẫn sử dụng chuyên nghiệp (How to Use).
  * Trạng thái kinh doanh tự động: Tự động khóa nút mua và hiển thị nhãn "Out of Stock" khi tồn kho khả dụng biến thể bằng 0.

* **Thông tin thương hiệu & Hệ thống chính sách (About Us & Store Policies):**
  * Section Giới thiệu: Câu chuyện thương hiệu Moroccanoil, cam kết chất lượng mỹ phẩm tóc chính hãng.
  * Section Chính sách bán hàng & Vận chuyển: Biểu phí giao hàng cố định $5.00 USD, thời gian vận chuyển 3–5 ngày làm việc.
  * Section Chính sách đổi trả & Hoàn tiền: Điều kiện đổi trả toàn bộ đơn hàng trong 7 ngày đối với đơn thành công còn nguyên tem niêm phong.
  * Section Chính sách bảo mật: Quy chuẩn bảo mật thông tin tài khoản, sổ địa chỉ và lịch sử đơn hàng.

---

## II. HỆ CHUYÊN GIA CHẨN ĐOÁN & TƯ VẤN LIỆU TRÌNH TÓC (RULE-BASED HAIR ROUTINE ENGINE)

* **Khảo sát trắc nghiệm chẩn đoán tóc 4 bước (Hair Routine Quiz):**
  * Thanh tiến trình trực quan từng bước (Step 1/4 $\rightarrow$ 4/4).
  * Bộ câu hỏi chẩn đoán chuẩn hóa:
    * *Bước 1 (Da đầu):* Xác định tình trạng da đầu (dầu, khô, gàu, nhạy cảm, bình thường).
    * *Bước 2 (Sợi tóc):* Kết cấu sợi tóc (mảnh, thô, dày) và mức độ khô xơ/hư tổn.
    * *Bước 3 (Thói quen & Xử lý hóa chất):* Tần suất gội đầu, lịch sử uốn, nhuộm, tẩy hoặc tạo kiểu bằng nhiệt.
    * *Bước 4 (Mục tiêu chăm sóc chính):* Phục hồi tóc, dưỡng ẩm, giữ màu nhuộm, định hình sóng xoăn, tạo phồng, bảo vệ da đầu.
  * Ràng buộc nghiệp vụ: Bắt buộc chọn câu hỏi đánh dấu sao (*) mới được kích hoạt nút chuyển bước; hỗ trợ quay lại bước trước để sửa câu trả lời.
  * Cơ chế nạp luật động: Bộ câu hỏi và logic luật chẩn đoán được nạp từ cấu hình độc lập có phiên bản (`ruleset_version`), không hardcode vào mã nguồn.

* **Động cơ suy diễn logic tất định (Deterministic Rule-based Inference Engine):**
  * Áp dụng bảng luật mệnh đề `IF [Tổ hợp câu trả lời] THEN [Nhãn nhu cầu tóc]`, đảm bảo cùng đầu vào luôn trả về kết quả nhất quán 100%.
  * Cây ưu tiên giải quyết xung đột 7 nhóm nhu cầu tóc:
    $$\text{Phục hồi hư tổn (Repair)} > \text{Cân bằng da đầu (Scalp)} > \text{Giữ màu nhuộm (Color)} > \text{Định hình sóng xoăn (Curl)} > \text{Cấp ẩm sâu (Hydration)} > \text{Tăng độ phồng (Volume)} > \text{Tạo kiểu giữ nếp (Styling)}$$
  * Cơ chế Fallback an toàn: Tự động áp dụng liệu trình cấp ẩm tiêu chuẩn (Hydrating Routine) nếu câu trả lời không khớp các luật chuyên sâu, chống lỗi màn hình trắng.

* **Đề xuất liệu trình cá nhân hóa 4 bước (Routine Recommendation):**
  * Thẻ chẩn đoán tình trạng tóc cá nhân và phân tích nguyên nhân hư tổn.
  * Gợi ý trọn bộ liệu trình tối đa 4 bước (mỗi bước 1 sản phẩm chính xác, tối thiểu 3 bước):
    * *Step 1 — Cleanse (Làm sạch):* Dầu gội chuyên dụng.
    * *Step 2 — Condition (Dưỡng xả):* Dầu xả bổ trợ.
    * *Step 3 — Treat & Mask (Đặc trị / Phục hồi):* Tinh dầu dưỡng hoặc Mặt nạ tóc.
    * *Step 4 — Style & Protect (Bảo vệ / Hoàn thiện):* Xịt bảo vệ nhiệt hoặc kem định hình.
  * Ràng buộc tồn kho thông minh: Chỉ gợi ý sản phẩm đang `Active` và có tồn `Available > 0`; tự động thay thế bằng sản phẩm tương đương hoặc bỏ bước kèm thông báo minh bạch nếu hết hàng.
  * Cảnh báo y khoa bắt buộc (Medical Disclaimer): Khẳng định kết quả mang tính chất tư vấn thẩm mỹ, không thay thế chẩn đoán da liễu lâm sàng.

* **Gợi ý sản phẩm đặc trị bổ trợ (Optional Add-on):**
  * Đề xuất tối đa 1 sản phẩm hỗ trợ nhãn phụ (ví dụ: xịt tạo phồng chân tóc cho tóc vừa cần phục hồi vừa sợi mảnh).
  * Sản phẩm phụ hiển thị tách biệt, có nút thêm riêng biệt và không bị gộp vào gói routine chính.

* **Tương tác & Lưu trữ kết quả Quiz:**
  * Nút "Add Full Routine to Cart": Thêm đồng loạt toàn bộ các sản phẩm trong quy trình 4 bước vào giỏ hàng chỉ với 1 click.
  * Nút "Save to Hair Profile": Lưu kết quả chẩn đoán vào hồ sơ cá nhân (yêu cầu đăng nhập; hiển thị hộp xác nhận ghi đè kèm mốc thời gian nếu đã có hồ sơ cũ).
  * Nút "Retake Quiz": Cho phép khách hàng làm lại bài khảo sát từ đầu.
  * Ghi nhận dữ liệu phân tích BI: Tự động ghi lại lượt làm Quiz ẩn danh (thời gian, nhãn nhu cầu, phiên bản luật) phục vụ thống kê phân tích thị hiếu trên Dashboard quản trị.

---

## III. GIỎ HÀNG & QUY TRÌNH ĐẶT HÀNG (CART & CHECKOUT)

* **Quản lý giỏ hàng linh hoạt (Shopping Cart):**
  * Hỗ trợ trải nghiệm cho cả Khách vãng lai (Session Cart) và Thành viên đã đăng nhập (Account Cart).
  * Danh sách món hàng chi tiết: Hình ảnh, Tên sản phẩm, Biến thể dung tích đã chọn, Đơn giá USD theo biến thể, Cụm tăng/giảm số lượng, Nút xóa từng món, Thành tiền từng món.
  * Tự động kiểm tra giới hạn tồn kho: Chặn tăng số lượng vượt quá số lượng hàng khả dụng (`Available = On Hand - Reserved`).
  * Bảng tổng hợp chi phí tức thì: Tạm tính hàng hóa (Subtotal), Giảm giá voucher (Voucher Discount), Phí vận chuyển tiêu chuẩn ($5.00 USD), Tổng tiền thanh toán (Order Total USD).

* **Bảo toàn dữ liệu & Đồng bộ giỏ hàng khi đăng nhập (Cart Merge):**
  * Tự động gộp toàn bộ sản phẩm trong giỏ hàng session của Khách vãng lai vào tài khoản cá nhân khi Đăng nhập hoặc Đăng ký thành công.
  * Thuật toán kiểm soát tồn khi gộp: Số lượng sau gộp bằng `min(số lượng Guest + số lượng User, Available)`; hiển thị thông báo cắt giảm nếu vượt tồn.
  * Xử lý biến động giá & tồn: Sản phẩm hết hàng hoặc đổi trạng thái Inactive vẫn được giữ lại trong giỏ kèm cảnh báo đỏ và khóa chức năng Checkout, tuyệt đối không xóa âm thầm của khách.

* **Quy trình Thanh toán & Đặt hàng an toàn (Checkout):**
  * Bắt buộc xác thực tài khoản trước khi tiến hành đặt hàng (điều hướng mềm sang đăng nhập và quay lại trang thanh toán).
  * Quản lý thông tin giao hàng: Chọn nhanh từ danh sách sổ địa chỉ đã lưu hoặc nhập địa chỉ giao hàng mới.
  * Lựa chọn phương thức thanh toán: Thanh toán khi nhận hàng (COD) hoặc Chuyển khoản điện tử USD (Bank Transfer / Electronic Payment).
  * Cơ chế chống click trùng (Idempotency Protection): Nút "Place Order" tự động vô hiệu hóa ngay sau lần bấm đầu tiên và kích hoạt khóa giao dịch chống tạo đơn trùng lặp.
  * Snapshot dữ liệu lịch sử: Lưu cố định giá bán USD, tên biến thể và chính sách voucher tại thời điểm đặt hàng; mọi thay đổi giá của Admin trong tương lai không làm sai lệch hóa đơn cũ.

---

## IV. THANH TOÁN ĐIỆN TỬ & MÔ PHỎNG GIAO DỊCH (PAYMENT GATEWAY & SIMULATION)

* **Thanh toán tiền mặt khi giao hàng (Cash on Delivery - COD):**
  * Tạo đơn hàng thành công và chuyển trạng thái ngay sang `Processing` (Đang chuẩn bị hàng).
  * Trạng thái thanh toán khởi tạo là `Unpaid`; tự động chuyển sang `Paid` khi đơn giao thành công (`Completed`).

* **Thanh toán Chuyển khoản Điện tử USD (Electronic Payment / Wire Transfer):**
  * Tạo đơn hàng ở trạng thái chờ thanh toán `Payment Pending`.
  * Sinh mã tham chiếu thanh toán duy nhất theo định dạng chuẩn: `PAY-HCI-XXXXX` (quan hệ 1-1 với đơn hàng, mỗi mã chỉ sử dụng đúng 1 lần).
  * Hiển thị thông tin tài khoản thụ hưởng, mã QR và hướng dẫn chuyển tiền chi tiết với số tiền USD chính xác.

* **Kiểm soát thời hạn giao dịch & Tự động phục hồi tồn kho (Auto Cancellation):**
  * Đồng hồ đếm ngược thời gian thực 30 phút (`mm:ss`) trực tiếp trên màn hình giao dịch.
  * Job quét tự động: Khi hết thời gian 30 phút mà chưa hoàn tất chuyển tiền, hệ thống tự động hủy đơn (`Cancelled`), giải phóng lượng hàng giữ chỗ (`Reserved`), hoàn trả tồn kho khả dụng (`Available`) và hoàn lại lượt mã giảm giá voucher.

* **Xử lý tín hiệu thanh toán tự động (Webhook & Polling System):**
  * Xác thực tính toàn vẹn (Idempotent Transaction Processing): Kiểm tra khớp chính xác mã thanh toán `PAY-HCI-...`, đúng số tiền USD và còn trong thời hạn hiệu lực.
  * Kênh Polling dự phòng chu kỳ 5 giây cập nhật trạng thái đơn hàng song song với Webhook.
  * Khi giao dịch hợp lệ: Đơn chuyển tức thời sang `Processing`, thanh toán chuyển `Paid` và tự động điều hướng khách hàng sang màn hình Đặt hàng thành công (`Order Success / C09`).

* **Cổng mô phỏng kiểm thử giao dịch (Payment Simulation Endpoint):**
  * Trang bị nút "Simulate Successful Payment" trực tiếp tại màn hình chờ thanh toán C08.
  * Cho phép mô phỏng quy trình xác nhận thanh toán thành công trong môi trường kiểm thử (Sandbox/Simulation), vận hành chuẩn 100% logic nghiệp vụ mà không cần tài khoản ngân hàng thực tế.

---

## V. TÀI KHOẢN, HỒ SƠ KHÁCH HÀNG & BẢO MẬT (ACCOUNT & SECURITY)

* **Đăng nhập & Đăng ký phân quyền (Authentication):**
  * Tách biệt thành 2 trang độc lập: Trang Đăng nhập (`/login`) và Trang Đăng ký (`/register`), có liên kết điều hướng chuyển đổi qua lại nhanh chóng.
  * Kiểm tra tính duy nhất: Mỗi Email và Số điện thoại chỉ được liên kết duy nhất 1 tài khoản trên toàn hệ sinh thái.
  * Xác thực dữ liệu chuẩn: Kiểm tra định dạng email RFC, số điện thoại, mật khẩu tối thiểu 8 ký tự (gồm chữ hoa, chữ thường và chữ số).
  * Phiên đăng nhập an toàn: Quản lý phiên 24 giờ bằng cookie bảo mật `HttpOnly; Secure; SameSite=Strict` ngăn chặn hoàn toàn tấn công XSS.

* **Phòng vệ Brute Force & Quản trị tài khoản:**
  * Cơ chế khóa tạm thời tự động: Nhập sai mật khẩu 5 lần liên tiếp sẽ bị khóa đăng nhập tạm thời trong **5 phút** ở cấp độ máy chủ.
  * Quyền khóa tài khoản chủ động: Quản trị viên có quyền khóa/mở khóa tài khoản khách hàng vi phạm kèm lý do lưu vết; tài khoản bị khóa sẽ bị thu hồi toàn bộ phiên đăng nhập lập tức.

* **Khôi phục mật khẩu qua mã OTP (Forgot & Reset Password):**
  * Quy trình xác thực 2 bước khép kín: Nhập email nhận mã OTP $\rightarrow$ Nhập mã OTP 6 số để thiết lập mật khẩu mới.
  * Cơ chế an toàn OTP: Mã OTP có hiệu lực trong 10 phút, chỉ sử dụng 1 lần, giới hạn sai tối đa 5 lần và giãn cách thời gian yêu cầu gửi lại tối thiểu 60 giây.
  * Hỗ trợ truyền phát qua Email SMTP tiêu chuẩn hoặc hiển thị mã mô phỏng Sandbox phục vụ nghiệm thu.

* **Hồ sơ cá nhân & Sổ địa chỉ (My Profile):**
  * Quản lý thông tin định danh: Họ tên, Email, Số điện thoại, Đổi mật khẩu tài khoản.
  * Quản lý Sổ địa chỉ nhận hàng đa năng: Thêm mới, chỉnh sửa, xóa và thiết lập địa chỉ mặc định phục vụ thanh toán nhanh.

* **Quản lý Hồ sơ tóc cá nhân (Hair Profile):**
  * Lưu trữ kết quả chẩn đoán tóc, phân loại nhu cầu cốt lõi và lộ trình 4 bước gợi ý gần nhất.
  * Lưu vết phiên bản quy tắc (`ruleset_version`) đảm bảo hồ sơ cũ không bị biến dạng khi hệ thống cập nhật bộ luật mới.
  * Tích hợp nút làm lại bài kiểm tra ("Retake Quiz") để cập nhật lại thể trạng tóc định kỳ.

---

## VI. VÒNG ĐỜI ĐƠN HÀNG, ĐỔI TRẢ & ĐÁNH GIÁ (ORDER, RETURNS & REVIEWS)

* **Theo dõi & Quản lý vòng đời đơn hàng (Order History & Tracking):**
  * Danh sách đơn hàng cá nhân trực quan kèm bộ lọc theo 7 trạng thái chuẩn hóa:
    $$\text{Payment Pending} \rightarrow \text{Processing} \rightarrow \text{Shipping} \rightarrow \text{Completed}$$
    $$\text{Cancelled (Hủy)} \quad\mid\quad \text{Return Pending} \rightarrow \text{Returned (Đổi trả thành công)}$$
  * Xem chi tiết từng đơn hàng: Mã đơn `#HCI-YYYYMMDD-XXXX`, ngày đặt, timeline tiến trình, người nhận, danh sách sản phẩm, chi tiết giảm giá và tổng thanh toán USD.

* **Quy trình hủy đơn hàng minh bạch (Order Cancellation):**
  * Cho phép khách hàng hoặc quản trị viên hủy đơn khi đơn hàng đang ở trạng thái `Payment Pending` hoặc `Processing` (bắt buộc chọn lý do hủy).
  * Tự động giải phóng tồn kho giữ chỗ `Reserved` ngay khi hủy đơn; hoàn tiền 100% nếu là đơn chuyển khoản đã thanh toán (`Paid` chuyển sang `Refunded`).
  * Khóa tuyệt đối quyền hủy khi đơn hàng đã chuyển sang `Shipping` hoặc `Completed`.

* **Quy trình Đổi trả hàng tinh gọn 7 ngày (Return & Refund Workflow):**
  * Kích hoạt quyền gửi yêu cầu trả hàng ("Request Return") chỉ khi đơn hàng ở trạng thái `Completed` và còn trong thời hạn 7 ngày.
  * Phạm vi áp dụng: Đổi trả toàn bộ đơn hàng (Full-order return); bắt buộc chọn 1 lý do hợp lệ và cam kết sản phẩm còn nguyên tem niêm phong (seal) — ngoại trừ trường hợp hàng lỗi/giao sai do shop.
  * Đơn chuyển sang trạng thái chờ duyệt `Return Pending` (khóa tính năng gửi lại và viết review).
  * Quy trình xử lý tại quản trị:
    * *Duyệt 1-click (Approve & Refund):* Đơn chuyển sang `Returned`, thanh toán chuyển `Refunded`, hệ thống tự động cộng lại tồn kho thực tế `On Hand` (+ số lượng trả), hoàn tiền Order Total trừ phí ship $5.00 (hoàn đủ 100% cả ship nếu lỗi do cửa hàng).
    * *Từ chối (Reject Return):* Bắt buộc nhập lý do từ chối, đơn hàng quay trở về trạng thái `Completed`.

* **Đánh giá xác thực người mua thực tế (Store Verified Reviews):**
  * Tiêu chuẩn Verified Purchase: Chỉ những tài khoản đã mua sản phẩm đó và đơn hàng đã giao thành công (`Completed`) mới có quyền viết đánh giá và chấm điểm sao.
  * Giới hạn chống spam: Mỗi tài khoản chỉ được gửi đúng 1 đánh giá cho mỗi sản phẩm trong một đơn hàng (cho phép cập nhật nội dung, không cho phép gửi trùng).
  * Quy chuẩn đánh giá: Thang điểm từ 1 đến 5 sao, nội dung nhận xét tối đa 1.000 ký tự.
  * Cơ chế kiểm duyệt nội dung (Review Moderation): Quản trị viên có thẩm quyền ẩn đánh giá vi phạm thuần phong mỹ tục/spam kèm lý do; đánh giá bị ẩn sẽ không tính vào điểm trung bình và số lượt hiển thị tại trang sản phẩm C03.

---

## VII. BẢNG ĐIỀU KHIỂN & BÁO CÁO THỐNG KÊ (ADMIN DASHBOARD & KPIS)

* **Xác thực cổng Quản trị độc lập (Admin Authentication):**
  * Cổng truy cập riêng biệt tại `/admin/login`, tách biệt hoàn toàn cơ sở dữ liệu với người dùng mua sắm thông thường.
  * Cơ chế bảo mật che giấu thông tin: Mọi trường hợp sai tên đăng nhập, sai mật khẩu hoặc sai vai trò người dùng đều trả về thông báo chung "Invalid credentials" nhằm triệt tiêu nguy cơ rà quét tài khoản.
  * Kiểm soát phân quyền máy chủ: Tự động chuyển hướng về trang đăng nhập đối với yêu cầu chưa xác thực và trả mã 403 Forbidden đối với tài khoản không có quyền Admin.

* **Bảng điều khiển kinh doanh trung tâm (Executive Dashboard):**
  * Bộ lọc dữ liệu kinh doanh linh hoạt theo khoảng thời gian (Hôm nay, 7 ngày, 30 ngày, Quý, Năm).
  * Thẻ chỉ số hiệu năng kinh doanh cốt lõi (Core KPI Cards):
    * *Doanh thu thuần (Net Revenue USD):* Tính trên các đơn hoàn tất (`Completed`, `Return Pending`), loại trừ đơn đổi trả (`Returned`) và không tính phí ship.
    * *Số lượng đơn hoàn tất (Completed Orders).*
    * *Giá trị đơn hàng trung bình (AOV - Average Order Value).*
    * *Số lượng khách hàng mới đăng ký (New Customers).*
  * Biểu đồ trực quan hóa doanh số: Biểu đồ đường xu hướng doanh thu theo thời gian và Biểu đồ tròn cơ cấu tỷ trọng doanh số (Gross Sales) phân bổ trên 6 danh mục mỹ phẩm tóc.

* **Danh mục tác vụ khẩn cấp (Action Items Widget):**
  * Thống kê số lượng đơn hàng mới đang chờ xử lý (`Processing`).
  * Thống kê số lượng yêu cầu đổi trả đang chờ xét duyệt (`Return Pending`).
  * Danh sách cảnh báo sản phẩm chạm ngưỡng tồn kho thấp (Low Stock Alerts) giúp Admin can thiệp kịp thời.

* **Báo cáo phân tích chuyên sâu Hair Routine Quiz (BI Analytics):**
  * Bảng phân bổ tỷ lệ các nhóm vấn đề về tóc mà khách hàng gặp phải (Repair, Scalp, Color, Curl, Hydration, Volume, Styling) từ các lượt làm Quiz ẩn danh.
  * Đo lường tỷ lệ chuyển đổi từ việc hoàn thành bài khảo sát sang hành vi bấm thêm trọn bộ Routine vào giỏ hàng.

---

## VIII. QUẢN LÝ SẢN PHẨM & TỒN KHO BIẾN THỂ (PRODUCT & INVENTORY MANAGEMENT)

* **Quản trị danh mục sản phẩm (Product Catalog Management):**
  * Quản lý tập trung 59 sản phẩm chính hãng thuộc 6 danh mục Moroccanoil.
  * Form thêm mới và chỉnh sửa sản phẩm chuyên nghiệp: Tên gọi, danh mục trực thuộc, tải lên tối đa 6 hình ảnh phân giải cao, nội dung chi tiết (Mô tả, Lợi ích chính, Bảng thành phần, Hướng dẫn sử dụng).
  * Thiết lập bộ nhãn đặc tính phục vụ Hair Quiz (Bắt buộc gán loại da đầu, mức độ hư tổn, bước trong quy trình chăm sóc tóc).
  * Nguyên tắc bảo toàn dữ liệu (Soft Delete): Nghiêm cấm xóa cứng các sản phẩm đã từng phát sinh đơn hàng trong quá khứ; chỉ cho phép chuyển đổi trạng thái kinh doanh giữa `Active` và `Inactive`.

* **Quản lý cấu trúc Biến thể sản phẩm (SKU Variant Management):**
  * Quản lý phân cấp 1-N (`Product` $\rightarrow$ `Product_Variants` theo dung tích).
  * Mỗi biến thể dung tích (Travel / Full / Half-Liter / Liter) sở hữu mã định danh SKU độc lập, đơn giá USD riêng biệt và lượng tồn kho độc lập.

* **Kiểm soát Tồn kho biến thể 4 chỉ số (Multi-state Inventory Tracking):**
  * Bảng theo dõi tồn kho biến thể chi tiết phân tách rõ ràng 4 trạng thái:
    $$\text{Tồn thực tế trong kho (On Hand)}$$
    $$\text{Hàng đang giữ chỗ đơn chờ giao (Reserved)}$$
    $$\text{Hàng đang trên đường nhập về (Incoming)}$$
    $$\text{Tồn kho khả dụng thực tế để bán (Available = On Hand - Reserved)}$$
  * Kiểm tra nguyên tử (Atomic Inventory Lock): Kiểm tra tồn và tăng `Reserved` diễn ra đồng thời trong một giao dịch dữ liệu, loại trừ hoàn toàn nguy cơ bán vượt quá tồn kho (overselling) khi nhiều khách cùng đặt hàng một lúc.

* **Điều chỉnh tồn kho & Hệ thống cảnh báo tự động:**
  * Tính năng cập nhật số lượng tồn thực tế (`On Hand`) tức thời kèm bắt buộc nhập lý do điều chỉnh lưu vết kiểm toán (Audit Trail).
  * Hệ thống cảnh báo tồn thấp (Low Stock): Tự động bật huy hiệu cảnh báo khi lượng tồn khả dụng $\le$ ngưỡng cấu hình (mặc định 15 sản phẩm); tự động gỡ cảnh báo khi lượng tồn được tái nhập vượt ngưỡng.
  * Tự động đồng bộ trạng thái hết hàng: Khi `Available = 0`, hệ thống tự động khóa nút mua tại cửa hàng và loại trừ sản phẩm khỏi danh sách đề xuất của Hair Quiz.

---

## IX. DỰ BÁO NHU CẦU BẰNG MACHINE LEARNING & TÁI NHẬP KHO KHÉP KÍN (ML & REPLENISHMENT)

* **Mô hình dự báo chuỗi thời gian (Time-series Demand Forecasting):**
  * Huấn luyện mô hình Hồi quy (Regression) dự báo số lượng tiêu thụ và doanh thu USD theo tuần trên phạm vi 6 danh mục ngành hàng Moroccanoil.
  * Bộ đặc trưng huấn luyện (Feature Engineering): Các yếu tố thời gian (thứ trong tuần, tháng, tính mùa vụ, ngày lễ), giá bán USD, biến động khuyến mãi, chỉ số doanh số trễ (Lag 7, Lag 14, Lag 30 ngày) và trung bình trượt (Rolling Mean 7 ngày, 30 ngày).
  * Cơ chế đánh giá & lựa chọn mô hình tự động: Áp dụng phương pháp chia tập dữ liệu theo thời gian (`TimeSeriesSplit`) đối soát giữa Linear Regression và Random Forest Regressor; tự động lựa chọn mô hình có sai số **WAPE (Weighted Absolute Percentage Error)** thấp nhất (mục tiêu WAPE < 20%), hiển thị bổ trợ MAE, RMSE, sMAPE.

* **Giám sát độ trôi dạt mô hình & Tái huấn luyện (Model Drift & Retraining):**
  * Tự động phát hiện hiện tượng trôi dạt mô hình (Model Drift) khi sai số WAPE vượt ngưỡng 20% trong 2 tuần liên tiếp; kích hoạt cờ cảnh báo trực quan "Low Confidence" tại giao diện quản trị.
  * Tích hợp nút "Retrain Model" (Offline Batch Retraining Pipeline) cho phép Admin chủ động kích hoạt tái huấn luyện mô hình dựa trên toàn bộ dữ liệu đơn hàng mới tích lũy.

* **Phân bổ dự báo từ Danh mục xuống từng SKU:**
  * Thuật toán phân rã sản lượng dự báo từ cấp danh mục xuống từng SKU biến thể dựa trên tỷ trọng đóng góp doanh số thực tế của SKU đó trong 8 tuần gần nhất.
  * Cơ chế Cold Start: Đối với sản phẩm/SKU mới lưu hành dưới 60 ngày chưa đủ dữ liệu phân bổ, hệ thống hiển thị mức dự báo ở cấp danh mục cha để Admin chủ động định đoạt số lượng nhập.

* **Công thức tính toán gợi ý số lượng tái nhập kho (Reorder Recommendation):**
  * Công thức tính số lượng đặt hàng tự động theo chu kỳ 14 ngày (Lead time 7 ngày + Chu kỳ kiểm tra 7 ngày):
    $$\text{Reorder Quantity} = \max\left(0, \; \text{Dự báo nhu cầu 14 ngày} + \text{Tồn an toàn (Safety Stock)} - (\text{Available} + \text{Incoming})\right)$$
  * Tham số tồn an toàn (Safety Stock mặc định 15 đơn vị) và các tham số chu kỳ được cấu hình linh hoạt trong Store Settings.

* **Quy trình tái nhập kho khép kín 2 bước (Closed-loop Replenishment Workflow):**
  * *Bước 1 — Đặt hàng nhập kho (A03 Sales Forecast):* Admin bấm nút "Order Stock" trên từng dòng SKU; hệ thống tăng trực tiếp số lượng hàng đang về `Incoming` của SKU đó; thuật toán ML tự động cập nhật lại công thức để không đề xuất trùng lặp đơn hàng.
  * *Bước 2 — Tiếp nhận hàng vào kho (A07 Inventory Management):* Khi kiện hàng thực tế về đến kho, Admin bấm "Receive Stock" trên dòng SKU có `Incoming > 0`; hệ thống tự động tăng tồn thực tế (`On Hand += Incoming`), đưa `Incoming` về 0, tự động nâng lượng tồn khả dụng `Available` và giải phóng cảnh báo thiếu hàng.

---

## X. QUẢN TRỊ VẬN HÀNH, KHUYẾN MÃI & HỆ THỐNG (STORE OPERATIONS & SETTINGS)

* **Xử lý đơn hàng & Phân luồng thực hiện (Order Fulfillment):**
  * Quản lý danh sách đơn hàng toàn diện: Tra cứu theo mã `#HCI-...`, tên khách hàng, số điện thoại, trạng thái thanh toán và trạng thái xử lý.
  * Điều chuyển tiến trình giao vận chuẩn xác: Chuyển từ `Processing` sang `Shipping` (hệ thống tự động thực thi trừ đồng thời cả tồn kho thực tế `On Hand` và lượng giữ chỗ `Reserved` tại thời điểm xuất kho), chuyển sang `Completed` khi giao hàng thành công.

* **Quản trị chương trình khuyến mãi & Mã giảm giá (Voucher Management):**
  * Thiết lập mã voucher linh hoạt: Mã code định danh, loại giảm giá (theo tỷ lệ % hoặc số tiền cố định USD), giá trị giảm, hạn mức giảm tối đa USD, giá trị đơn hàng tối thiểu áp dụng, thời hạn hiệu lực, tổng số lượt phát hành và giới hạn lượt dùng/mỗi tài khoản.
  * Nguyên tắc áp dụng: Giới hạn tối đa 1 voucher cho mỗi đơn hàng (không áp dụng cộng dồn); mức giảm tối đa không vượt quá giá trị tạm tính Subtotal của hàng hóa.
  * Công tắc bật/tắt kích hoạt nhanh voucher trực tiếp trên bảng quản trị.

* **Quản lý cơ sở khách hàng (Customer Management):**
  * Bảng tra cứu danh sách khách hàng: Thông tin định danh, ngày đăng ký, tổng số đơn hàng đã hoàn tất, tổng doanh chi tiêu thuần (Net Spend USD), trạng thái hoạt động.
  * Xem hồ sơ khách hàng chuyên sâu: Danh sách đơn hàng trong quá khứ, danh sách địa chỉ nhận hàng và Hồ sơ chẩn đoán tóc (Hair Profile) gần nhất.
  * Quyền khóa / Mở khóa tài khoản: Khóa tức thì quyền đăng nhập đối với tài khoản có dấu hiệu gian lận hoặc vi phạm chính sách.

* **Cài đặt & Cấu hình tham số hệ thống (Store Settings):**
  * Cấu hình thông tin chung: Tên cửa hàng, email hỗ trợ khách hàng, địa chỉ kho xuất hàng.
  * Cấu hình tham số giao dịch & Vận chuyển: Mức phí vận chuyển tiêu chuẩn cố định ($5.00 USD), đơn vị tiền tệ giao dịch chuẩn quốc tế ($ USD hiển thị 2 chữ số thập phân `$XX.XX`).
  * Cấu hình tham số thanh toán: Thời hạn thanh toán chuyển khoản (mặc định 30 phút), thông tin tài khoản ngân hàng thụ hưởng, cờ bật/tắt chế độ mô phỏng giao dịch (Payment Simulation Mode).
  * Cấu hình tham số Kho & Machine Learning: Ngưỡng cảnh báo tồn kho thấp (mặc định 15 đơn vị), Tồn an toàn Safety Stock (mặc định 15 đơn vị), Lead time giao hàng của nhà cung ứng (mặc định 7 ngày), Chu kỳ đặt hàng Review Period (mặc định 7 ngày).
