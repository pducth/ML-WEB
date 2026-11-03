# HAIRCARE INSIGHT — TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) & ĐỀ ÁN HỆ THỐNG
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ TÍCH HỢP HỆ CHUYÊN GIA TƯ VẤN CHĂM SÓC TÓC (RULE-BASED) & DỰ BÁO NHU CẦU NHẬP KHO (MACHINE LEARNING)

| Thuộc tính tài liệu | Nội dung đặc tả |
|---|---|
| **Mã tài liệu** | `HCI-SRS-SPECIFICATION` |
| **Tên tài liệu** | Đặc tả yêu cầu phần mềm & Đề án hệ thống HairCare Insight |
| **Quy mô kiến trúc** | **30 Màn hình Core độc lập** (16 Storefront C01–C16 + 14 Quản trị A01–A14) |
| **Hệ thống nghiệp vụ** | **73 Quy tắc nghiệp vụ chuẩn hóa** (11 phân hệ) |
| **Thời gian áp dụng** | Năm 2026 |

---

## PHẦN I. TỔNG QUAN HỆ THỐNG & DỮ LIỆU ĐẦU VÀO

### 1. Thông tin tổng quan hệ thống

| Thuộc tính | Nội dung đặc tả |
|---|---|
| **Tên hệ thống** | **HairCare Insight** — Hệ thống thương mại điện tử chuyên doanh mỹ phẩm tóc Moroccanoil, tích hợp Hair Routine Engine tư vấn liệu trình thông minh (Rule-based) và Machine Learning dự báo nhu cầu bán hàng hỗ trợ tái nhập kho tự động. |
| **Mô hình kinh doanh** | Cửa hàng trực tuyến chuyên doanh một thương hiệu (Single-Brand Boutique E-Commerce). |
| **Thương hiệu định vị** | **Moroccanoil** (dòng mỹ phẩm chăm sóc và tạo kiểu tóc chuyên nghiệp chứa tinh dầu Argan). |
| **Quy chuẩn Ngôn ngữ & Tiền tệ** | **Giao diện tiếng Anh chuẩn hóa (English UI)**; Dữ liệu sản phẩm tiếng Anh; **Tiền tệ giao dịch chuẩn USD ($)** hiển thị dạng `$XX.XX`; phí vận chuyển tiêu chuẩn cố định **$5.00 USD**. Tích hợp cổng thanh toán điện tử với cơ chế mô phỏng giao dịch thời gian thực (Simulation Gateway). |
| **Quy mô danh mục** | 59 sản phẩm chính hãng phân bổ trong 6 danh mục ngành hàng cốt lõi. |
| **Phân hệ công nghệ cốt lõi** | (1) **Hair Routine Recommendation Engine:** Động cơ suy diễn tất định (Deterministic Rule-based Inference Engine) 4 giai đoạn chuẩn hóa liệu trình chăm sóc tóc cá nhân hóa.<br>(2) **Inventory Demand Forecasting Engine:** Mô hình hồi quy chuỗi thời gian (Time-series Regression) dự báo nhu cầu tiêu thụ theo danh mục, tự động tính toán số lượng đặt hàng lại (Reorder Quantity) và vận hành quy trình tái nhập kho khép kín 2 bước (A03 Order Stock → A07 Receive Stock). |
| **Quy mô kiến trúc phần mềm** | **30 màn hình Core độc lập** (16 màn hình Khách hàng C01–C16 + 14 màn hình Quản trị A01–A14) và **73 quy tắc nghiệp vụ chuẩn hóa**. |

---

### 2. Danh mục sản phẩm & Dữ liệu thực tế (`data/products.csv`)

Hệ thống quản lý 59 sản phẩm chính hãng thuộc 6 danh mục chuẩn hóa:

| STT | Danh mục (`category`) | Số lượng SP | Tỷ lệ % | Sản phẩm tiêu biểu |
|:---:|---|:---:|:---:|---|
| 1 | **Styling & Finishing** | 24 | 40.7% | Luminous Hairspray, Curl Defining Cream, Root Boost, Perfect Defense. |
| 2 | **Hair Masks** | 11 | 18.6% | Intense Hydrating Mask, Restorative Hair Mask, Color Depositing Mask. |
| 3 | **Shampoo** | 10 | 17.0% | Hydrating Shampoo, Moisture Repair Shampoo, Extra Volume Shampoo. |
| 4 | **Conditioner** | 8 | 13.6% | Hydrating Conditioner, Moisture Repair Conditioner, Blonde Perfecting Conditioner. |
| 5 | **Treatment / Oil** | 4 | 6.8% | Moroccanoil Treatment Original, Treatment Light, Treatment Purple, Dry Scalp Treatment. |
| 6 | **Dry Shampoo** | 2 | 3.4% | Dry Shampoo Light Tones, Dry Shampoo Dark Tones. |
| **Tổng** | **6 Danh mục** | **59** | **100%** | **Toàn bộ danh mục kinh doanh của cửa hàng.** |

> **Cơ sở dữ liệu danh mục:** Dữ liệu sản phẩm (tên gọi, thông số định lượng, mô tả thành phần, công dụng và tài sản hình ảnh) được cấu trúc hóa từ hệ thống Moroccanoil Global Catalog. Danh mục kinh doanh được phân bổ chuẩn hóa thành 6 nhóm ngành hàng độc lập làm cơ sở cho phân loại catalog và huấn luyện mô hình dự báo.

---

### 3. Kiến trúc dữ liệu cốt lõi

* **Cấu trúc Biến thể 1-N (`Product` $\rightarrow$ `Product_Variant`):** 
  * `Product`: Chứa thông tin chung (Tên, Danh mục, Hình ảnh, Mô tả, Lợi ích chính `key_benefits`, Thành phần `ingredients`, Hướng dẫn sử dụng `how_to_use`, Bộ nhãn Quiz).
  * `Product_Variant`: Chứa thông tin SKU biến thể theo dung tích (Travel 2.4 oz, Full 8.5 oz, Half-Liter 16.9 oz, Liter 33.8 oz) với đơn giá `price_usd` và số lượng tồn kho (`on_hand`, `reserved`, `incoming`, `available`) riêng biệt.
* **Cơ chế đánh giá Store Verified Reviews:** Hệ thống quản lý dữ liệu đánh giá nội bộ độc lập, chỉ kích hoạt quyền viết nhận xét và chấm điểm sao đối với người dùng đã hoàn tất đơn hàng thực tế (`Completed`).
* **Phân loại nhu cầu tóc (7 nhóm nhu cầu chính):**
  $$\text{Phục hồi hư tổn (Repair)} > \text{Cân bằng da đầu (Scalp)} > \text{Giữ màu nhuộm (Color)} > \text{Định hình tóc xoăn (Curl)} > \text{Cấp ẩm (Hydration)} > \text{Tăng phồng (Volume)} > \text{Tạo kiểu (Styling)}$$
* **Các thực thể nghiệp vụ cốt lõi:** `Return_Request` (yêu cầu đổi trả gắn trực tiếp với đơn hàng), `Incoming` (trường quản lý số lượng hàng đang về theo từng SKU biến thể), `Quiz_Event` (lượt làm Quiz ẩn danh phục vụ thống kê BI), `Admin_User` (bảng tài khoản quản trị riêng), `Voucher_Redemption` (lượt dùng voucher).

---

## PHẦN II. SITEMAP & ĐẶC TẢ CHI TIẾT 30 MÀN HÌNH CORE

### 1. Sitemap hệ thống dạng cây (Visual Site Tree)

> **Quy ước đọc Sitemap:** Trang con (thụt vào) là trang phụ thuộc hoặc chỉ truy cập được từ trang cha. Trang cùng cấp là trang độc lập trong cùng nhóm chức năng. Việc kiểm soát phân quyền (ai được vào trang nào) được quy định tại **Ma trận RBAC** bên dưới.

```text
HAIRCARE INSIGHT E-COMMERCE PLATFORM
│
├── [CỬA HÀNG KHÁCH HÀNG — CUSTOMER PORTAL] (16 Trang)
│   │
│   ├── C01. Trang chủ (Home Page)
│   │
│   ├── C02. Cửa hàng & Tìm kiếm (Shop Catalog & Search)
│   │       └── C03. Chi tiết sản phẩm (Product Detail Page)
│   │
│   ├── C04. Quiz tư vấn tóc 4 bước (Hair Routine Quiz)
│   │       └── C05. Kết quả Quiz & Routine đề xuất (Quiz Result)
│   │
│   ├── C06. Giỏ hàng (Shopping Cart)
│   │       └── C07. Đặt hàng & Thanh toán (Checkout)
│   │               ├── C08. Chờ thanh toán điện tử (Payment Pending — 30m)
│   │               └── C09. Đặt hàng thành công (Order Success / Thank You)
│   │
│   ├── C10. Đăng nhập (Login Page)
│   │       └── C12. Quên & Đặt lại mật khẩu (Forgot & Reset Password — OTP)
│   │
│   ├── C11. Đăng ký (Register Page)
│   │
│   ├── C13. Hồ sơ cá nhân, Sổ địa chỉ & Hair Profile (My Profile)
│   │
│   ├── C14. Lịch sử đơn hàng (Order History)
│   │       └── C15. Chi tiết đơn hàng & Đánh giá (Order Detail & Review)
│   │
│   └── C16. Giới thiệu & Chính sách (About Us & Store Policies)
│
└── [HỆ THỐNG QUẢN TRỊ — ADMIN SYSTEM] (/admin/*) (14 Trang)
    │
    ├── A01. Đăng nhập Quản trị (Admin Login — /admin/login)
    │
    ├── A02. Bảng điều khiển trung tâm (Dashboard & KPIs)
    │
    ├── A03. Dự báo bán hàng & Gợi ý nhập hàng ML (Sales Forecast)
    │
    ├── A04. Danh sách sản phẩm (Product List)
    │       ├── A05. Thêm mới sản phẩm (Product Create Form)
    │       └── A06. Chỉnh sửa sản phẩm (Product Edit Form)
    │
    ├── A07. Quản lý tồn kho theo biến thể (Inventory Stock Management)
    │
    ├── A08. Danh sách đơn hàng (Order List)
    │       └── A09. Chi tiết & Xử lý đơn hàng (Order Detail & Fulfillment)
    │
    ├── A10. Danh sách mã giảm giá (Voucher List)
    │       └── A11. Tạo & Chỉnh sửa mã giảm giá (Voucher Create/Edit Form)
    │
    ├── A12. Cài đặt cửa hàng & Hệ thống (Store Settings)
    │
    ├── A13. Quản lý khách hàng (Customer Management)
    │
    └── A14. Kiểm duyệt đánh giá (Review Moderation)
```


---



### 2. Ma trận phân quyền truy cập (RBAC)

