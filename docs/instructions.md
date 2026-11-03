## Giao diện (QUY TẮC TUYỆT ĐỐI)
Giao diện do designer làm bằng HTML + Tailwind CDN + JavaScript thuần, nằm trong `ui-reference/`
(index.html, app.js, globals.css, styleguide.css, style.css).
Nhiệm vụ: CHUYỂN sang Angular. KHÔNG thiết kế lại.
- Giữ nguyên: cấu trúc HTML, class Tailwind, màu, font, spacing, ảnh, nội dung chữ, hiệu ứng (kể cả parallax đa lớp ở trang chủ).
- Không tự tạo giao diện, màu, icon, bố cục hay hiệu ứng mới. Không "cải thiện" thiết kế.
- Màn hình chưa có trong ui-reference/: tạo component trống kèm comment "TODO: chờ UI" và báo tôi.
- Không chắc thì hỏi, đừng đoán.

## Quy tắc chuyển HTML/JS thuần -> Angular
- Mỗi `<section id="page-...">` (class app-screen) -> một component trang + một route (lazy load). `App.navigateTo()` -> Router/routerLink.
- Cart drawer, modal đăng nhập, modal chi tiết đơn, modal thêm sản phẩm -> component riêng, bật/tắt bằng signal trong service.
- `onclick="App.xxx()"` -> `(click)="..."`. `document.getElementById` + `innerHTML` -> data binding, `@for`, `@if`.
- Các hàm `render...()` (renderShopProducts, renderPDP, renderCheckoutSummary, renderUserOrders) -> template dùng `@for` + service.
- Đối tượng trạng thái chung trong `App` (giỏ hàng, role, đơn hàng) -> service dùng signals (CartService, AuthService, OrderService).
- Tailwind: cài Tailwind thật cho Angular, chép nguyên `tailwind.config` (màu primary-brown, deep-brown, cream-sand, teal-morocco, warm-gold, border-subtle...) từ index.html. Không dùng CDN.
- CSS trong globals.css / styleguide.css / style.css chép sang `src/styles/` giữ nguyên.
- Parallax: tách thành directive `appParallax`, giữ nguyên công thức và tốc độ từng lớp trong app.js.
- Thanh test nổi ở góc dưới (chọn màn hình, đổi role): chỉ hiển thị khi `environment.devTools = true`.
- Ảnh tải từ internet: tải về `public/assets/images/` và đổi đường dẫn.
- Dữ liệu cứng trong app.js (sản phẩm, đơn hàng mẫu) -> chuyển nguyên nội dung sang db.json cho json-server.