| Nhóm màn hình | Mã & Tên màn hình | Guest (Khách vãng lai) | Customer (Đã đăng nhập) | Admin (Quản trị viên) |
|---|---|:---:|:---:|:---:|
| **Storefront** | C01 Trang chủ, C02 Shop, C03 Chi tiết sản phẩm | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép |
| | C04 Hair Quiz, C05 Kết quả Quiz & Routine | ✅ Cho phép | ✅ Lưu vào Profile | ✅ Cho phép |
| | C06 Giỏ hàng | ✅ Giỏ Session | ✅ Giỏ Tài khoản | – |
| | C16 Giới thiệu & Chính sách (About Us & Store Policies) | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép |
| **Xác thực & Hồ sơ** | C10 Đăng nhập | ✅ Cho phép | ❌ Chuyển sang C13 | – |
| | C11 Đăng ký | ✅ Cho phép | ❌ Chuyển sang C13 | – |
| | C12 Quên & Đặt lại mật khẩu (OTP) | ✅ Cho phép | ❌ Chuyển sang C13 | – |
| | C13 Hồ sơ cá nhân & Hair Profile | ❌ Yêu cầu Login | ✅ Toàn quyền | – |
| | C14 Lịch sử đơn hàng | ❌ Yêu cầu Login | ✅ Toàn quyền | – |
| | C15 Chi tiết đơn hàng & Viết review | ❌ Yêu cầu Login | ✅ Toàn quyền | – |
| **Giao dịch Đơn hàng** | C07 Đặt hàng & Thanh toán (Checkout) | ❌ Chuyển sang C10 | ✅ Toàn quyền | – |
| | C08 Chờ thanh toán điện tử (30m) | ❌ Chuyển sang C10 | ✅ Xem & Chuyển khoản | – |
| | C09 Đặt hàng thành công | ❌ Chuyển sang C10 | ✅ Xem biên nhận | – |
| **Quản trị (/admin/*)** | A01 Đăng nhập Quản trị (`/admin/login`) | ✅ Xem form đăng nhập | ✅ Xem form (đăng nhập bị từ chối) | ✅ Đăng nhập → A02 |
| | A02 Dashboard, A03 Sales Forecast ML | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A04 Danh sách SP, A05 Thêm SP, A06 Sửa SP | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A07 Quản lý tồn kho biến thể | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A08 Danh sách đơn hàng | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A09 Chi tiết & Xử lý vòng đời đơn hàng | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A10 Danh sách voucher, A11 Tạo/Sửa voucher | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A12 Cài đặt hệ thống & Tham số kho/ML | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A13 Quản lý khách hàng | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |
| | A14 Kiểm duyệt đánh giá | ↪ Chuyển `/admin/login` | ❌ 403 | ✅ Toàn quyền |

> **Quy ước truy cập `/admin/*`:** Chưa đăng nhập → chuyển về `/admin/login`. Đã đăng nhập bằng tài khoản Customer → trả về 403. `/admin/login` là trang công khai (mọi người xem được form) nhưng chỉ chấp nhận tài khoản trong bảng quản trị riêng; mọi lỗi xác thực đều báo chung "Invalid credentials" (`BR-ACC-06`).

---

### 3. Đặc tả 16 màn hình Khách hàng (Customer Pages: C01 – C16)

#### `C01` | Trang chủ (Home Page)
* **Actor:** Guest, Customer.
* **Mục đích:** Giới thiệu thương hiệu Moroccanoil, điều hướng nhanh tới 6 danh mục, tôn vinh sản phẩm bán chạy và kêu gọi tham gia Hair Quiz.
* **Dữ liệu & Thao tác:** Hero banner giới thiệu Argan Oil; Lưới 6 danh mục chính; Danh sách Best Sellers kèm giá USD; Banner CTA làm Quiz ("Find Your Routine"); Header (Search, Cart badge, Account icon); Footer (Chính sách, Vận chuyển).
* **Trạng thái đặc biệt:** Skeleton loader khi tải trang; Giỏ hàng cập nhật số lượng tức thời.
* **Quy tắc liên quan:** `BR-PRD-01`, `BR-QUZ-01`, `BR-ACC-03`.

#### `C02` | Cửa hàng & Tìm kiếm (Shop Catalog & Search)
* **Actor:** Guest, Customer.
* **Mục đích:** Khám phá danh mục 59 sản phẩm, tìm kiếm thông minh và lọc sản phẩm đa tiêu chí.
* **Dữ liệu & Thao tác:** Lưới sản phẩm (Ảnh, Tên, Danh mục, Đơn giá USD theo biến thể mặc định, Điểm sao trung bình từ Store Verified Reviews (ẩn nếu chưa có đánh giá), Nhãn "Out of Stock"); Bộ lọc theo 6 Danh mục (`category`), khoảng giá USD, tình trạng tồn kho; Sắp xếp theo giá, bán chạy, mới nhất; Ô tìm kiếm từ khóa; Phân trang.
* **Trạng thái đặc biệt:** Không có kết quả hiển thị thông báo "No products found" kèm nút đặt lại bộ lọc; Ẩn sản phẩm Inactive theo `BR-SRC-03`.
* **Quy tắc liên quan:** `BR-SRC-01`, `BR-SRC-02`, `BR-SRC-03`, `BR-PRD-04`, `BR-ACC-03`.

#### `C03` | Chi tiết sản phẩm (Product Detail Page)
* **Actor:** Guest, Customer.
* **Mục đích:** Cung cấp thông tin chuyên sâu của sản phẩm, hỗ trợ lựa chọn dung tích biến thể và thêm vào giỏ hàng.
* **Dữ liệu & Thao tác:** Thư viện ảnh; Tên sản phẩm; Danh mục; Bộ chọn dung tích (Travel/Full/Liter) cập nhật giá USD và tình trạng kho tức thời; Cụm tăng/giảm số lượng; Nút "Add to Cart" (thêm vào giỏ, hiển thị toast xác nhận và ở lại trang) & Nút "Buy Now" (thêm vào giỏ và chuyển thẳng sang C07 Checkout, yêu cầu đăng nhập nếu là Guest); Tab thông tin chi tiết (Mô tả, Lợi ích, Thành phần, Hướng dẫn sử dụng); Khối Store Verified Reviews (điểm sao trung bình, số lượt, danh sách đánh giá) kèm nút gửi đánh giá nếu đã mua hàng.
* **Trạng thái đặc biệt:** Biến thể hết hàng (`Available = 0`) tự động vô hiệu hóa nút mua và chuyển thành nhãn "Out of Stock" (`BR-PRD-04`); Sản phẩm chưa có đánh giá hiển thị "No reviews yet".
* **Quy tắc liên quan:** `BR-PRD-01`, `BR-PRD-04`, `BR-REV-01`, `BR-REV-04`, `BR-ORD-01`.

#### `C04` | Quiz tư vấn tóc 4 bước (Hair Routine Quiz)
* **Actor:** Guest, Customer.
* **Mục đích:** Chẩn đoán tình trạng tóc và da đầu thông qua 4 bước câu hỏi để xây dựng liệu trình chăm sóc tóc tối ưu.
* **Dữ liệu & Thao tác:** Thanh tiến trình tương tác (Step 1/4 $\rightarrow$ 4/4); 4 bước câu hỏi: (1) Tình trạng da đầu, (2) Tình trạng sợi tóc, (3) Tần suất gội & Lịch sử uốn/nhuộm/tẩy, (4) Mục tiêu chăm sóc tóc chính; Nút "Next", "Back", "View My Routine".
* **Trạng thái đặc biệt:** Câu hỏi bắt buộc chưa chọn sẽ vô hiệu hóa nút chuyển bước (`BR-QUZ-01`). Toàn bộ câu hỏi và bộ luật nạp từ file JSON cấu hình độc lập (`BR-QUZ-08`).
* **Quy tắc liên quan:** `BR-QUZ-01`, `BR-QUZ-02`, `BR-QUZ-03`, `BR-QUZ-08`, `BR-ACC-03`.

#### `C05` | Kết quả Quiz & Routine đề xuất (Quiz Result & Routine Recommendation)
* **Actor:** Guest, Customer.
* **Mục đích:** Hiển thị kết quả chẩn đoán nhu cầu tóc và đề xuất trọn bộ Routine 4 bước hoàn chỉnh.
* **Dữ liệu & Thao tác:** Thẻ chẩn đoán tóc cá nhân; Lời khuyên chăm sóc; Khuyến cáo y khoa bắt buộc (`BR-QUZ-09`); Danh sách tối đa 4 sản phẩm đề xuất, mỗi bước 1 sản phẩm (Step 1: Cleanse, Step 2: Condition, Step 3: Treat/Mask, Step 4: Style/Protect); Khối "Optional Add-on" riêng (tối đa 1 sản phẩm đặc trị hỗ trợ theo nhãn phụ, có nút Add riêng); Nút "Add Full Routine to Cart" (chỉ gồm sản phẩm của các bước, không gồm add-on); Nút "Save to Hair Profile" (yêu cầu đăng nhập, chỉ lưu khi khách chủ động bấm); Nút "Retake Quiz".
* **Trạng thái đặc biệt:** Sản phẩm trong routine hết hàng sẽ tự động chọn sản phẩm thay thế cùng công dụng hoặc bỏ bước kèm ghi chú rõ ràng (`BR-QUZ-05`).
* **Quy tắc liên quan:** `BR-QUZ-04`, `BR-QUZ-05`, `BR-QUZ-06`, `BR-QUZ-07`, `BR-QUZ-08`, `BR-QUZ-09`, `BR-QUZ-10`, `BR-ACC-03`.

#### `C06` | Giỏ hàng (Shopping Cart)
* **Actor:** Guest, Customer.
* **Mục đích:** Quản lý danh sách sản phẩm dự định mua, kiểm tra dung tích, số lượng và tổng tiền tạm tính bằng USD.
* **Dữ liệu & Thao tác:** Danh sách sản phẩm trong giỏ (Ảnh, Tên, Biến thể dung tích, Đơn giá USD, Cụm số lượng, Nút xóa món, Thành tiền); Ô áp dụng mã giảm giá Voucher; Tạm tính Subtotal (USD), Tiền giảm Voucher Discount (USD), Tổng Total (USD); Phí ship tiêu chuẩn $5.00 USD; Nút "Proceed to Checkout".
* **Trạng thái đặc biệt:** Giỏ trống hiển thị giao diện thông báo kèm nút "Start Shopping"; Sản phẩm trong giỏ bị hết hàng hoặc đổi giá sẽ cảnh báo đỏ và chặn checkout (`BR-ORD-02`); Sau khi Guest đăng nhập, giỏ session được gộp vào giỏ tài khoản theo `BR-ACC-04` (cắt theo `Available` kèm thông báo, không xóa âm thầm).
* **Quy tắc liên quan:** `BR-ORD-01`, `BR-ORD-02`, `BR-VCH-04`, `BR-ACC-03`, `BR-ACC-04`.

#### `C07` | Đặt hàng & Thanh toán (Checkout)
* **Actor:** Customer (Bắt buộc đăng nhập tài khoản).
* **Mục đích:** Xác nhận thông tin nhận hàng, chọn phương thức thanh toán và tạo đơn hàng.
* **Dữ liệu & Thao tác:** Khối Địa chỉ giao hàng (chọn từ sổ địa chỉ hoặc nhập mới); Khối Phương thức thanh toán (COD hoặc Chuyển khoản điện tử USD); Khối Mã giảm giá chính thức; Tóm tắt đơn hàng (Subtotal, Voucher Discount, Shipping $5.00, Order Total); Nút "Place Order" (tự động khóa ngay sau khi bấm).
* **Trạng thái đặc biệt:** Chọn COD tạo đơn chuyển thẳng sang `C09` (`Processing`); Chọn Chuyển khoản tạo đơn chuyển sang `C08` (`Payment Pending`).
* **Quy tắc liên quan:** `BR-ORD-01`, `BR-ORD-03`, `BR-ORD-06`, `BR-PAY-01`, `BR-PAY-06`, `BR-PAY-07`, `BR-VCH-03`.

#### `C08` | Chờ thanh toán điện tử (Payment Pending)
* **Actor:** Customer.
* **Mục đích:** Hướng dẫn thanh toán chuyển khoản với mã tham chiếu duy nhất, đếm ngược 30 phút và tự động cập nhật trạng thái khi nhận tiền.
* **Dữ liệu & Thao tác:** Mã đơn hàng; Tổng tiền thanh toán (USD); Mã định danh thanh toán duy nhất (`PAY-HCI-XXXXX`); Thông tin tài khoản nhận tiền / QR code; Đồng hồ đếm ngược 30 phút (`mm:ss`); Nút "I Have Paid" (kích hoạt kiểm tra tức thì); Nút "Cancel Order"; Chức năng kích hoạt mô phỏng thanh toán thành công "Simulate Successful Payment" phục vụ kiểm định quy trình xử lý giao dịch.
* **Trạng thái đặc biệt:** Nhận thanh toán qua Webhook/Polling tự động chuyển đơn sang `Processing` và điều hướng về `C09` (`BR-PAY-04`); Hết 30 phút tự động hủy đơn và hoàn trả tồn kho (`BR-PAY-03`).
* **Quy tắc liên quan:** `BR-PAY-02`, `BR-PAY-03`, `BR-PAY-04`, `BR-ORD-03`, `BR-ORD-05`.

#### `C09` | Đặt hàng thành công (Order Success / Thank You)
* **Actor:** Customer.
* **Mục đích:** Xác nhận đơn hàng đã được tiếp nhận thành công vào hệ thống.
* **Dữ liệu & Thao tác:** Biểu tượng thành công; Mã định danh đơn hàng chính thức (`#HCI-YYYYMMDD-XXXX`); Thông báo trạng thái `Processing`; Tóm tắt sản phẩm; Thông tin giao nhận; Nút "View Order Details" dẫn sang C15; Nút "Continue Shopping" quay về C01.
* **Trạng thái đặc biệt:** Tải lại trang (F5) không sinh đơn trùng lặp.
* **Quy tắc liên quan:** `BR-ORD-03`, `BR-ORD-08`.

#### `C10` | Đăng nhập (Login Page)
* **Actor:** Guest.
* **Mục đích:** Cổng xác thực người dùng để truy cập tài khoản, quản lý đơn hàng và đồng bộ hồ sơ cá nhân.
* **Dữ liệu & Thao tác:** Form đăng nhập gồm Email, Password, Ghi nhớ đăng nhập ("Remember Me"); Nút "Sign In"; Liên kết "Forgot Password?" dẫn sang C12; Liên kết chuyển hướng nhanh sang C11 Đăng ký ("Don't have an account? Sign Up").
* **Trạng thái đặc biệt:** Đăng nhập thành công tự động quay lại trang trước đó (theo tham số `redirect` / `return_url`, ví dụ quay lại C07 nếu đang Checkout); Giỏ hàng tạm thời của Guest tự động gộp vào tài khoản (`BR-ACC-04`); Kết quả Quiz của Guest chỉ được lưu vào Hair Profile nếu khách đã bấm "Save to Hair Profile" trước đó (cờ `pending_save`), nếu đã có hồ sơ cũ thì hiển thị hộp xác nhận ghi đè (`BR-QUZ-07`); Sai 5 lần liên tiếp bị khóa tạm 5 phút (`BR-ACC-08`); Tài khoản bị Admin khóa không đăng nhập được (`BR-ACC-09`).
* **Quy tắc liên quan:** `BR-ACC-01`, `BR-ACC-02`, `BR-ACC-04`, `BR-ACC-05`, `BR-ACC-08`, `BR-ACC-09`, `BR-QUZ-07`.

#### `C11` | Đăng ký (Register Page)
* **Actor:** Guest.
* **Mục đích:** Đăng ký tài khoản khách hàng mới trên hệ thống để tích lũy lịch sử mua sắm và lưu hồ sơ tóc cá nhân.
* **Dữ liệu & Thao tác:** Form đăng ký gồm Họ và tên (Full Name), Email, Số điện thoại (Phone Number), Mật khẩu (Password tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số), Xác nhận mật khẩu (Confirm Password); Checkbox đồng ý Điều khoản & Chính sách (dẫn liên kết sang C16); Nút "Sign Up"; Liên kết chuyển hướng nhanh sang C10 Đăng nhập ("Already have an account? Sign In").
* **Trạng thái đặc biệt:** Kiểm tra định dạng và tính duy nhất của Email và Số điện thoại (`BR-ACC-01`, `BR-ACC-02`); Đăng ký thành công tự động đăng nhập, gộp giỏ hàng session sang tài khoản (`BR-ACC-04`), tự động lưu Hair Profile nếu có cờ `pending_save` (`BR-QUZ-07`) và điều hướng người dùng (theo `redirect` hoặc về C13/C01).
* **Quy tắc liên quan:** `BR-ACC-01`, `BR-ACC-02`, `BR-ACC-04`, `BR-ACC-05`, `BR-QUZ-07`.

#### `C12` | Quên & Đặt lại mật khẩu (Forgot & Reset Password — OTP Verification)
* **Actor:** Guest, Customer.
* **Mục đích:** Khôi phục quyền truy cập tài khoản qua quy trình xác thực mã OTP.
* **Dữ liệu & Thao tác:** Bước 1: Nhập email đã đăng ký, Nút gửi mã OTP; Bước 2: Nhập OTP 6 số (hiệu lực 10 phút), Nhập New Password, Confirm Password, Nút "Reset Password".
* **Trạng thái đặc biệt:** OTP sai hoặc quá 10 phút báo lỗi kèm nút gửi lại; Đổi mật khẩu thành công chuyển về C10 kèm thông báo xanh.
* **Quy tắc liên quan:** `BR-ACC-01`, `BR-ACC-05`, `BR-ACC-07`.

#### `C13` | Hồ sơ cá nhân, Sổ địa chỉ & Hair Profile (My Profile & Hair Profile)
* **Actor:** Customer.
* **Mục đích:** Quản lý thông tin tài khoản, đổi mật khẩu, lưu trữ sổ địa chỉ nhận hàng và xem lại kết quả Hair Profile đã lưu.
* **Dữ liệu & Thao tác:** Khối Thông tin cá nhân (Tên, SĐT, Email, Đổi mật khẩu); Khối Hair Profile (Nhu cầu tóc đã chẩn đoán, Routine 4 bước đã lưu, Ngày làm gần nhất, Nút "Retake Hair Quiz" dẫn sang C04); Khối Sổ địa chỉ (Danh sách địa chỉ nhận hàng, Đặt mặc định, Thêm mới).
* **Trạng thái đặc biệt:** Lưu kết quả Quiz mới khi đã có hồ sơ cũ sẽ hiển thị hộp xác nhận ghi đè kèm ngày của hồ sơ cũ (`BR-QUZ-07`); Hair Profile ghi nhận phiên bản bộ luật đã dùng (`ruleset_version`) nên cập nhật luật không làm thay đổi hồ sơ cũ (`BR-QUZ-08`).
* **Quy tắc liên quan:** `BR-ACC-01`, `BR-QUZ-07`, `BR-SYS-01`.

#### `C14` | Lịch sử đơn hàng (Order History)
* **Actor:** Customer.
* **Mục đích:** Theo dõi danh sách toàn bộ các đơn hàng đã đặt trong quá khứ và hiện tại.
* **Dữ liệu & Thao tác:** Thẻ đơn hàng (Mã đơn, Ngày đặt, Ảnh thu nhỏ sản phẩm, Số lượng món, Tổng tiền USD, Huy hiệu trạng thái đơn: Payment Pending, Processing, Shipping, Completed, Return Pending, Returned, Cancelled); Bộ lọc theo 7 trạng thái đơn hàng; Nút "Pay Now" cho đơn Payment Pending; Bấm vào đơn mở C15.
* **Trạng thái đặc biệt:** Tài khoản chưa có đơn hiển thị màn hình rỗng kèm nút "Start Shopping".
* **Quy tắc liên quan:** `BR-ORD-03`, `BR-ORD-09`, `BR-RET-01`.

#### `C15` | Chi tiết đơn hàng & Đánh giá (Order Detail & Review)
* **Actor:** Customer.
* **Mục đích:** Xem toàn diện thông tin đơn hàng, theo dõi tiến trình giao nhận và viết đánh giá sản phẩm đã mua.
* **Dữ liệu & Thao tác:** Mã đơn, Ngày giờ đặt; Timeline trạng thái; Thông tin người nhận; Chi tiết sản phẩm (Ảnh, Tên, Dung tích, Đơn giá USD, Số lượng, Thành tiền); Subtotal, Voucher Discount, Shipping $5.00, Total USD; Nút "Cancel Order" (chỉ khi đơn ở `Payment Pending` hoặc `Processing`); Nút "Write Review" (chỉ khi đơn ở `Completed`); Nút "Request Return" (chỉ hiển thị khi đơn `Completed` và còn trong 7 ngày kể từ lúc hoàn tất kèm nhãn thời hạn; bắt buộc chọn 1 lý do và xác nhận sản phẩm còn nguyên seal — trừ lý do hàng lỗi/giao sai; áp dụng cho toàn bộ đơn hàng).
* **Trạng thái đặc biệt:** Đã đánh giá sản phẩm chuyển thành nút "View Your Review" (cho phép sửa, chặn gửi trùng lặp theo `BR-REV-03`); Đơn đã gửi yêu cầu trả hàng chuyển sang trạng thái `Return Pending` (đồng thời vô hiệu hóa nút "Write Review" và "Request Return" theo `BR-RET-01`, `BR-REV-02`); Khi Admin phê duyệt thì đơn chuyển sang `Returned` và thanh toán chuyển `Refunded`; nếu Admin từ chối thì đơn quay lại `Completed` kèm thông báo lý do; Đánh giá bị ẩn bởi cửa hàng hiển thị nhãn "Hidden by store" (`BR-REV-05`).
* **Quy tắc liên quan:** `BR-ORD-01`, `BR-ORD-03`, `BR-ORD-04`, `BR-REV-01`, `BR-REV-02`, `BR-REV-03`, `BR-REV-04`, `BR-REV-05`, `BR-RET-01`, `BR-RET-02`.

#### `C16` | Giới thiệu & Chính sách (About Us & Store Policies)
* **Actor:** Guest, Customer, Admin.
* **Mục đích:** Cung cấp thông tin toàn diện về thương hiệu Moroccanoil cùng hệ thống chính sách bán hàng, giao hàng, đổi trả và bảo mật minh bạch.
* **Dữ liệu & Thao tác:** Màn hình thông tin toàn diện được tổ chức với 4 Tab/Section:
  * **Tab 1 — Giới thiệu về thương hiệu (About Us):** Giới thiệu câu chuyện thương hiệu Moroccanoil, sứ mệnh chăm sóc tóc chuyên nghiệp và thông điệp cam kết chất lượng sản phẩm chính hãng.
  * **Tab 2 — Chính sách bán hàng & Giao hàng (Sales & Shipping Policy):** Niêm yết tiền tệ chuẩn USD ($), giá bán cố định theo biến thể, phí vận chuyển đồng giá $5.00 USD, thời gian 3–5 ngày làm việc.
  * **Tab 3 — Chính sách đổi trả & Hoàn tiền (Return & Refund Policy):** Khách gửi yêu cầu trả hàng ngay trên hệ thống (C15) trong 7 ngày kể từ khi đơn hoàn tất (áp dụng đổi trả toàn bộ đơn hàng, không áp dụng trả một phần), với sản phẩm còn nguyên seal tem niêm phong (trừ hàng lỗi/giao sai); Admin phê duyệt sẽ hoàn tiền Order Total trừ $5.00 ship (hoàn 100% cả ship nếu lỗi từ phía cửa hàng) và nhập lại kho (`BR-RET-01`, `BR-RET-02`); hoàn tiền 100% cho đơn hủy hợp lệ trước khi giao (`BR-PAY-08`).
  * **Tab 4 — Chính sách bảo mật (Privacy Policy):** Bảo mật tuyệt đối thông tin cá nhân, số điện thoại, sổ địa chỉ và lịch sử đơn hàng theo chuẩn (`BR-SYS-01`).
* **Trạng thái đặc biệt:** Hỗ trợ chuyển đổi linh hoạt giữa 4 tab/section; tối ưu hóa đọc và hiển thị responsive trên cả máy tính và thiết bị di động.
* **Quy tắc liên quan:** `BR-PAY-06`, `BR-PAY-08`, `BR-RET-01`, `BR-RET-02`, `BR-SYS-01`, `BR-SYS-03`.

---

### 4. Đặc tả 14 màn hình Quản trị (Admin Pages: A01 – A14)

#### `A01` | Đăng nhập Quản trị (Admin Login)
* **Actor:** Admin.
* **Mục đích:** Cổng xác thực độc lập cho quản trị viên tại route `/admin/login`, tách biệt hoàn toàn với khách hàng mua sắm.
* **Dữ liệu & Thao tác:** Form đăng nhập tối giản (Username/Email, Mật khẩu, Nút "Sign In to Admin").
* **Trạng thái đặc biệt:** Tài khoản khách hàng thông thường không được phép đăng nhập; mọi trường hợp sai thông tin hoặc sai loại tài khoản đều báo chung "Invalid credentials" để không tiết lộ tài khoản có tồn tại hay không (`BR-ACC-06`). Truy cập `/admin/*` khi chưa đăng nhập tự động chuyển về `/admin/login`.
* **Quy tắc liên quan:** `BR-ACC-06`, `BR-ACC-08`.

#### `A02` | Bảng điều khiển trung tâm (Dashboard & KPIs)
* **Actor:** Admin.
* **Mục đích:** Cung cấp bức tranh toàn cảnh về hiệu quả kinh doanh, đơn hàng, tồn kho và thống kê tư vấn Hair Quiz theo thời gian thực.
* **Dữ liệu & Thao tác:** Bộ lọc thời gian; Thẻ chỉ số chính (Net Revenue USD, Số đơn hoàn tất, Giá trị đơn trung bình AOV theo USD, Khách hàng mới); Biểu đồ doanh thu theo thời gian; Biểu đồ tỷ trọng doanh số (Gross Sales) theo 6 danh mục; Khối Action Items (Đơn chờ xử lý `Processing`, Yêu cầu trả hàng chờ duyệt `Return Pending`, Cảnh báo tồn thấp theo ngưỡng cấu hình — mặc định $\le 15$); Thống kê Hair Quiz (từ dữ liệu `BR-QUZ-10`); Widget tóm tắt dự báo ML kèm liên kết sang A03.
* **Trạng thái đặc biệt:** Doanh thu, số đơn và AOV chỉ tính đơn hoàn tất (`Completed` và `Return Pending`) và loại đơn `Returned`; đơn `Payment Pending`, `Processing`, `Shipping`, `Cancelled` không tính vào doanh thu mà hiển thị riêng ở Action Items (`BR-ORD-09`).
* **Quy tắc liên quan:** `BR-ORD-09`, `BR-ML-01`, `BR-PRD-02`, `BR-QUZ-10`, `BR-RET-01`.

#### `A03` | Dự báo bán hàng & Gợi ý nhập hàng ML (Sales Forecast & Inventory Replenishment)
* **Actor:** Admin.
* **Mục đích:** Ứng dụng mô hình Machine Learning Regression dự báo nhu cầu tiêu thụ theo 6 danh mục và đề xuất số lượng nhập hàng tự động.
* **Dữ liệu & Thao tác:** Bộ chọn danh mục (6 danh mục chính); Chu kỳ xem biểu đồ (7 / 30 / 90 ngày); Biểu đồ Doanh số thực tế vs Đường dự báo tương lai (USD & Số lượng, hiển thị tổng hợp theo tuần); Thẻ chỉ số sai số mô hình (WAPE là chỉ số chính, kèm MAE, RMSE, sMAPE); Bảng gợi ý nhập hàng theo từng SKU/biến thể (Tồn khả dụng `Available`, Hàng đang về `Incoming`, Dự báo nhu cầu 14 ngày, Tồn an toàn `Safety Stock`, Số lượng đề xuất nhập `Reorder Quantity` theo `BR-ML-05`); Nút "Order Stock" tại từng dòng SKU (nhập số lượng muốn đặt, hệ thống tăng trực tiếp `Incoming` của SKU đó, ML tự động cập nhật lại đề xuất để không gợi ý trùng); Nút "Retrain Model" (kích hoạt quy trình tái huấn luyện mô hình theo lô - Batch Retraining Pipeline).
* **Trạng thái đặc biệt:** Cảnh báo Model Drift nếu WAPE vượt ngưỡng 20% trong 2 tuần liên tiếp (`BR-ML-06`); Nếu cả 2 mô hình đều vượt ngưỡng, hệ thống vẫn dùng mô hình tốt hơn và hiển thị banner "Low confidence" (`BR-ML-03`).
* **Quy tắc liên quan:** `BR-ML-01`, `BR-ML-02`, `BR-ML-03`, `BR-ML-04`, `BR-ML-05`, `BR-ML-06`, `BR-ML-07`, `BR-ML-08`, `BR-ML-09`.

#### `A04` | Danh sách sản phẩm (Product List)
* **Actor:** Admin.
* **Mục đích:** Quản lý tập trung toàn bộ danh mục hàng hóa, tìm kiếm, lọc và kiểm soát trạng thái kinh doanh của 59 sản phẩm.
* **Dữ liệu & Thao tác:** Bảng sản phẩm (Ảnh, Tên, Danh mục, Số biến thể, Tổng tồn kho `Available`, Giá bán USD, Trạng thái Active/Inactive); Bộ lọc 6 danh mục; Lọc theo trạng thái; Tìm kiếm tên sản phẩm; Nút "Edit" mở A06; Nút đổi trạng thái; Nút "Delete" (chỉ xóa khi chưa phát sinh đơn hàng theo `BR-PRD-05`); Nút "Add New Product" mở A05.
* **Trạng thái đặc biệt:** Sản phẩm đã từng có đơn hàng thì nút xóa bị vô hiệu hóa để bảo toàn dữ liệu.
* **Quy tắc liên quan:** `BR-PRD-01`, `BR-PRD-05`, `BR-PRD-06`.

#### `A05` | Thêm mới sản phẩm (Product Create Form)
* **Actor:** Admin.
* **Mục đích:** Form chuyên biệt tạo mới sản phẩm, tải ảnh, thiết lập các biến thể dung tích và gán bộ nhãn Quiz.
* **Dữ liệu & Thao tác:** Khối 1: Thông tin cơ bản (Tên, 1 trong 6 Category chính); Khối 2: Quản lý biến thể dung tích (Bảng động: Size Name ví dụ Travel/Full/Liter, Dung tích ml, Giá bán USD, Tồn kho ban đầu, SKU; Nút "Add Variant"); Khối 3: Thư viện ảnh (Upload tối đa 6 ảnh, chọn ảnh đại diện); Khối 4: Nội dung chi tiết (Mô tả, Lợi ích, Thành phần, Hướng dẫn sử dụng); Khối 5: Bộ thuộc tính nhãn Quiz (Loại da đầu, Nhu cầu tóc, Bước trong Routine theo `BR-PRD-07`); Nút "Publish Product".
* **Trạng thái đặc biệt:** Validate báo đỏ nếu thiếu thông tin bắt buộc hoặc thiếu nhãn Quiz.
* **Quy tắc liên quan:** `BR-PRD-01`, `BR-PRD-06`, `BR-PRD-07`.

#### `A06` | Chỉnh sửa sản phẩm (Product Edit Form)
* **Actor:** Admin.
* **Mục đích:** Cập nhật thông tin chi tiết, điều chỉnh giá bán các biến thể hoặc cấu hình lại nhãn Quiz cho sản phẩm đang lưu hành.
* **Dữ liệu & Thao tác:** Điền sẵn toàn bộ dữ liệu hiện tại của sản phẩm; Chỉnh sửa thông tin, giá bán USD, biến thể, ảnh, nhãn Quiz; Chuyển đổi trạng thái Active/Inactive; Nút "Save Changes".
* **Trạng thái đặc biệt:** Sửa giá bán biến thể không làm thay đổi số tiền trong các đơn hàng đã đặt trước đó (`BR-ORD-07`).
* **Quy tắc liên quan:** `BR-PRD-01`, `BR-PRD-05`, `BR-PRD-07`, `BR-ORD-07`.

#### `A07` | Quản lý tồn kho theo biến thể (Inventory Stock Management)
* **Actor:** Admin.
* **Mục đích:** Theo dõi chi tiết số lượng tồn kho theo từng biến thể SKU dung tích, phân tách hàng khả dụng và hàng đang được tạm giữ.
* **Dữ liệu & Thao tác:** Bảng tồn kho SKU (Ảnh, Tên SP, Biến thể dung tích, SKU, Tồn thực tế `On Hand`, Tồn giữ chỗ `Reserved`, Hàng đang về `Incoming`, Tồn khả dụng `Available = On Hand - Reserved`, Trạng thái Out of Stock / Low Stock (theo ngưỡng cấu hình, mặc định $\le 15$) / In Stock); Nút "Receive Stock" trực tiếp trên dòng SKU có `Incoming > 0` (bấm nhận: `On Hand` tự động tăng thêm số lượng `Incoming`, `Incoming` đưa về 0, `Available` tăng tương ứng theo `BR-ML-05`); Ô nhập trực tiếp số lượng `On Hand` kèm lý do điều chỉnh và nút "Quick Save"; Bộ lọc trạng thái tồn kho.
* **Trạng thái đặc biệt:** Khi `Available = 0` hệ thống tự động kích hoạt trạng thái "Out of Stock" tại C02/C03 (`BR-PRD-04`); Chặn lưu nếu `On Hand` nhỏ hơn `Reserved` (`BR-PRD-03`); Cảnh báo "Low Stock" tự gỡ khi `Available` vượt ngưỡng sau khi nhận hàng hoặc điều chỉnh tồn; Lý do điều chỉnh thủ công được lưu vết trực tiếp vào bản ghi biến động tồn kho (Inventory Adjustment Records).
* **Quy tắc liên quan:** `BR-PRD-02`, `BR-PRD-03`, `BR-PRD-04`, `BR-ORD-01`, `BR-ORD-05`, `BR-ORD-10`, `BR-ML-05`.

#### `A08` | Danh sách đơn hàng (Order List)
* **Actor:** Admin.
* **Mục đích:** Quản lý toàn bộ đơn hàng trên hệ thống, theo dõi trạng thái thanh toán và trạng thái xử lý của từng đơn.
* **Dữ liệu & Thao tác:** 
  * Bảng đơn hàng (Mã đơn `#HCI-...`, Ngày đặt, Tên khách, SĐT, Phương thức COD/Chuyển khoản, Trạng thái thanh toán Unpaid/Paid/Refunded, Trạng thái đơn hàng Payment Pending, Processing, Shipping, Completed, Return Pending, Returned, Cancelled, Tổng tiền USD); Bộ lọc đa tiêu chí theo 7 trạng thái đơn hàng; Bấm vào đơn mở A09.
* **Trạng thái đặc biệt:** Đơn thanh toán hợp lệ tự động cập nhật sang `Processing` theo thời gian thực.
* **Quy tắc liên quan:** `BR-ORD-03`, `BR-ORD-04`, `BR-ORD-08`, `BR-PAY-01`, `BR-PAY-04`, `BR-PAY-05`, `BR-RET-01`.

#### `A09` | Chi tiết & Xử lý đơn hàng (Order Detail & Fulfillment)
* **Actor:** Admin.
* **Mục đích:** Xử lý vòng đời đơn hàng, xác minh thông tin và điều chuyển trạng thái đơn.
* **Dữ liệu & Thao tác:** Tiêu đề (Mã đơn, Ngày đặt, Trạng thái); Thông tin người nhận & Địa chỉ; Bảng sản phẩm đặt mua (Ảnh, Tên, Dung tích, Đơn giá USD, Số lượng, Thành tiền); Subtotal, Voucher Discount, Shipping $5.00, Order Total USD; Thông tin thanh toán (Mã định danh `PAY-HCI-...`, Hạn 30m, Mã tham chiếu); Timeline trạng thái; Nút chuyển trạng thái (`Processing` → `Shipping` → `Completed`; chuyển sang `Shipping` đồng thời trừ `On Hand` và `Reserved` theo `BR-ORD-10`); Khối Xử lý đổi trả (khi đơn ở `Return Pending`): hiển thị lý do trả, 2 nút dứt khoát:
  * Nút "Approve & Refund" (1 click): Đơn chuyển sang `Returned`, thanh toán chuyển sang `Refunded`, hệ thống tự động cộng lại tồn kho `On Hand` (+ số lượng trả), số tiền hoàn = Order Total - $5.00 ship (hoặc hoàn 100% cả ship nếu lỗi từ shop theo `BR-RET-02`).
  * Nút "Reject Return": Bắt buộc ghi lý do từ chối, đơn quay trở lại trạng thái `Completed` (`BR-RET-01`).
  * Nút "Cancel Order" (khi đơn ở `Payment Pending` hoặc `Processing`, bắt buộc chọn lý do theo `BR-ORD-04`; đơn chuyển khoản đã `Paid` bị hủy sẽ tự động chuyển thanh toán sang `Refunded` theo `BR-PAY-08`).
* **Trạng thái đặc biệt:** Đơn `Cancelled` hoặc `Returned` khóa toàn bộ nút đổi trạng thái; đơn `Completed` chỉ còn hiển thị khối đổi trả nếu khách có gửi yêu cầu (`BR-ORD-03`, `BR-RET-01`).
* **Quy tắc liên quan:** `BR-ORD-03`, `BR-ORD-04`, `BR-ORD-05`, `BR-ORD-10`, `BR-PAY-01`, `BR-PAY-04`, `BR-PAY-05`, `BR-RET-01`, `BR-RET-02`, `BR-RET-03`.

#### `A10` | Danh sách mã giảm giá (Voucher List)
* **Actor:** Admin.
* **Mục đích:** Quản lý các chương trình khuyến mại voucher, theo dõi tần suất sử dụng và bật/tắt nhanh mã giảm giá.
* **Dữ liệu & Thao tác:** Bảng mã voucher (Mã Code, Mô tả, Loại giảm % hoặc Fixed USD, Giá trị giảm, Đơn tối thiểu USD, Thời hạn, Đã dùng/Tổng phát hành, Trạng thái Active/Expired/Out of Quota/Inactive); Công tắc bật/tắt nhanh; Nút "Edit" mở A11; Nút "Create New Voucher" mở A11.
* **Trạng thái đặc biệt:** Voucher hết hạn hoặc hết lượt dùng tự động chuyển trạng thái trực quan.
* **Quy tắc liên quan:** `BR-VCH-01`, `BR-VCH-05`.

#### `A11` | Tạo & Chỉnh sửa mã giảm giá (Voucher Create/Edit Form)
* **Actor:** Admin.
* **Mục đích:** Form thiết lập điều kiện và ràng buộc áp dụng mã giảm giá.
* **Dữ liệu & Thao tác:** Mã Voucher; Mô tả; Loại giảm giá (Percentage % hoặc Fixed Amount USD); Giá trị giảm; Mức giảm tối đa USD (với loại %); Đơn hàng tối thiểu USD; Ngày bắt đầu & Ngày kết thúc; Giới hạn tổng số lượt dùng; Giới hạn số lượt/mỗi tài khoản (mặc định 1 lần); Đối tượng (All Customers hoặc First-Time Buyers); Cờ kích hoạt; Nút "Save Voucher".
* **Trạng thái đặc biệt:** Validate chặn trùng mã code, chặn ngày kết thúc trước ngày bắt đầu, chặn mức giảm $\le 0$ (`BR-VCH-01`).
* **Quy tắc liên quan:** `BR-VCH-01`, `BR-VCH-02`, `BR-VCH-06`.

#### `A12` | Cài đặt cửa hàng & Hệ thống (Store Settings)
* **Actor:** Admin.
* **Mục đích:** Giao diện quản trị cấu hình toàn bộ các tham số vận hành của hệ thống mà không cần chỉnh sửa mã nguồn.
* **Dữ liệu & Thao tác:** Khối Thông tin chung (Tên shop, Email hỗ trợ, Địa chỉ kho); Khối Vận chuyển & Tiền tệ (Phí giao hàng cố định $5.00 USD, định dạng tiền tệ USD); Khối Thanh toán (Thời hạn thanh toán 30 phút, Thông tin tài khoản nhận chuyển khoản, Cờ kích hoạt chế độ mô phỏng giao dịch Payment Simulation Mode); Khối Kho & ML (Ngưỡng cảnh báo tồn thấp — mặc định 15 và luôn $\ge$ Safety Stock, Lead time nhập hàng ML mặc định 7 ngày, Chu kỳ đặt hàng `Review Period` mặc định 7 ngày, Tồn an toàn Safety Stock mặc định 15 đơn vị); Nút "Save Settings".
* **Trạng thái đặc biệt:** Validate chặn giá trị âm hoặc sai định dạng; Chặn lưu nếu ngưỡng cảnh báo tồn thấp nhỏ hơn Safety Stock (`BR-PRD-02`).
* **Quy tắc liên quan:** `BR-PAY-03`, `BR-PAY-06`, `BR-PRD-02`, `BR-ML-05`, `BR-SYS-03`.
#### `A13` | Quản lý khách hàng (Customer Management)
* **Actor:** Admin.
* **Mục đích:** Tra cứu tài khoản khách hàng, xem lịch sử mua hàng và quản lý trạng thái tài khoản (khóa/mở khóa).
* **Dữ liệu & Thao tác:** Bảng khách hàng (Họ tên, Email, SĐT, Ngày đăng ký, Số đơn hoàn tất, Tổng chi tiêu Net USD, Trạng thái Active/Locked); Tìm kiếm theo tên/email/SĐT; Bộ lọc trạng thái; Mở chi tiết khách (thông tin, sổ địa chỉ, danh sách đơn, Hair Profile gần nhất); Nút "Lock Account" / "Unlock Account" (bắt buộc ghi lý do, hiệu lực ngay).
* **Trạng thái đặc biệt:** Tài khoản bị khóa không đăng nhập được và các phiên đang hoạt động bị vô hiệu hóa; đơn hàng đang xử lý của khách vẫn được xử lý bình thường; tài khoản Quản trị viên được khởi tạo và phân quyền độc lập qua cơ chế bảo mật cấp hệ thống (System Provisioning).
* **Quy tắc liên quan:** `BR-ACC-08`, `BR-ACC-09`, `BR-SYS-01`.

#### `A14` | Kiểm duyệt đánh giá (Review Moderation)
* **Actor:** Admin.
* **Mục đích:** Kiểm duyệt Store Verified Reviews, ẩn nội dung không phù hợp mà không làm mất dữ liệu.
* **Dữ liệu & Thao tác:** Bảng đánh giá (Sản phẩm, Khách hàng, Mã đơn, Số sao, Nội dung, Ngày gửi, Trạng thái Visible/Hidden, nhãn Verified Purchase); Bộ lọc theo sản phẩm, số sao, trạng thái; Nút "Hide" (bắt buộc chọn lý do: spam, ngôn từ xúc phạm, không liên quan, khác) và "Unhide".
* **Trạng thái đặc biệt:** Đánh giá bị ẩn không hiển thị tại C03 và không tính vào điểm trung bình, số lượt; chủ đánh giá vẫn xem được đánh giá của mình kèm nhãn "Hidden by store" tại C15.
* **Quy tắc liên quan:** `BR-REV-01`, `BR-REV-04`, `BR-REV-05`.

---

## PHẦN III. SƠ ĐỒ LUỒNG NGHIỆP VỤ HỆ THỐNG

### 1. Luồng Khám phá Routine & Đặt hàng thanh toán

```text
Khách hàng / Guest
  │
  ├── [C01. Trang chủ] ──> Bấm CTA làm Quiz
  │        │
  │        ▼
  ├── [C04. Hair Routine Quiz (4 bước)] ──> Chọn đáp án theo bộ câu hỏi
  │        │
  │        ▼ (Chạy bộ luật suy diễn tất định IF-THEN)
  ├── [C05. Kết quả Quiz & Routine đề xuất]
  │        ├── Xem chẩn đoán & Routine tối đa 4 bước (Cleanse -> Condition -> Treat -> Style) + Optional Add-on (tối đa 1)
  │        ├── Bấm "Save to Hair Profile" (Đăng nhập -> xác nhận ghi đè nếu đã có hồ sơ -> Lưu vào C13)
  │        └── Bấm "Add Full Routine to Cart" (add-on được thêm riêng nếu khách chọn)
  │        │
  │        ▼
  ├── [C06. Giỏ hàng] ──> Kiểm tra dung tích, số lượng, áp thử voucher -> Bấm "Checkout"
  │        │
  │        ▼
  ├── [C07. Checkout] ──> Đăng nhập; Chọn địa chỉ, chọn phương thức thanh toán
  │        │
  │        ├── [PHƯƠNG THỨC 1: COD]
  │        │        │
  │        │        ▼ (Bấm "Place Order")
  │        │   Hệ thống: Tạo đơn -> Giữ tồn kho Reserved -> Trạng thái "Processing"
  │        │        │
  │        │        ▼
  │        │   [C09. Đặt hàng thành công] (Mã đơn #HCI-YYYYMMDD-XXXX)
  │        │
  │        └── [PHƯƠNG THỨC 2: Chuyển khoản điện tử USD]
  │                 │
  │                 ▼ (Bấm "Place Order")
  │            Hệ thống: Tạo đơn "Payment Pending" -> Sinh mã PAY-HCI-... -> Giữ tồn kho
  │                 │
  │                 ▼
  │            [C08. Chờ thanh toán] (Mã chuyển khoản, đếm ngược 30 phút)
  │                 │
  │                 ├── [Quá 30 phút chưa thanh toán]
  │                 │        ▼
  │                 │   Mã hết hạn -> Đơn chuyển "Cancelled" -> Hoàn trả tồn kho Available
  │                 │
  │                 └── [Nhận thanh toán hợp lệ qua Webhook/Polling]
  │                          ▼
  │                     Mã chuyển "Used" -> Đơn chuyển sang "Processing"
  │                          ▼
  │                     [C09. Đặt hàng thành công]
```

---

### 2. Luồng Vận hành Quản trị: Đơn hàng, Tồn kho & Dự báo ML

```text
Admin (/admin/login) ──> [A02. Dashboard]
  │
  ├── XỬ LÝ ĐƠN HÀNG:
  │   └── [A08. Danh sách đơn hàng] ──> Lọc đơn "Processing" / "Return Pending"
  │            │
  │            ▼
  │       [A09. Chi tiết & Xử lý đơn hàng]
  │            ├── Chuyển "Processing" ──> "Shipping" (trừ On Hand & Reserved — BR-ORD-10)
  │            ├── Giao thành công: "Shipping" ──> "Completed" (Mở quyền viết review & yêu cầu trả hàng tại C15)
  │            └── Có yêu cầu đổi trả (đơn "Return Pending"):
  │                 ├── Bấm "Approve & Refund" (1 click) ──> "Returned" (tự cộng lại On Hand & hoàn tiền — BR-RET-02)
  │                 └── Bấm "Reject Return" (ghi lý do) ──> Đơn quay lại "Completed" (BR-RET-01)
  │
  ├── QUẢN LÝ TỒN KHO & SẢN PHẨM:
  │   └── [A07. Tồn kho biến thể] ──> Kiểm tra biến thể có Available <= ngưỡng cảnh báo
  │            │
  │            ├── [A05/A06. Form Sản phẩm] (Cập nhật thông tin, kích thước dung tích, nhãn Quiz)
  │            └── Nhận hàng từ số lượng Incoming (Receive Stock) ──> cộng On Hand, Incoming về 0
  │
  ├── DỰ BÁO BÁN HÀNG & NHẬP KHO (ML KHÉP KÍN):
  │   └── [A03. Sales Forecast ML]
  │            ├── Chọn 6 Danh mục chính -> Xem biểu đồ Thực tế vs Dự báo (USD & Qty)
  │            ├── Kiểm tra chỉ số sai số WAPE (chỉ số chính)
  │            ├── Xem Bảng gợi ý nhập hàng SKU (Dự báo 14 ngày + Safety Stock - (Available + Incoming))
  │            └── Bấm "Order Stock" trên dòng SKU ──> Incoming tăng ──> [A07] Bấm "Receive Stock"
  │
  └── QUẢN TRỊ NGƯỜI DÙNG, NỘI DUNG & HỆ THỐNG:
      ├── [A13. Khách hàng] ──> Khóa / Mở khóa tài khoản
      ├── [A14. Kiểm duyệt đánh giá] ──> Hide / Unhide đánh giá
      └── [A12. Cài đặt] ──> Tham số kho/ML
```

---

### 3. Luồng Xác thực: Quên & Đặt lại mật khẩu (OTP Workflow)

```text
Khách hàng
  │
  ├── [C10. Đăng nhập] ──> Bấm "Forgot Password?"
  │        │
  │        ▼
  ├── [C12. Quên mật khẩu — Step 1: Nhập Email]
  │        ├── Nhập Email đã đăng ký -> Bấm "Send Verification Code"
  │        └── Hệ thống xác thực Email hợp lệ -> Sinh mã OTP 6 số (hiệu lực 10 phút)
  │                 │
  │                 ▼
  └── [C12. Quên mật khẩu — Step 2: Nhập OTP & Đặt mật khẩu mới]
           ├── Nhập mã OTP + Nhập Password mới (chuẩn phức tạp) + Confirm Password
           └── Bấm "Reset Password"
                    │
                    ├── [OTP sai hoặc quá 10 phút] ──> Báo lỗi + Nút "Resend Code"
                    │
                    └── [Hợp lệ] ──> Mật khẩu Bcrypt cập nhật vào DB ──> Chuyển về [C10]
```

---

### 4. Luồng Đăng ký / Đăng nhập & Tự động lưu Hair Profile

```text
Guest (Chưa có tài khoản hoặc chưa đăng nhập)
  │
  ├── Kịch bản A: Bấm "Save to Hair Profile" sau khi làm Quiz (C05)
  │        │
  │        ▼
  │   [C10. Đăng nhập] HOẶC [C11. Đăng ký] — Hệ thống giữ tạm kết quả Quiz trong session kèm cờ pending_save
  │        │
  │        ├── [Tại C10. Trang Đăng nhập]
  │        │        ├── Nhập Email + Password -> Bấm "Sign In"
  │        │        │        │
  │        │        │        ├── [Sai thông tin lần 1-4] -> Báo lỗi đỏ dưới trường nhập
  │        │        │        ├── [Sai lần 5] -> Khóa tạm 5 phút (BR-ACC-08)
  │        │        │        ├── [Tài khoản bị Admin khóa] -> Báo lỗi, không đăng nhập (BR-ACC-09)
  │        │        │        └── [Đúng] -> Tạo phiên đăng nhập (session 24 giờ) -> Gộp Cart (BR-ACC-04)
  │        │        │                 │
  │        │        │                 ├── [Chưa có Hair Profile] -> Lưu kết quả Quiz
  │        │        │                 └── [Đã có Hair Profile] -> Hộp xác nhận ghi đè (hiển thị ngày hồ sơ cũ) (BR-QUZ-07)
  │        │        │                          ▼
  │        │        │                  Tự động quay lại [C05] -> Thông báo "Hair Profile Saved!"
  │        │
  │        └── [Bấm liên kết chuyển sang C11. Trang Đăng ký]
  │                 ├── Nhập Họ tên, Email, SĐT, Password (chuẩn 8 ký tự), Confirm Password
  │                 ├── Bấm "Sign Up"
  │                 │        ├── [Email hoặc SĐT đã tồn tại] -> Báo lỗi trùng (BR-ACC-02)
  │                 │        └── [Hợp lệ] -> Tạo tài khoản -> Đăng nhập tự động -> Lưu Hair Profile (do cờ pending_save)
  │                 │                         ▼
  │                 │                  Tự động quay lại [C05] -> Thông báo "Hair Profile Saved!"
  │
  └── Kịch bản B: Đăng nhập / Đăng ký thông thường từ header
           │
           ├── [C10. Đăng nhập] -> Đăng nhập thành công -> Quay lại trang trước đó
           │   (Giỏ hàng session gộp vào tài khoản theo BR-ACC-04; kết quả Quiz chưa bấm Save KHÔNG tự lưu vào Hair Profile)
           │
           └── [C11. Đăng ký] -> Đăng ký thành công -> Tự động đăng nhập -> Điều hướng trang chủ [C01] hoặc trang cá nhân [C13]
```

---

### 5. Luồng Mua hàng trực tiếp (Không qua Quiz) & Redirect Login

```text
Guest / Customer
  │
  ├── [C01. Trang chủ] ──> Bấm thẻ sản phẩm trong "Best Sellers"
  │        │           HOẶC bấm danh mục -> [C02. Cửa hàng]
  │        │           HOẶC gõ tìm kiếm -> [C02. Cửa hàng]
  │        │
  │        ▼
  ├── [C02. Cửa hàng] ──> Lọc/Sắp xếp -> Bấm sản phẩm HOẶC bấm "Quick Add"
  │        │
  │        ▼
  ├── [C03. Chi tiết sản phẩm]
  │        ├── Chọn dung tích biến thể (giá USD cập nhật tức thì)
  │        ├── Chọn số lượng
  │        └── Bấm "Add to Cart" -> Toast xác nhận -> Giỏ hàng badge +1
  │            HOẶC bấm "Buy Now" -> Chuyển thẳng đến C07 Checkout (nếu Guest: chuyển qua C10 đăng nhập -> tự động sang C07)
  │        │
  │        ▼
  ├── [C06. Giỏ hàng]
  │        ├── Kiểm tra, điều chỉnh số lượng / xóa món
  │        ├── Nhập thử mã voucher (Guest được phép xem tạm — BR-VCH-04)
  │        └── Bấm "Proceed to Checkout"
  │        │
  │        ▼
  │   [Kiểm tra xác thực]
  │        │
  │        ├── [Guest chưa đăng nhập]
  │        │        ▼
  │        │   [C10. Đăng nhập] (hoặc chuyển sang [C11. Đăng ký]) — Hệ thống lưu tạm return_url = C07
  │        │        ├── Đăng nhập thành công tại C10 -> Giỏ hàng session tự động gộp (BR-ACC-04)
  │        │        │        ▼
  │        │        │   Tự động chuyển về [C07. Checkout] tiếp tục đặt hàng
  │        │        └── Đăng ký mới tại C11 -> Đăng nhập tự động -> Chuyển về [C07. Checkout]
  │        │
  │        └── [Customer đã đăng nhập]
  │                 ▼
  │            [C07. Checkout] (Tiếp tục luồng đặt hàng bình thường)
  │
  └── Sau khi đặt hàng thành công: [C09] -> Nút "View Order" -> [C15] -> "Write Review" (khi Completed)
```
---

### 6. Luồng Đổi trả hàng & Hoàn tiền

```text
Customer
  │
  ├── [C14. Lịch sử đơn hàng] ──> [C15. Chi tiết đơn] (đơn "Completed", còn trong 7 ngày)
  │        │
  │        ▼ Bấm "Request Return" (chọn 1 lý do, xác nhận nguyên seal — áp dụng toàn bộ đơn hàng)
  │   Đơn chuyển sang "Return Pending" (khóa nút Write Review / Request Return)
  │
Admin
  │
  ├── [A08] Lọc đơn "Return Pending" ──> [A09. Chi tiết & Xử lý đơn]
  │        │
  │        ├── [Nút Reject Return] (bắt buộc ghi lý do từ chối)
  │        │        ▼
  │        │   Đơn quay trở lại "Completed", đóng yêu cầu đổi trả (BR-RET-01)
  │        │
  │        └── [Nút Approve & Refund] (1 click duyệt hoàn tất)
  │                 ▼
  │            Đơn chuyển sang "Returned"
  │            ├── Tồn kho On Hand tự động cộng lại (+ số lượng trả) (BR-RET-02)
  │            ├── Thanh toán chuyển sang "Refunded" (Hoàn Order Total - $5.00 ship; hoàn full nếu lỗi shop)
  │            └── Doanh thu Net Revenue tại [A02. Dashboard] tự động loại bỏ đơn này (BR-ORD-09)
```

---

### 7. Luồng Nhập hàng theo dự báo (Vòng khép kín ML → Kho)

```text
Admin
  │
  ├── [A03. Sales Forecast ML] ──> Xem biểu đồ & Bảng gợi ý nhập SKU (chu kỳ 14 ngày)
  │        │
  │        ▼ Bấm "Order Stock" trên dòng SKU (nhập số lượng cần đặt)
  │   Hệ thống: Tăng số lượng `Incoming` của SKU đó ──> Gợi ý nhập tự động cập nhật lại (không đề xuất trùng)
  │        │
  │        ▼ Hàng về kho thực tế
  ├── [A07. Tồn kho biến thể] ──> Thấy dòng SKU có `Incoming > 0` sáng nút "Receive Stock"
  │        │
  │        ▼ Bấm "Receive Stock"
  │   Hệ thống tự động:
  │        ├── On Hand tăng thêm số lượng Incoming (On Hand += Incoming)
  │        ├── Incoming đưa về 0
  │        ├── Available tự động tăng lên (Available = On Hand - Reserved)
  │        └── Cảnh báo "Low Stock" tự động gỡ nếu Available vượt ngưỡng (BR-ML-05)
  │        │
  │        ▼
  └── [A02. Dashboard] ──> Khối Action Items tự động cập nhật theo tình trạng tồn kho mới
```

---

## PHẦN IV. HỆ THỐNG QUY TẮC NGHIỆP VỤ CHUẨN HÓA (73 BUSINESS RULES)

### 1. Tài khoản & Xác thực (BR-ACC)
* **`BR-ACC-01` (Định dạng & Xác thực dữ liệu):** Email đúng chuẩn RFC; SĐT hợp lệ; Mật khẩu tối thiểu 8 ký tự gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 số. Báo lỗi validate hiển thị trực tiếp dưới trường nhập liệu.
* **`BR-ACC-02` (Tính duy nhất tài khoản):** Mỗi Email và SĐT chỉ được liên kết duy nhất 1 tài khoản trên toàn hệ thống.
* **`BR-ACC-03` (Quyền hạn của Guest):** Guest được duyệt sản phẩm (`C01`, `C02`, `C03`), làm Hair Quiz (`C04`, `C05`), thêm vào giỏ hàng session (`C06`) và nhập thử voucher. Bắt buộc đăng nhập khi: Checkout (`C07`), Lưu Hair Profile (`C13`), Xem lịch sử đơn (`C14`) và Viết đánh giá (`C15`).
* **`BR-ACC-04` (Bảo toàn dữ liệu Guest khi đăng nhập):**
  * *Giỏ hàng:* Giỏ session của Guest tự động gộp vào giỏ tài khoản khi Đăng nhập hoặc Đăng ký thành công. Với cùng một biến thể: số lượng sau gộp = `min(số lượng Guest + số lượng tài khoản, Available)` và hiển thị thông báo nếu bị cắt bớt. Biến thể hết hàng hoặc Inactive vẫn được gộp nhưng gắn cảnh báo đỏ theo `BR-ORD-02` (không xóa âm thầm). Giá luôn lấy giá hiện hành; voucher nhập thử được giữ lại và xác thực lại tại Checkout (`BR-VCH-03`). Giỏ session bị xóa sau khi gộp.
  * *Kết quả Quiz:* Không tự động lưu vào Hair Profile; chỉ lưu khi khách chủ động bấm "Save to Hair Profile" (xem `BR-QUZ-07`). Kết quả Quiz chưa lưu vẫn được giữ trong session để khách quay lại `C05`.
* **`BR-ACC-05` (Bảo mật mật khẩu & Quản lý Session):** Mật khẩu bắt buộc mã hóa một chiều bằng thuật toán Bcrypt (Salt Rounds $\ge 10$); tuyệt đối không lưu trữ dạng văn bản thuần (plain text). Phiên đăng nhập (session) có vòng đời tối đa **24 giờ**, lưu trữ an toàn bằng cookie với các cờ bảo mật bắt buộc `HttpOnly; Secure; SameSite=Strict` ngăn chặn triệt để tấn công XSS; hệ thống thiết lập cơ chế phiên đơn nhất (Single-session lifecycle 24h), không kích hoạt lưu đăng nhập dài hạn (Persistent Cookie / Remember Me) nhằm tuân thủ tiêu chuẩn an toàn thông tin.
* **`BR-ACC-06` (Phân quyền Quản trị độc lập):** Admin đăng nhập tại route riêng `/admin/login`, xác thực từ bảng quản trị riêng. Toàn bộ route `/admin/*` được kiểm soát server-side; tài khoản Customer không thể truy cập giao diện quản trị.
* **`BR-ACC-07` (Đặt lại mật khẩu qua OTP):** Khách hàng khôi phục mật khẩu tại `C12` qua mã OTP 6 số (hiệu lực 10 phút); xác thực thành công mới được tạo mật khẩu mới theo chuẩn `BR-ACC-01`. Mã OTP chỉ có giá trị sử dụng 1 lần duy nhất, giới hạn tối đa 5 lần nhập sai (vượt quá số lần phải yêu cầu cấp mã mới) và tần suất yêu cầu gửi lại mã cách nhau tối thiểu 60 giây. Hệ thống hỗ trợ truyền phát OTP qua dịch vụ thư điện tử tiêu chuẩn (SMTP Service); trong chế độ kiểm thử và mô phỏng hệ thống (Sandbox / Simulation Mode), mã OTP được hỗ trợ hiển thị phục vụ quy trình thẩm định nghiệp vụ.
* **`BR-ACC-08` (Giới hạn số lần đăng nhập sai — Brute Force Protection):** Sau **5 lần** đăng nhập sai liên tiếp, tài khoản bị tạm khóa tự động trong **5 phút** kèm thông báo bảo mật; cơ chế khóa tạm tự động hết hiệu lực sau thời gian quy định. Cơ chế phòng vệ tấn công dò quét mật khẩu (Rate Limiting & Brute Force Protection) được thực thi độc lập ở tầng máy chủ (Server-side Enforcement), áp dụng đồng nhất cho cổng khách hàng và cổng quản trị. Khóa tạm thời tự động này độc lập với cơ chế khóa tài khoản có chủ đích bởi Quản trị viên tại `BR-ACC-09`.
* **`BR-ACC-09` (Quản lý trạng thái tài khoản khách hàng):** Admin có thẩm quyền khóa hoặc mở khóa tài khoản Customer tại `A13` (bắt buộc ghi nhận lý do, có hiệu lực ngay lập tức). Tài khoản bị khóa không thể đăng nhập, toàn bộ phiên làm việc đang hoạt động bị thu hồi ngay tức thì; các đơn hàng đang trong tiến trình xử lý của khách hàng vẫn được tiếp tục hoàn tất theo quy chuẩn. Tài khoản Quản trị viên được khởi tạo và phân quyền độc lập qua cơ chế bảo mật cấp hệ thống (System Provisioning).

---

### 2. Giỏ hàng & Đơn hàng (BR-ORD)
* **`BR-ORD-01` (Kiểm tra tồn kho theo biến thể):** Không cho phép thêm vào giỏ hoặc tăng số lượng vượt quá tồn khả dụng (`Available = On Hand - Reserved`) của biến thể dung tích tương ứng; tự động kiểm tra lại tại Checkout và thời điểm bấm Place Order.
* **`BR-ORD-02` (Sản phẩm không khả dụng trong giỏ):** Sản phẩm hoặc biến thể chuyển sang hết hàng (`Available = 0`) hoặc Inactive sẽ bị cảnh báo đỏ và chặn nút checkout cho đến khi khách cập nhật giỏ hàng.
* **`BR-ORD-03` (Vòng đời 7 trạng thái đơn hàng chuẩn hóa):**
  * Đơn COD: `Processing` $\rightarrow$ `Shipping` $\rightarrow$ `Completed`.
  * Đơn Chuyển khoản: `Payment Pending` $\rightarrow$ `Processing` $\rightarrow$ `Shipping` $\rightarrow$ `Completed`.
  * Hủy đơn: Chỉ cho phép hủy từ trạng thái `Payment Pending` hoặc `Processing`.
  * Đổi trả (chỉ từ `Completed`, xem `BR-RET-01`): `Completed` $\rightarrow$ `Return Pending` $\rightarrow$ `Returned`; nếu Admin từ chối thì đơn quay lại `Completed` (đóng yêu cầu đổi trả).
  * Toàn hệ thống vận hành đúng 7 trạng thái: `Payment Pending`, `Processing`, `Shipping`, `Completed`, `Cancelled`, `Return Pending`, `Returned`. Tuyệt đối không nhảy cóc hoặc quay ngược trạng thái ngoài các trường hợp nêu trên.
* **`BR-ORD-04` (Quyền hủy đơn):** Khách hàng và Admin được quyền hủy đơn khi đơn ở `Payment Pending` hoặc `Processing` (bắt buộc chọn lý do). Khi đơn đã sang `Shipping` hoặc `Completed` thì không thể hủy.
* **`BR-ORD-05` (Cơ chế giữ và hoàn tồn kho):** Tồn kho khả dụng bị giữ (`Reserved` tăng, `Available` giảm) ngay khi tạo đơn; khi đơn bị hủy (gồm đơn chuyển khoản quá 30 phút), tồn kho được tự động hoàn lại lập tức. Thời điểm trừ tồn thực tế `On Hand` quy định tại `BR-ORD-10`.
* **`BR-ORD-06` (Chống đặt trùng lặp - Idempotency):** Nút "Place Order" tự động vô hiệu hóa ngay sau click đầu tiên; sử dụng transaction token để ngăn chặn tạo 2 đơn trùng nhau.
* **`BR-ORD-07` (Snapshot giá lịch sử):** Đơn hàng khi tạo lưu cố định bản chụp tên sản phẩm, dung tích, giá bán USD và voucher tại thời điểm đặt; việc Admin đổi giá sản phẩm sau này không làm thay đổi số tiền của đơn hàng cũ.
* **`BR-ORD-08` (Mã đơn hàng duy nhất):** Mỗi đơn hàng sinh mã định danh duy nhất theo định dạng: `#HCI-YYYYMMDD-XXXX`.
* **`BR-ORD-09` (Định nghĩa chỉ số kinh doanh):**
  * **Đơn hoàn tất** = đơn ở trạng thái `Completed` hoặc `Return Pending` (đã giao thành công, chưa duyệt hoàn trả).
  * **Gross Sales** = Σ (số lượng × giá snapshot) của đơn hoàn tất; **Net Revenue** = Gross Sales − Voucher Discount; không bao gồm phí vận chuyển.
  * Doanh thu, số đơn và AOV chỉ tính đơn hoàn tất, ghi nhận theo ngày đơn chuyển `Completed`; đơn `Returned` bị loại (số liệu các kỳ trước được tính lại theo trạng thái hiện tại). Đơn `Payment Pending`, `Processing`, `Shipping` và `Cancelled` không tính vào doanh thu, hiển thị riêng ở Action Items của `A02`.
  * Dữ liệu huấn luyện ML dùng cơ sở khác: số lượng theo **ngày đặt** của các đơn hợp lệ (loại `Payment Pending` và `Cancelled`; vẫn gồm đơn `Returned` vì phản ánh nhu cầu đã phát sinh) — xem `BR-ML-01`.
* **`BR-ORD-10` (Thời điểm trừ tồn kho & giữ hàng nguyên tử):**
  * Tạo đơn: `Reserved` tăng theo số lượng đặt; `On Hand` không đổi.
  * Hủy đơn (từ `Payment Pending` hoặc `Processing`, gồm đơn chuyển khoản quá 30 phút): `Reserved` giảm tương ứng.
  * Chuyển `Processing` $\rightarrow$ `Shipping`: `On Hand` giảm và `Reserved` giảm cùng số lượng (hàng rời kho), `Available` không đổi ở bước này.
  * Chuyển `Shipping` $\rightarrow$ `Completed`: không thay đổi tồn kho.
  * Đổi trả thành công (`Returned`): Khi Admin bấm "Approve & Refund", `On Hand` tự động tăng lại theo số lượng trả (`Available` tăng tương ứng theo `BR-RET-02`).
  * Việc kiểm tra `Available ≥ số lượng đặt` và tăng `Reserved` phải thực hiện nguyên tử trong cùng một transaction (cập nhật có điều kiện hoặc khóa dòng) để hai khách đặt đồng thời không bán vượt tồn; đơn thất bại nhận thông báo hết hàng.
  * Hàng giao thất bại: Admin cộng lại `On Hand` thủ công tại `A07` kèm lý do.

---

### 3. Thanh toán & Vận chuyển (BR-PAY)
* **`BR-PAY-01` (Phương thức & Trạng thái thanh toán):** Hỗ trợ 2 phương thức: Cash on Delivery (COD) và Direct Electronic Payment / Bank Transfer (USD). Trạng thái thanh toán quản lý độc lập: `Unpaid` / `Paid` / `Refunded`. Đơn COD chuyển sang `Paid` khi đơn `Completed`.
* **`BR-PAY-02` (Mã thanh toán duy nhất từng đơn):** Chọn chuyển khoản hệ thống tạo đơn `Payment Pending` và sinh mã thanh toán duy nhất (`PAY-HCI-XXXXX`); quan hệ 1 đơn hàng - 1 mã thanh toán duy nhất; mã chỉ dùng 1 lần.
* **`BR-PAY-03` (Thời hạn thanh toán 30 phút):** Mã thanh toán có hiệu lực đúng **30 phút** kèm đồng hồ đếm ngược `mm:ss` tại `C08`. Hết 30 phút chưa thanh toán: mã hết hạn, đơn chuyển `Cancelled`, tự động hoàn trả tồn kho khả dụng và hoàn lượt dùng voucher.
* **`BR-PAY-04` (Xác nhận thanh toán tự động qua Webhook & Polling):** Tín hiệu thanh toán được xử lý theo nguyên tắc đảm bảo tính bất biến (Idempotent Transaction Processing): cùng một mã tham chiếu giao dịch chỉ được ghi nhận thành công một lần duy nhất qua ràng buộc toàn vẹn cơ sở dữ liệu. Tín hiệu thanh toán hợp lệ (khớp mã tham chiếu `PAY-HCI-...`, khớp chính xác số tiền USD, còn trong thời hạn 30 phút): mã thanh toán chuyển sang `Used`, trạng thái thanh toán chuyển sang `Paid`, đơn hàng chuyển sang `Processing`, giao diện khách hàng tự động điều hướng sang `C09`. Cơ chế Polling chu kỳ 5 giây đóng vai trò kênh kiểm tra dự phòng song song. Hệ thống trang bị giao diện kích hoạt tín hiệu mô phỏng giao dịch thành công (Payment Simulation Endpoint) với luồng xác thực nghiệp vụ tương đương giao dịch thực tế phục vụ quy trình nghiệm thu.
* **`BR-PAY-05` (Xử lý tín hiệu thanh toán không hợp lệ):** Tín hiệu thanh toán không hợp lệ (sai lệch số tiền, phát sinh sau thời hạn hiệu lực 30 phút hoặc liên kết với đơn hàng đã hủy) sẽ lập tức bị hệ thống từ chối ghi nhận; hệ thống bảo lưu nguyên vẹn trạng thái đơn hàng và mã thanh toán nhằm bảo đảm an toàn giao dịch tuyệt đối.
* **`BR-PAY-06` (Phí vận chuyển cố định):** Phí giao hàng tiêu chuẩn cố định là **$5.00 USD** cho mọi đơn hàng (cấu hình tại `A12`).
* **`BR-PAY-07` (Công thức tính toán tổng thanh toán):**
  $$\text{Order Total (USD)} = \text{Subtotal} - \text{Voucher Discount} + \text{Shipping Fee (\$5.00)}$$
  Voucher discount chỉ trừ trên tạm tính hàng hóa Subtotal, không trừ vào phí vận chuyển.
* **`BR-PAY-08` (Chính sách hoàn tiền):** Đơn chuyển khoản đã `Paid` bị hủy trước khi giao sẽ được ghi nhận lệnh hoàn tiền 100% (thanh toán chuyển `Refunded`). Hoàn tiền cho đơn đã giao thực hiện theo quy trình đổi trả tại `BR-RET-01` và `BR-RET-02`.

---

### 4. Sản phẩm & Quản lý tồn kho (BR-PRD)
* **`BR-PRD-01` (Phân loại danh mục & Quản lý biến thể):** Mỗi sản phẩm bắt buộc thuộc đúng 1 trong 6 danh mục của cửa hàng; giá bán USD và tồn kho quản lý chi tiết theo từng biến thể dung tích (Travel/Full/Liter).
* **`BR-PRD-02` (Cảnh báo tồn kho thấp):** Biến thể có tồn khả dụng nhỏ hơn hoặc bằng ngưỡng cấu hình tại `A12` (mặc định 15, luôn $\ge$ Safety Stock) tự động kích hoạt cảnh báo "Low Stock" trên Dashboard `A02` và bảng kho `A07`. Hệ thống chặn lưu cấu hình nếu ngưỡng thấp hơn Safety Stock. Mở rộng khuyến nghị: cảnh báo sớm khi `Available` ≤ nhu cầu dự báo trong Lead time + Safety Stock (dùng kết quả `A03`).
* **`BR-PRD-03` (Cập nhật tồn kho trực tiếp):** Admin cập nhật tồn thực tế (`On Hand`) tại `A07` kèm lý do điều chỉnh; hệ thống chặn lưu nếu `On Hand` nhỏ hơn `Reserved`, ghi nhận tức thời, tự động cập nhật lại trạng thái cảnh báo; lý do điều chỉnh được lưu kèm bản ghi điều chỉnh.
* **`BR-PRD-04` (Quy tắc xử lý hết hàng):** Biến thể có tồn khả dụng `= 0` tự động ẩn nút mua, chuyển sang nhãn "Out of Stock" và bị loại khỏi danh sách gợi ý của Quiz.
* **`BR-PRD-05` (Chống xóa cứng sản phẩm):** Sản phẩm đã phát sinh đơn hàng chỉ được phép chuyển trạng thái "Inactive", tuyệt đối không được xóa cứng khỏi CSDL. Chỉ cho phép xóa sản phẩm mới tạo chưa từng có đơn hàng.
* **`BR-PRD-06` (Toàn vẹn dữ liệu sản phẩm):** Giá bán là số dương > 0; Tồn kho là số nguyên $\ge 0$; Bắt buộc có tối thiểu 1 ảnh đại diện và thuộc đúng 1 trong 6 danh mục.
* **`BR-PRD-07` (Gán nhãn bắt buộc cho Quiz):** Sản phẩm tham gia vào Hair Quiz bắt buộc phải được Admin gán đủ bộ thuộc tính tại `A05/A06`: Da đầu, Tình trạng tóc và Bước trong Routine.

---

### 5. Đánh giá sản phẩm Verified Purchase (BR-REV)
* **`BR-REV-01` (Đánh giá Verified Purchase):** Hệ thống chỉ hiển thị đánh giá thực tế của khách (Store Verified Reviews); chỉ khách hàng đã đăng nhập, đã mua sản phẩm đó và đơn hàng ở trạng thái `Completed` mới được viết đánh giá. Hệ thống không sao chép điểm sao hay số lượt đánh giá từ website thương hiệu. Sản phẩm chưa có đánh giá hiển thị "No reviews yet".
* **`BR-REV-02` (Chặn đánh giá đơn chưa hoàn tất):** Không cho phép đánh giá với sản phẩm nằm trong đơn ở trạng thái `Payment Pending`, `Processing`, `Shipping`, `Cancelled`, `Return Pending` hoặc `Returned`. Nút "Write Review" tại `C15` chỉ hiển thị khi đơn ở trạng thái `Completed`. Đánh giá đã gửi trước khi phát sinh yêu cầu trả hàng vẫn được giữ.
* **`BR-REV-03` (Giới hạn 1 đánh giá mỗi sản phẩm/đơn):** Mỗi khách hàng chỉ được gửi 1 đánh giá cho mỗi sản phẩm trong một đơn hoàn thành (cho phép chỉnh sửa, không cho phép gửi trùng).
* **`BR-REV-04` (Quy chuẩn nội dung đánh giá):** Điểm số từ 1 đến 5 sao; Nhận xét tối đa 1.000 ký tự; Điểm đánh giá trung bình và số lượt chỉ tính các đánh giá đang hiển thị (`Visible`), được tính lại tức thì khi có review mới hoặc khi review bị ẩn/hiện.
* **`BR-REV-05` (Kiểm duyệt đánh giá):** Admin ẩn/hiện đánh giá tại `A14` (bắt buộc chọn lý do khi ẩn; ẩn chứ không xóa cứng). Đánh giá bị ẩn không hiển thị tại `C03`, không tính vào điểm trung bình và số lượt; chủ đánh giá vẫn xem được đánh giá của mình kèm nhãn "Hidden by store" tại `C15`.

---

### 6. Khuyến mại & Mã giảm giá Voucher (BR-VCH)
* **`BR-VCH-01` (Thuộc tính hợp lệ của Voucher):** Gồm: Mã code duy nhất; Loại giảm (% hoặc số tiền cố định USD); Giá trị giảm; Đơn tối thiểu USD; Mức giảm tối đa USD (với loại %); Thời hạn hiệu lực; Giới hạn tổng số lượt dùng; Giới hạn lượt/mỗi tài khoản; Đối tượng áp dụng.
* **`BR-VCH-02` (Giới hạn 1 voucher mỗi đơn):** Mỗi đơn hàng chỉ áp dụng tối đa 1 mã giảm giá; không cộng dồn nhiều voucher.
* **`BR-VCH-03` (Xác thực Voucher tại Checkout):** Kiểm tra tự động tính hợp lệ của voucher tại Checkout và thời điểm Place Order; báo lỗi chi tiết nếu không đủ điều kiện.
* **`BR-VCH-04` (Áp dụng thử cho Guest):** Guest được nhập thử voucher tại giỏ hàng `C06` để xem số tiền giảm tạm tính, nhưng bắt buộc đăng nhập tại Checkout để kiểm tra điều kiện tài khoản.
* **`BR-VCH-05` (Hoàn lại voucher khi hủy đơn):** Đơn hàng bị hủy (bao gồm đơn chuyển khoản quá 30 phút) sẽ tự động hoàn lại lượt dùng voucher cho khách hàng nếu voucher còn hạn. Đơn đã giao rồi trả hàng (`Returned`) không được hoàn lại lượt voucher (`BR-RET-02`).
* **`BR-VCH-06` (Giới hạn mức giảm tối đa):** Tổng tiền giảm từ voucher không được vượt quá subtotal hàng hóa (subtotal sau giảm tối thiểu bằng $0.00).

---

### 7. Tìm kiếm & Lọc sản phẩm (BR-SRC)
* **`BR-SRC-01` (Fuzzy Search & Case-insensitive):** Tìm kiếm không phân biệt chữ hoa/thường; chấp nhận sai lệch lỗi chính tả nhẹ (khoảng cách Levenshtein $\le 2$).
* **`BR-SRC-02` (Phạm vi tìm kiếm):** Tìm kiếm trên: Tên sản phẩm, Danh mục chính (`category`), Lợi ích chính (`key_benefits`) và Thành phần nổi bật (`ingredients`). Không lọc thương hiệu vì cửa hàng chỉ bán Moroccanoil.
* **`BR-SRC-03` (Quy tắc hiển thị kết quả):** Sản phẩm "Inactive" không xuất hiện trong kết quả; sản phẩm hết hàng vẫn hiển thị kèm nhãn "Out of Stock".

---

### 8. Hair Routine Quiz — Phân loại Rule-based (BR-QUZ)
* **`BR-QUZ-01` (Câu hỏi bắt buộc):** Người dùng bắt buộc trả lời các câu hỏi đánh dấu sao (*) trong từng bước mới được bấm "Next".
* **`BR-QUZ-02` (Quy tắc suy diễn tất định):** Kết quả phân loại tuân theo bảng luật logic `IF [Bộ đáp án] THEN [Nhãn nhu cầu]`. Cùng bộ đáp án đầu vào luôn trả về cùng một kết quả chẩn đoán và routine đề xuất (không dùng mô hình xác suất).
* **`BR-QUZ-03` (Thứ tự ưu tiên nhu cầu tóc):** Khi có nhiều vấn đề tóc đồng thời, hệ thống áp dụng thứ tự ưu tiên:
  $$\text{Repair} > \text{Scalp} > \text{Color} > \text{Curl} > \text{Hydration} > \text{Volume} > \text{Styling}$$
  Nhãn ưu tiên cao nhất quyết định các sản phẩm trong routine 4 bước; nhãn phụ (nếu có) chỉ tạo ra tối đa 1 sản phẩm "Optional Add-on" nằm ngoài routine (xem `BR-QUZ-04`).
* **`BR-QUZ-04` (Cấu trúc Routine gợi ý chuẩn 4 bước):** Đề xuất trọn bộ tối đa 4 sản phẩm (mỗi bước 1 sản phẩm, tối thiểu 3 bước) theo đúng thứ tự:
  * *Step 1: Cleanse* (Shampoo)
  * *Step 2: Condition* (Conditioner)
  * *Step 3: Treat & Nourish* (Treatment Oil hoặc Hair Mask)
  * *Step 4: Style & Protect* (Styling Spray / Heat Defense)
  * *Optional Add-on* (tối đa 1): sản phẩm đặc trị của nhãn phụ, hiển thị tách riêng và có nút Add riêng, không nằm trong nút "Add Full Routine to Cart"; bỏ qua nếu trùng sản phẩm đã có trong routine và vẫn chịu ràng buộc tồn kho `BR-QUZ-05`.
* **`BR-QUZ-05` (Ràng buộc tồn kho trong gợi ý):** Chỉ gợi ý sản phẩm Active và có `Available > 0`. Sản phẩm hết hàng tự động thay thế bằng sản phẩm tương đương; nếu không có thì bỏ qua bước đó kèm giải thích.
* **`BR-QUZ-06` (Kết quả mặc định Fallback):** Đáp án không khớp luật đặc trị nào sẽ trả về kết quả mặc định là dòng Cấp ẩm hàng ngày (Hydrating), đảm bảo không bao giờ bị lỗi trang trắng.
* **`BR-QUZ-07` (Hồ sơ tóc cá nhân):** Mỗi tài khoản lưu giữ 1 Hair Profile gần nhất, chỉ được lưu khi khách chủ động bấm "Save to Hair Profile" (Guest được giữ tạm kết quả với cờ `pending_save` và lưu sau khi đăng nhập/đăng ký). Nếu đã có hồ sơ cũ, hệ thống hiển thị hộp xác nhận ghi đè kèm ngày của hồ sơ cũ; chỉ khi khách xác nhận mới ghi đè.
* **`BR-QUZ-08` (Cấu hình bộ luật suy diễn độc lập):** Cây câu hỏi chẩn đoán và hệ thống luật suy diễn logic được quản trị dưới dạng cấu hình dữ liệu có phiên bản độc lập (Versioned Ruleset Data), tách biệt hoàn toàn khỏi mã nguồn ứng dụng. Mỗi hồ sơ Hair Profile lưu vết chính xác mã phiên bản quy tắc đã áp dụng (`ruleset_version`), đảm bảo tính toàn vẹn và bất biến của dữ liệu chẩn đoán lịch sử khi hệ thống cập nhật bộ quy tắc mới.
* **`BR-QUZ-09` (Cảnh báo y khoa bắt buộc):** Trang kết quả hiển thị thông điệp pháp lý: *"Results are for cosmetic beauty consultation purposes and do not replace professional dermatological diagnosis or medical treatment"*.
* **`BR-QUZ-10` (Ghi nhận lượt làm Quiz phục vụ thống kê):** Mỗi lượt hoàn thành Quiz (kể cả Guest) ghi 1 bản ghi ẩn danh gồm thời gian, nhãn nhu cầu chính/phụ và `ruleset_version`, không lưu thông tin định danh; dữ liệu này là nguồn cho widget thống kê Hair Quiz tại `A02`.

---

### 9. Machine Learning — Dự báo bán hàng & Gợi ý nhập kho (BR-ML)
* **`BR-ML-01` (Phạm vi dự báo chuỗi thời gian):** Mô hình hồi quy (Regression) dự báo số lượng bán ra (từ đó tính Doanh thu USD = Số lượng $\times$ Đơn giá USD) theo ngày/tuần trên phạm vi **6 Danh mục**; chỉ hiển thị cho Admin tại `A03`. Dữ liệu nhu cầu lấy theo **ngày đặt** của các đơn hợp lệ (loại `Payment Pending` và `Cancelled`, gồm cả đơn `Returned`); huấn luyện ở mức ngày, đánh giá và hiển thị tổng hợp theo tuần.
* **`BR-ML-02` (Tập đặc trưng huấn luyện):** Sử dụng các đặc trưng: Thứ trong tuần, Tháng trong năm, Ngày lễ/sự kiện, Giá bán USD, Khuyến mại, Doanh số trễ (Lag 7, Lag 14, Lag 30) và Trung bình trượt (Rolling Mean 7 ngày, 30 ngày).
* **`BR-ML-03` (Đánh giá & chọn mô hình):** Chia dữ liệu theo thời gian: dùng `TimeSeriesSplit` (cross-validation theo thời gian) trên tập Train để so sánh Linear Regression và Random Forest Regressor, giữ tập Test cuối cùng chỉ để đánh giá một lần. Chỉ số chính là **WAPE** (kèm MAE, RMSE, sMAPE) tính ở mức tuần vì MAPE không ổn định khi doanh số bằng 0 hoặc rất thấp; mô hình có WAPE thấp hơn được chọn (mục tiêu WAPE < 20%). Nếu cả hai mô hình đều vượt mục tiêu, hệ thống vẫn dùng mô hình tốt hơn và hiển thị banner "Low confidence" tại `A03`.
* **`BR-ML-04` (Quy trình huấn luyện lại mô hình):** Mô hình dự báo vận hành theo kiến trúc huấn luyện theo lô (Offline Batch Training Pipeline). Ứng dụng quản trị truy xuất trực tiếp tập kết quả dự báo và thông số phân tích từ cơ sở dữ liệu đã tiền xử lý. Quản trị viên có thẩm quyền kích hoạt tiến trình tái huấn luyện theo yêu cầu thông qua chức năng "Retrain Model" tại `A03`; toàn bộ thông số phiên bản, thời điểm huấn luyện và chỉ số thẩm định mô hình được lưu vết tự động vào cơ sở dữ liệu.
* **`BR-ML-05` (Công thức gợi ý số lượng nhập hàng & Vòng khép kín kho):** Tính cho từng SKU/biến thể:
  $$\text{Reorder Quantity} = \max\left(0, \; \text{Forecast Demand} + \text{Safety Stock} - (\text{Available} + \text{Incoming})\right)$$
  Trong đó: Kỳ dự báo cố định 14 ngày = Lead time nhập hàng (7 ngày) + Chu kỳ đặt hàng Review Period (7 ngày); `Available = On Hand - Reserved`; `Incoming` là số lượng hàng đang về của SKU đó (cấu hình mặc định Safety Stock = 15 đơn vị tại `A12 Store Settings`). Vòng khép kín 2 bước:
  * Khi Admin bấm "Order Stock" trên dòng SKU tại `A03`, hệ thống tăng trực tiếp số lượng `Incoming` của SKU đó (ML tự động cập nhật lại công thức để không đề xuất trùng).
  * Khi hàng về kho thực tế, Admin mở `A07` bấm "Receive Stock" trên dòng SKU có `Incoming > 0`: `On Hand` tự động tăng thêm số lượng `Incoming`, `Incoming` đưa về 0, `Available` tăng tương ứng.
* **`BR-ML-06` (Cảnh báo sai lệch mô hình - Model Drift):** Trường hợp sai số WAPE vượt ngưỡng kiểm soát 20% trong 2 chu kỳ tuần liên tiếp, hệ thống tự động kích hoạt cảnh báo trực quan tại `A03` khuyến nghị tái huấn luyện mô hình. Cơ chế giám sát độ lệch mô hình (Model Drift Detection) được kích hoạt theo thời gian thực mỗi khi truy cập phân hệ `A03` bằng cách đối soát dữ liệu dự báo với sản lượng bán thực tế của các chu kỳ tuần đã chốt số liệu.
* **`BR-ML-07` (Cold Start sản phẩm mới):** SKU/sản phẩm mới có lịch sử bán dưới 60 ngày không được phân bổ dự báo theo tỷ trọng; hệ thống chỉ hiển thị dự báo ở cấp danh mục cha để Admin tự quyết định số lượng nhập.
* **`BR-ML-08` (Tập dữ liệu huấn luyện & Kiểm định sai lệch):** Tập dữ liệu khởi tạo phục vụ xây dựng mô hình cơ sở (Baseline Model) được cấu trúc hóa từ chuỗi thời gian phân phối bán lẻ tiêu chuẩn, ánh xạ tương thích với 6 danh mục ngành hàng Moroccanoil; các đơn hàng thực tế phát sinh trên hệ thống được tích lũy liên tục vào tập dữ liệu theo thời gian. Hệ thống hỗ trợ nạp các kịch bản phân phối dữ liệu đa dạng nhằm kiểm định khả năng phát hiện sai lệch mô hình và kích hoạt cảnh báo trôi dạt (Drift Trigger Validation).
* **`BR-ML-09` (Phân bổ dự báo từ danh mục xuống SKU):** Dự báo cấp danh mục được chia xuống từng SKU/biến thể theo tỷ trọng số lượng bán của SKU đó trong 8 tuần gần nhất (trong cùng danh mục). SKU chưa có lịch sử áp dụng `BR-ML-07`.

---

### 10. Hệ thống & Bảo mật chung (BR-SYS)
* **`BR-SYS-01` (Bảo mật thông tin cá nhân):** SĐT, Địa chỉ chi tiết, Lịch sử mua sắm chỉ hiển thị cho chính chủ tài khoản và Quản trị viên hệ thống.
* **`BR-SYS-02` (Xác thực dữ liệu & Phòng chống tấn công mạng):** Kiểm tra dữ liệu (Validation) ở cả Client và Server; áp dụng truy vấn tham số hóa (Parameterized Queries / ORM) chống SQL Injection; mã hóa dữ liệu đầu ra (HTML Sanitization) chống Cross-Site Scripting (XSS).
* **`BR-SYS-03` (Quy chuẩn thời gian & Tiền tệ USD):** Thời gian lưu trữ ở dạng UTC, hiển thị theo múi giờ GMT+7 (mốc 7 ngày đổi trả, 30 phút thanh toán và 10 phút OTP tính theo giờ máy chủ); Tiền tệ hiển thị theo định dạng **USD** chuẩn quốc tế: `$XX.XX` (giữ 2 chữ số thập phân).

---

### 11. Đổi trả hàng (BR-RET)
* **`BR-RET-01` (Điều kiện & vòng đời yêu cầu trả hàng tinh gọn):** Chỉ đơn `Completed` mới được gửi yêu cầu trả hàng, trong vòng 7 ngày kể từ lúc đơn chuyển `Completed` (hiển thị rõ mốc thời hạn tại `C15`). Mỗi đơn có tối đa 1 yêu cầu, áp dụng cho toàn bộ đơn hàng (không áp dụng đổi trả một phần). Bắt buộc chọn 1 lý do; sản phẩm phải còn nguyên seal tem niêm phong (riêng lý do "Damaged / Wrong item" do lỗi cửa hàng không yêu cầu còn seal). Khách gửi yêu cầu, đơn chuyển sang trạng thái `Return Pending` (khóa nút Write Review và Request Return). Admin xử lý tại `A09`: nếu bấm "Reject Return" (bắt buộc ghi lý do từ chối) thì đơn quay lại `Completed` và đóng yêu cầu; nếu bấm "Approve & Refund" thì đơn chuyển sang `Returned`.
* **`BR-RET-02` (Xử lý 1-click Approve, tồn kho & hoàn tiền):** Khi Admin bấm "Approve & Refund" tại `A09`:
  * Đơn hàng chuyển sang trạng thái `Returned`.
  * Trạng thái thanh toán tự động chuyển sang `Refunded`.
  * Tồn kho thực tế tự động cộng lại (`On Hand` tăng bằng số lượng hàng trả, `Available` tăng tương ứng).
  * Số tiền hoàn = Order Total trừ phí vận chuyển $5.00 USD; hoàn 100% cả phí vận chuyển nếu lý do là hàng lỗi/giao sai từ phía cửa hàng. Lượt dùng voucher của đơn không được hoàn lại.
* **`BR-RET-03` (Ảnh hưởng thống kê & ML):** Đơn `Returned` bị loại khỏi Net Revenue, số đơn và AOV (số liệu các kỳ trước được tính lại theo trạng thái hiện tại). Đơn `Return Pending` vẫn tính là đơn hoàn tất cho đến khi được duyệt sang `Returned`. Đơn `Returned` vẫn nằm trong dữ liệu huấn luyện ML vì phản ánh nhu cầu tiêu thụ đã phát sinh (`BR-ML-01`).
---

---

## PHẦN V. KIẾN TRÚC KỸ THUẬT, DỊCH VỤ NGOÀI & JOB NỀN

### 1. Nguyên tắc kiến trúc

* **CSDL quan hệ có hỗ trợ transaction** (ví dụ MySQL/PostgreSQL): bắt buộc cho việc giữ tồn kho nguyên tử (`BR-ORD-10`) và chống đặt trùng (`BR-ORD-06`).
* Mọi quy tắc nghiệp vụ được kiểm tra **phía server**; validation phía client chỉ hỗ trợ trải nghiệm (`BR-SYS-02`).
* Thời gian lưu UTC, hiển thị GMT+7 (`BR-SYS-03`).
* Kết quả ML (dự báo, gợi ý nhập hàng, phiên bản mô hình, chỉ số sai số) lưu vào CSDL dùng chung để Website và Admin cùng đọc, tránh tính toán lặp.

### 2. Đặc tả tích hợp dịch vụ & Cơ chế mô phỏng giao dịch (Integration & Simulation Specification)

| Phân hệ tích hợp | Phương thức triển khai & Cơ chế vận hành | Quy tắc liên quan |
|---|---|---|
| **Dịch vụ gửi mã OTP** | Tích hợp giao thức thư điện tử chuẩn SMTP; hỗ trợ chế độ hiển thị mã Sandbox phục vụ quy trình kiểm định và nghiệm thu vận hành hệ thống | `BR-ACC-07` |
| **Cổng thanh toán điện tử** | Cổng giao dịch điện tử chuẩn hóa (USD) tích hợp cơ chế nhận diện thanh toán thời gian thực; trang bị giao diện kích hoạt mô phỏng giao dịch thành công (Payment Simulation Endpoint) xử lý chuẩn nghiệp vụ qua Webhook/Polling | `BR-PAY-02` → `BR-PAY-05` |
| **Quản lý tài nguyên đa phương tiện** | Phân phối hình ảnh qua thư mục tĩnh tối ưu hoặc hạ tầng lưu trữ đám mây (Object Storage), cấu hình giới hạn tối đa 6 hình ảnh độ phân giải cao cho mỗi sản phẩm | `BR-PRD-06` |
| **Phân hệ Machine Learning** | Vận hành theo kiến trúc huấn luyện theo lô (Batch Pipeline); kết quả dự báo và chỉ số sai số được lưu trữ trực tiếp vào CSDL quan hệ dùng chung; hỗ trợ kích hoạt quy trình tái huấn luyện từ giao diện A03 | `BR-ML-01` → `BR-ML-09` |

### 3. Job nền (Scheduler)

| Job | Tần suất | Mô tả | Quy tắc liên quan |
|---|---|---|---|
| Hủy đơn chuyển khoản quá hạn | Mỗi phút | Quá 30 phút chưa `Paid`: mã `Expired`, đơn `Cancelled`, hoàn `Reserved` và lượt voucher | `BR-PAY-03`, `BR-ORD-05`, `BR-VCH-05` |
| Cập nhật cảnh báo tồn kho | Khi tồn thay đổi (và quét lại mỗi giờ) | Gắn/gỡ cảnh báo "Low Stock" | `BR-PRD-02` |
| Dọn dữ liệu hết hạn | Hằng ngày | Xóa OTP và phiên đã hết hạn | `BR-ACC-05`, `BR-ACC-07` |

### 4. Sơ đồ trạng thái

```text
ĐƠN HÀNG (Order — 7 trạng thái chuẩn hóa)
  COD:            Processing → Shipping → Completed
  Chuyển khoản:   Payment Pending → Processing → Shipping → Completed
  Hủy:            Payment Pending / Processing → Cancelled
  Đổi trả:        Completed → Return Pending → Returned
                  Return Pending → (Admin từ chối) → Completed

THANH TOÁN (Payment)
  Unpaid → Paid → Refunded          (COD: Unpaid → Paid khi đơn Completed)

MÃ THANH TOÁN (PAY-HCI-XXXXX)
  Active → Used | Expired

HÀNG ĐANG VỀ (Incoming theo SKU)
  Order Stock tại A03 (+ Incoming) → Receive Stock tại A07 (- Incoming, + On Hand)
```

### 5. Tác động tồn kho theo sự kiện (`BR-ORD-10`, `BR-RET-02`, `BR-ML-05`)

| Sự kiện | On Hand | Reserved | Incoming | Available |
|---|---|---|---|---|
| Tạo đơn hàng | không đổi | + số lượng | không đổi | − số lượng |
| Hủy đơn (Payment Pending / Processing) | không đổi | − số lượng | không đổi | + số lượng |
| `Processing` → `Shipping` | − số lượng | − số lượng | không đổi | không đổi |
| `Shipping` → `Completed` | không đổi | không đổi | không đổi | không đổi |
| Đổi trả thành công (`Returned`) | + số lượng trả | không đổi | không đổi | + số lượng trả |
| Bấm "Order Stock" tại A03 | không đổi | không đổi | + số lượng | không đổi |
| Bấm "Receive Stock" tại A07 | + số lượng Incoming | không đổi | − số lượng Incoming (= 0) | + số lượng Incoming |
| Admin chỉnh `On Hand` thủ công | ± điều chỉnh | không đổi | không đổi | ± điều chỉnh |

---

## PHẦN VI. BẢNG PHÂN BỔ QUY TẮC NGHIỆP VỤ & MA TRẬN TRUY VẾT YÊU CẦU (RTM)

### 1. Bảng phân bổ 73 Quy tắc nghiệp vụ chuẩn hóa (Business Rules Breakdown)

| Nhóm mã | Tên phân hệ nghiệp vụ | Số lượng quy tắc | Phạm vi điều chỉnh chính |
|---|---|:---:|---|
| **BR-ACC** | Tài khoản, Xác thực & Phân quyền | **9** (`01`–`09`) | Định dạng dữ liệu, định danh duy nhất, quyền hạn Guest, bảo toàn session/giỏ hàng, mã hóa Bcrypt 24h, bảo vệ Brute Force, quản trị tài khoản. |
| **BR-ORD** | Quản lý Giỏ hàng & Vòng đời Đơn hàng | **10** (`01`–`10`) | Kiểm tra tồn khả dụng, 7 trạng thái đơn hàng, quyền hủy đơn, snapshot giá lịch sử, định danh đơn, định nghĩa doanh thu, trừ tồn kho nguyên tử. |
| **BR-PAY** | Thanh toán & Vận chuyển | **8** (`01`–`08`) | Phương thức COD / Chuyển khoản USD, mã định danh `PAY-HCI-...`, hạn 30 phút, xử lý Idempotent Webhook/Polling, phí ship cố định $5.00, chính sách hoàn tiền. |
| **BR-PRD** | Sản phẩm & Quản lý Tồn kho | **7** (`01`–`07`) | Quản lý biến thể dung tích, cảnh báo Low Stock, điều chỉnh On Hand, xử lý Out of Stock, chống xóa cứng dữ liệu, gán nhãn Quiz. |
| **BR-REV** | Đánh giá xác thực (Store Verified Reviews) | **5** (`01`–`05`) | Kiểm tra Verified Purchase cho đơn `Completed`, giới hạn 1 review/sản phẩm/đơn, quy chuẩn thang điểm 1–5 sao, cơ chế ẩn/hiện kiểm duyệt. |
| **BR-VCH** | Khuyến mại & Mã giảm giá Voucher | **6** (`01`–`06`) | Thuộc tính voucher, nguyên tắc không cộng dồn, kiểm định điều kiện tại Checkout, hoàn voucher khi hủy đơn, khống chế giảm tối đa. |
| **BR-SRC** | Tìm kiếm & Lọc danh mục | **3** (`01`–`03`) | Tìm kiếm mờ (Fuzzy Search Levenshtein $\le 2$), trường dữ liệu tra cứu, quy chuẩn hiển thị trạng thái tồn kho. |
| **BR-QUZ** | Hệ chuyên gia tư vấn Hair Routine | **10** (`01`–`10`) | Luật suy diễn tất định, thứ tự ưu tiên 7 nhóm nhu cầu, cấu trúc routine 4 bước + 1 add-on, ràng buộc tồn kho khả dụng, fallback, lưu Hair Profile, thống kê BI. |
| **BR-ML** | Machine Learning Dự báo Nhu cầu & Tồn kho | **9** (`01`–`09`) | Dự báo chuỗi thời gian 6 danh mục, bộ đặc trưng thời gian/trễ, thẩm định TimeSeriesSplit & WAPE, quy trình Retrain, công thức Reorder 14 ngày khép kín kho, Model Drift, Cold Start, phân bổ SKU. |
| **BR-SYS** | An toàn Thông tin & Tiêu chuẩn Hệ thống | **3** (`01`–`03`) | Bảo mật dữ liệu cá nhân, phòng vệ tấn công SQLi/XSS, quy chuẩn múi giờ GMT+7 và định dạng tiền tệ USD `$XX.XX`. |
| **BR-RET** | Quy trình Đổi trả & Hoàn tiền | **3** (`01`–`03`) | Điều kiện trả hàng trong 7 ngày đối với đơn `Completed`, xử lý 1-click Approve & Refund, tự động hoàn kho On Hand và cập nhật thống kê tài chính/ML. |
| **TỔNG CỘNG** | **11 Phân hệ nghiệp vụ** | **73** | **Toàn bộ hệ thống vận hành thống nhất theo 73 quy tắc chuẩn hóa.** |

---

### 2. Ma trận đối soát & truy vết yêu cầu (Requirement Traceability Matrix - RTM)

Ma trận đối soát bảo đảm tính bao phủ toàn diện 100% giữa **30 Màn hình Core** và **73 Quy tắc nghiệp vụ**:

| Mã màn hình | Tên màn hình chức năng | Phân hệ | Danh mục Quy tắc nghiệp vụ bắt buộc thực thi |
|:---:|---|:---:|---|
| **C01** | Trang chủ (Home Page) | Storefront | `BR-PRD-01`, `BR-QUZ-01`, `BR-ACC-03` |
| **C02** | Cửa hàng & Tìm kiếm (Shop Catalog & Search) | Storefront | `BR-SRC-01`, `BR-SRC-02`, `BR-SRC-03`, `BR-PRD-04`, `BR-ACC-03` |
| **C03** | Chi tiết sản phẩm (Product Detail Page) | Storefront | `BR-PRD-01`, `BR-PRD-04`, `BR-REV-01`, `BR-REV-04`, `BR-ORD-01` |
| **C04** | Quiz tư vấn tóc 4 bước (Hair Routine Quiz) | Storefront | `BR-QUZ-01`, `BR-QUZ-02`, `BR-QUZ-03`, `BR-QUZ-08`, `BR-ACC-03` |
| **C05** | Kết quả Quiz & Routine đề xuất (Quiz Result) | Storefront | `BR-QUZ-04`, `BR-QUZ-05`, `BR-QUZ-06`, `BR-QUZ-07`, `BR-QUZ-08`, `BR-QUZ-09`, `BR-QUZ-10`, `BR-ACC-03` |
| **C06** | Giỏ hàng (Shopping Cart) | Storefront | `BR-ORD-01`, `BR-ORD-02`, `BR-VCH-04`, `BR-ACC-03`, `BR-ACC-04` |
| **C07** | Đặt hàng & Thanh toán (Checkout) | Giao dịch | `BR-ORD-01`, `BR-ORD-03`, `BR-ORD-06`, `BR-PAY-01`, `BR-PAY-06`, `BR-PAY-07`, `BR-VCH-03` |
| **C08** | Chờ thanh toán điện tử (Payment Pending — 30m) | Giao dịch | `BR-PAY-02`, `BR-PAY-03`, `BR-PAY-04`, `BR-ORD-03`, `BR-ORD-05` |
| **C09** | Đặt hàng thành công (Order Success / Thank You) | Giao dịch | `BR-ORD-03`, `BR-ORD-08` |
| **C10** | Đăng nhập (Login Page) | Xác thực | `BR-ACC-01`, `BR-ACC-02`, `BR-ACC-04`, `BR-ACC-05`, `BR-ACC-08`, `BR-ACC-09`, `BR-QUZ-07` |
| **C11** | Đăng ký (Register Page) | Xác thực | `BR-ACC-01`, `BR-ACC-02`, `BR-ACC-04`, `BR-ACC-05`, `BR-QUZ-07` |
| **C12** | Quên & Đặt lại mật khẩu (OTP Verification) | Xác thực | `BR-ACC-01`, `BR-ACC-05`, `BR-ACC-07` |
| **C13** | Hồ sơ cá nhân & Hair Profile (My Profile) | Khách hàng | `BR-ACC-01`, `BR-QUZ-07`, `BR-SYS-01` |
| **C14** | Lịch sử đơn hàng (Order History) | Khách hàng | `BR-ORD-03`, `BR-ORD-09`, `BR-RET-01` |
| **C15** | Chi tiết đơn hàng & Đánh giá (Order Detail & Review) | Khách hàng | `BR-ORD-01`, `BR-ORD-03`, `BR-ORD-04`, `BR-REV-01`, `BR-REV-02`, `BR-REV-03`, `BR-REV-04`, `BR-REV-05`, `BR-RET-01`, `BR-RET-02` |
| **C16** | Giới thiệu & Chính sách (About Us & Store Policies) | Storefront | `BR-PAY-06`, `BR-PAY-08`, `BR-RET-01`, `BR-RET-02`, `BR-SYS-01`, `BR-SYS-03` |
| **A01** | Đăng nhập Quản trị (Admin Login) | Quản trị | `BR-ACC-06`, `BR-ACC-08` |
| **A02** | Bảng điều khiển trung tâm (Dashboard & KPIs) | Quản trị | `BR-ORD-09`, `BR-ML-01`, `BR-PRD-02`, `BR-QUZ-10`, `BR-RET-01` |
| **A03** | Dự báo bán hàng & Gợi ý nhập hàng ML (Sales Forecast) | Quản trị | `BR-ML-01`, `BR-ML-02`, `BR-ML-03`, `BR-ML-04`, `BR-ML-05`, `BR-ML-06`, `BR-ML-07`, `BR-ML-08`, `BR-ML-09` |
| **A04** | Danh sách sản phẩm (Product List) | Quản trị | `BR-PRD-01`, `BR-PRD-05`, `BR-PRD-06` |
| **A05** | Thêm mới sản phẩm (Product Create Form) | Quản trị | `BR-PRD-01`, `BR-PRD-06`, `BR-PRD-07` |
| **A06** | Chỉnh sửa sản phẩm (Product Edit Form) | Quản trị | `BR-PRD-01`, `BR-PRD-05`, `BR-PRD-07`, `BR-ORD-07` |
| **A07** | Quản lý tồn kho theo biến thể (Inventory Stock) | Quản trị | `BR-PRD-02`, `BR-PRD-03`, `BR-PRD-04`, `BR-ORD-01`, `BR-ORD-05`, `BR-ORD-10`, `BR-ML-05` |
| **A08** | Danh sách đơn hàng (Order List) | Quản trị | `BR-ORD-03`, `BR-ORD-04`, `BR-ORD-08`, `BR-PAY-01`, `BR-PAY-04`, `BR-PAY-05`, `BR-RET-01` |
| **A09** | Chi tiết & Xử lý đơn hàng (Order Fulfillment) | Quản trị | `BR-ORD-03`, `BR-ORD-04`, `BR-ORD-05`, `BR-ORD-10`, `BR-PAY-01`, `BR-PAY-04`, `BR-PAY-05`, `BR-RET-01`, `BR-RET-02`, `BR-RET-03` |
| **A10** | Danh sách mã giảm giá (Voucher List) | Quản trị | `BR-VCH-01`, `BR-VCH-05` |
| **A11** | Tạo & Chỉnh sửa mã giảm giá (Voucher Form) | Quản trị | `BR-VCH-01`, `BR-VCH-02`, `BR-VCH-06` |
| **A12** | Cài đặt cửa hàng & Hệ thống (Store Settings) | Quản trị | `BR-PAY-03`, `BR-PAY-06`, `BR-PRD-02`, `BR-ML-05`, `BR-SYS-03` |
| **A13** | Quản lý khách hàng (Customer Management) | Quản trị | `BR-ACC-08`, `BR-ACC-09`, `BR-SYS-01` |
| **A14** | Kiểm duyệt đánh giá (Review Moderation) | Quản trị | `BR-REV-01`, `BR-REV-04`, `BR-REV-05` |

---

### 3. Tuyên bố cam kết chuẩn hệ thống (System Baseline Statement)

Tài liệu đặc tả yêu cầu phần mềm **HairCare Insight** thiết lập chuẩn cơ sở duy nhất (Approved Baseline / Single Source of Truth) phục vụ toàn diện các giai đoạn:
1. **Thiết kế Kiến trúc Phần mềm & Cơ sở Dữ liệu (Software & Database Architecture)**.
2. **Hiện thực Hóa Hệ thống (System Implementation & Coding)**.
3. **Kiểm thử Nghiệp vụ & Đảm bảo Chất lượng (QA / Automated System Testing)**.
4. **Nghiệm thu & Bàn giao Sản phẩm (User Acceptance Testing & Deployment)**.

Mọi chức năng, giao diện, luồng xử lý và cấu trúc dữ liệu phát triển bắt buộc phải tuân thủ và đối soát chuẩn xác 100% với **30 Màn hình Core** và **73 Quy tắc nghiệp vụ** được quy định trong tài liệu này.
