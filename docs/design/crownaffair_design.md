# HỆ THỐNG THIẾT KẾ & ĐẶC TẢ GIAO DIỆN (DESIGN SYSTEM & UI/UX SPECIFICATION)
## DỰ ÁN THƯƠNG MẠI ĐIỆN TỬ CHĂM SÓC TÓC THUẦN KHIẾT — PHONG CÁCH CROWN AFFAIR

> **Mã tài liệu:** `CA-DESIGN-SYSTEM-2026`  
> **Nền tảng đối sánh gốc:** Website chính hãng [Crown Affair](https://www.crownaffair.com/) (New York, USA)  
> **Phong cách cốt lõi:** **Quiet Luxury**, **Clean Haircare Rituals**, **Art Editorial Minimalism**, **Slow Beauty**.  
> **Tiêu chuẩn thiết kế:** Responsive Mobile-First, Tối giản hình học, Khoảng trắng thở (Whitespace Artistry), Chuẩn tiếp cận WCAG 2.1 AA.

---

## MỤC LỤC CHI TIẾT

1. [Triết lý Thiết kế & Định vị Thương hiệu (Brand Philosophy & Identity)](#1-triết-lý-thiết-kế--định-vị-thương-hiệu)
2. [Hệ thống Màu sắc & Design Tokens (Color Palette & Tokens)](#2-hệ-thống-màu-sắc--design-tokens)
3. [Hệ thống Typography Nghệ thuật (Artisanal Typography System)](#3-hệ-thống-typography-nghệ-thuật)
4. [Hệ thống Bố cục, Lưới & Khoảng thở (Grid, Whitespace & Elevation)](#4-hệ-thống-bố-cục-lưới--khoảng-thở)
5. [Thư viện Thành phần Giao diện Tối giản (Atomic Component Library)](#5-thư-viện-thành-phần-giao-diện-tối-giản)
6. [Đặc tả Chi tiết 16 Màn hình Khách hàng (Customer Portal C01–C16)](#6-đặc-tả-chi-tiết-16-màn-hình-khách-hàng-c01c16)
7. [Đặc tả Chi tiết 14 Màn hình Quản trị (Admin Portal A01–A14)](#7-đặc-tả-chi-tiết-14-màn-hình-quản-trị-admin-portal-a01a14)
8. [Quy chuẩn Motion, Micro-Interactions & Trải nghiệm Chậm (Slow UX)](#8-quy-chuẩn-motion-micro-interactions--trải-nghiệm-chậm)
9. [Tiêu chuẩn Khả năng Tiếp cận & Responsive (A11y & Responsive Matrix)](#9-tiêu-chuẩn-khả-năng-tiếp-cận--responsive)
10. [Mã nguồn Cấu hình Tailwind CSS & CSS Tokens Toàn cục](#10-mã-nguồn-cấu-hình-tailwind-css--css-tokens-toàn-cục)

---

## 1. TRIẾT LÝ THIẾT KẾ & ĐỊNH VỊ THƯƠNG HIỆU

### 1.1. Tinh thần "Take Your Time" (Chăm sóc tóc như một Nghi thức)
Khác biệt hoàn toàn với phong cách rực rỡ, năng động của các thương hiệu salon đại chúng, **Crown Affair** định nghĩa lại việc chăm sóc tóc: Không phải là một thói quen cơ học vội vã, mà là một **"Ritual" (Nghi thức nâng niu bản thân)**.
* **Tĩnh lặng & Sang trọng kín đáo (Quiet Luxury):** Không dùng màu sắc chói lọi, không dùng banner flash-sale giật gân, không đếm ngược áp lực mua hàng. Trang web mang lại cảm giác thư thái, tĩnh tâm như đang bước vào một phòng trưng bày nghệ thuật đương đại hoặc một spa hữu cơ cao cấp tại New York / Tokyo.
* **Cảm hứng Nghệ thuật & Thủ công điêu khắc:** Ngôn ngữ tạo hình chịu ảnh hưởng sâu sắc từ các tác phẩm điêu khắc mềm mại của **Constantin Brâncuși** và bảng màu hoài niệm thập niên 70 của danh họa **Ed Ruscha** (do Brooklyn studio *Placeholder* & xưởng đúc chữ *Grilli Type* đồng sáng tạo).
* **Định danh Sản phẩm tối giản:** Toàn bộ sản phẩm được định danh bằng mạo từ xác định *"The..."* kèm số hiệu thủ công: *The Oil, The Renewal Mask, The Cleansing Scrub, The Dry Shampoo, The Towel, The Comb No. 001, The Brush No. 002*.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     TRIẾT LÝ THIẾT KẾ CROWN AFFAIR                     │
│                                                                        │
│   [ "TAKE YOUR TIME" ]        [ TACTILE BEAUTY ]      [ ART EDITORIAL ]│
│   Nghi thức sống chậm,       Tôn vinh chất liệu      Bố cục tạp chí,  │
│   khoảng trắng tĩnh lặng,    gỗ tự nhiên, thủy tinh  typography có    │
│   thư thái không áp lực      & mai rùa thủ công      nhịp điệu sợi tóc│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. HỆ THỐNG MÀU SẮC & DESIGN TOKENS

Bảng màu của Crown Affair là bản giao hưởng giữa sắc ấm của giấy mộc hữu cơ, chất liệu sừng mai rùa, màu xanh lá cây xô thơm êm dịu và sắc đen mực in tương phản tinh xảo.

### 2.1. Bảng màu Nhận diện Thương hiệu (Crown Affair Signature Palette)

| Tên Token | HEX Code | RGB | Tỷ lệ dùng | Ứng dụng & Cảm xúc truyền tải |
|---|---|---|:---:|---|
| `ca-linen-bg` | `#F9F8F6` | `249, 248, 246` | **45%** | **Nền giấy mộc / Canvas chính:** Màu trắng kem ấm như vải lanh chưa tẩy trắng. Tạo sự ấm áp, dễ chịu cho mắt khi đọc lâu. |
| `ca-chalk-white` | `#FFFFFF` | `255, 255, 255` | **25%** | **Nền thẻ card & modal:** Nền thẻ sản phẩm, dropdown menu, thanh toán. |
| `ca-ink-black` | `#111111` | `17, 17, 17` | **15%** | **Chữ đen tuyền & Primary CTA:** Tiêu đề, nút bấm chủ đạo góc vuông đen tuyền, viền nét mảnh 1px. |
| `ca-sage-mint` | `#C2D6C8` | `194, 214, 200` | **5%** | **Màu xanh Sage đặc trưng:** Màu vỏ hộp bao bì Crown Affair, huy hiệu Routine, tag thành phần hữu cơ. |
| `ca-tsubaki-amber` | `#E5A96E` | `229, 169, 110` | **3%** | **Hổ phách dầu Camellia:** Điểm nhấn giọt dầu dưỡng *The Oil*, sao đánh giá mộc. |
| `ca-bordeaux-wine` | `#4A1521` | `74, 21, 33` | **3%** | **Sắc đỏ rượu Bordeaux:** Điểm nhấn bộ sưu tập thủ công giới hạn, tag Exclusive. |
| `ca-surf-blue` | `#B8CBD8` | `184, 203, 216` | **2%** | **Xanh bọt sóng êm đềm:** Màu khăn ủ tóc *The Towel*, thông báo vận chuyển. |
| `ca-border-light` | `#E2DDD5` | `226, 221, 213` | **2%** | Đường kẻ phân đoạn mỏng như mép trang sách in mỹ thuật. |

### 2.2. Bảng màu Văn bản & Trung tính (Typographic Neutrals)

| Token | HEX | Mô tả sử dụng |
|---|---|---|
| `ca-text-primary` | `#111111` | Tiêu đề H1–H4, giá tiền, tên sản phẩm, chữ nút bấm đen. |
| `ca-text-body` | `#262626` | Nội dung mô tả sản phẩm, thành phần, hướng dẫn nghi thức. |
| `ca-text-muted` | `#6E6A64` | Tiêu đề phụ, breadcrumb, dung tích định lượng ml/oz, ngày đánh giá. |
| `ca-text-placeholder`| `#9E9A92` | Gợi ý tìm kiếm, ô nhập mã voucher chưa điền. |
| `ca-surface-warm` | `#F2EFE9` | Nền các khối ghi chú lời khuyên tóc, nền bảng sọc vằn. |
| `ca-border-dark` | `#111111` | Viền nút bấm outline, viền ô trắc nghiệm khi được click chọn. |

### 2.3. Bảng màu Trạng thái & Nghiệp vụ (Refined Semantic Tones)
Crown Affair hạn chế sử dụng màu cảnh báo quá gay gắt để duy trì sự thanh lịch:
* **Thành công / Hoàn tất (`Success`):** Nền xanh sage nhạt `#EBF2ED`, viền `#7FA88B`, chữ `#2B5237` (Đơn *Completed*, đã thêm vào túi).
* **Chờ xử lý / Tồn thấp (`Warning`):** Nền kem hổ phách `#FAF2EB`, viền `#D49D6A`, chữ `#7A4C22` (Tồn $\le 15$, đơn *Payment Pending*).
* **Hết hàng / Hủy đơn (`Danger`):** Nền hồng nhạt trầm `#F9ECEC`, viền `#C47272`, chữ `#782E2E` (Nhãn *Sold Out*, đơn *Cancelled*).
* **Đang vận chuyển (`Fulfillment`):** Nền xanh khói `#EEF4F8`, viền `#8DA9BE`, chữ `#274B64` (Đơn *Shipping*).

---

## 3. HỆ THỐNG TYPOGRAPHY NGHỆ THUẬT

### 3.1. Phông chữ Nhận diện & Nhịp điệu Sợi tóc (The Rhythm of Hair)
Crown Affair sở hữu kiểu chữ tùy biến độc quyền do **Grilli Type** phát triển, mô phỏng nhịp điệu uyển chuyển của mái tóc tự nhiên với các ký tự xen kẽ bản rộng và hẹp:
* **Phông Tiêu đề Chính (Display & Headlines):** `Syne`, `Epilogue`, `Italiana` hoặc `Montserrat` tinh chỉnh.  
  * *Đặc tính:* Tỷ lệ chữ rộng thoáng, nét cắt ngang thanh mảnh, chữ "R" hoa có nét chân uốn lượn mềm mại.
* **Phông Nội dung & Dữ liệu (Body & Technical Data):** `Inter`, `Neue Haas Grotesk`, `system-ui`.  
  * *Đặc tính:* Hình học hiện đại, khoảng cách dòng thoáng đãng (`line-height: 1.65 - 1.8`), không gây mỏi mắt.
* **Phông Biên tập Thơ mộng (Editorial Serif):** `Cormorant Garamond`, `Playfair Display Italic`.  
  * *Đặc tính:* Dùng cho các câu châm ngôn *"Take your time"*, lời khuyên chuyên gia, trích dẫn triết lý nghi thức.
* **Phông Ký hiệu & Mã số (Monospace Numbers):** `Space Mono`, `JetBrains Mono` (Dành cho mã số sản phẩm No. 001, No. 002, mã đơn hàng).

### 3.2. Bảng phân cấp Kích thước & Quy cách chữ (Type Scale)

| Cấp bậc (Level) | Size (Desktop) | Size (Mobile) | Weight | Line Height | Letter Spacing | Phong cách & Vị trí ứng dụng |
|---|---|---|:---:|:---:|:---:|---|
| **Editorial Display** | `52px` (3.25rem) | `34px` (2.125rem) | 400 Regular / Italic | 1.15 | `-0.02em` | Khối mở đầu trang chủ, triết lý "Take Your Time". |
| **Heading 1 (H1)** | `38px` (2.375rem) | `28px` (1.75rem) | 500 Medium | 1.25 | `+0.01em` | Tên sản phẩm chính trên PDP (C03): *"The Oil"*. |
| **Heading 2 (H2)** | `28px` (1.75rem) | `22px` (1.375rem) | 500 Medium | 1.30 | `+0.04em` | Tiêu đề khối: *"The Rituals"*, *"The Wash Day"*. |
| **Heading 3 (H3)** | `20px` (1.25rem) | `18px` (1.125rem) | 500 Medium | 1.40 | `+0.02em` | Tên bước trong Quiz, Accordion tiêu đề. |
| **Product Card Title**| `16px` (1.0rem) | `15px` (0.938rem) | 500 Medium | 1.40 | `+0.01em` | Tên sản phẩm dạng thẻ: *"The Renewal Mask"*. |
| **Body Editorial** | `16px` (1.0rem) | `15px` (0.938rem) | 400 Regular | 1.70 | `0` | Đoạn văn cảm thụ thương hiệu, mô tả chất liệu. |
| **Body Technical** | `14px` (0.875rem) | `13px` (0.813rem) | 400 Regular | 1.60 | `0` | Bảng thành phần chi tiết, thông số dung tích. |
| **Micro Subtitle** | `11px` (0.688rem) | `10px` (0.625rem) | 600 SemiBold | 1.20 | `+0.15em` | ALL CAPS: *"FOR ALL HAIR TEXTURES"*, *"NO. 001"*. |
| **Button Text** | `13px` (0.813rem) | `12px` (0.75rem) | 600 SemiBold | 1.00 | `+0.12em` | ALL CAPS: *"ADD TO BAG"*, *"START THE QUIZ"*. |

---

## 4. HỆ THỐNG BỐ CỤC, LƯỚI & KHOẢNG THỞ

### 4.1. Nghệ thuật Khoảng trắng (Whitespace as a Luxury Feature)
Crown Affair không cố gắng lấp đầy màn hình. Khoảng trống trắng kem `#F9F8F6` chính là "sự xa xỉ vô hình", tạo điều kiện cho từng bức ảnh sản phẩm, giọt dầu trong suốt hay vân mai rùa thủ công được chiêm ngưỡng trọn vẹn:
* **Gutter & Padding rộng rãi:** Padding giữa các khối nội dung tối thiểu `80px` đến `120px` trên desktop.
* **Bố cục Bất đối xứng Nghệ thuật (Asymmetric Layout):** Ảnh lớn bên trái, khối văn bản nhỏ căn lệch nhẹ bên phải mang đậm chất một trang tạp chí thời trang Vogue / Kinfolk.

### 4.2. Thang đo Khoảng cách & Bố cục
* `space-2` = `8px`: Khoảng cách giữa các tag thành phần hữu cơ.
* `space-4` = `16px`: Lề trong ô input, gutter lưới mobile.
* `space-6` = `24px`: Khoảng cách giữa tiêu đề và đoạn văn mô tả.
* `space-10` = `40px`: Padding thẻ giỏ hàng, khoảng cách giữa các lựa chọn Quiz.
* `space-16` = `64px`: Padding section vừa.
* `space-24` = `96px`: Khoảng cách phân đoạn chính trên trang chủ.
* `space-32` = `128px`: Khoảng cách ngắt nhịp giữa các phân đoạn kể chuyện lớn.

### 4.3. Đường nét & Đổ bóng (Borders & Shadows)
* **Borders (Đường nét mỏng như tơ):** Viền kẻ màu `#E2DDD5` với độ dày duy nhất `1px solid`.
* **Elevation & Shadows:** Crown Affair **nói không với đổ bóng nặng nề**. Phong cách chủ đạo là **Flat Clean Design**. Chỉ có duy nhất một bóng đổ siêu mờ và mềm (`box-shadow: -15px 0 45px rgba(0, 0, 0, 0.04)`) khi mở Cart Drawer.

---

## 5. THƯ VIỆN THÀNH PHẦN GIAO DIỆN TỐI GIẢN

### 5.1. Nút bấm (Button Components)

```
[ NÚT CHỦ ĐẠO - THE PRIMARY ]    [ NÚT BIÊN TẬP - THE OUTLINE ]    [ NÚT VĂN BẢN - TEXT LINK ]
┌─────────────────────────┐      ┌─────────────────────────┐      
│       ADD TO BAG        │      │    EXPLORE THE RITUAL   │      Discover the Ingredients →
└─────────────────────────┘      └─────────────────────────┘      
  Bg: #111111 (Ink Black)          Bg: Transparent                  Chữ: #111111 | Gạch chân mỏng
  Text: #FFFFFF | Radius: 0        Text: #111111 | Radius: 0        Hover: Tự động trượt mũi tên
  Hover: Bg #262626                Border: 1px solid #111111        sang phải 4px
                                   Hover: Bg #111111, Text #FFF
```

* **Quy chuẩn Nút:** Góc vuông tuyệt đối (`border-radius: 0px`), chiều cao thanh mảnh vừa phải (`padding: 14px 28px`), chữ in hoa, khoảng cách giãn chữ rộng `0.12em`. Không dùng bo tròn, không hiệu ứng 3D bóng bẩy.

### 5.2. Thẻ Sản phẩm Đậm chất Nhiếp ảnh (Editorial Product Card)

```
┌──────────────────────────────────────┐
│ [NEW]                      [NO. 001] │ <- Nhãn chữ nhỏ ALL CAPS mỏng
│                                      │
│                                      │
│           [ HÌNH ẢNH STUDIO ]        │ <- Tỷ lệ 1:1 hoặc 3:4 nền kem sạch
│         (Ánh sáng tự nhiên mềm,      │    Không hiệu ứng zoom phóng đại
│          bóng đổ thực tế dịu dàng)   │
│                                      │
├──────────────────────────────────────┤
│ The Oil                              │ <- Tên sản phẩm (Medium 16px)
│ Weightless hydration & smooth finish │ <- Mô tả 1 dòng ngắn như thơ (13px Muted)
│ $40.00 USD                           │ <- Giá tiền USD thanh mảnh
│                                      │
│ [ + QUICK ADD ]                      │ <- Link gạch chân xuất hiện êm ái
└──────────────────────────────────────┘
```

### 5.3. Bộ chọn Biến thể & Tùy chọn (Minimal Variant Pills)
* Các dung tích sản phẩm hiển thị dạng danh sách nằm ngang:
  * *Chưa chọn:* Chữ màu xám than `#6E6A64`, không viền hoặc viền mờ `#E2DDD5`.
  * *Đang chọn:* Chữ màu đen `#111111` in đậm, có đường gạch chân đen liền mạch `2px solid #111111` phía dưới (phong cách gạch chân tối giản thay vì bo tròn).
  * *Hết hàng:* Chữ mờ gạch ngang kèm nhãn `(Waitlist)`.

---

## 6. ĐẶC TẢ CHI TIẾT 16 MÀN HÌNH KHÁCH HÀNG (CUSTOMER PORTAL C01–C16)

### 6.1. Khung Điều hướng Toàn cầu (Global Header & Footer)

#### A. Thanh Header Mảnh Mai & Tinh Tế
```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [TOP STRIP]  Complimentary $5.00 Flat Shipping on All US Orders | Clean, Non-Toxic Rituals     │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│   SHOP        RITUALS        THE HAIR QUIZ        ABOUT        THE JOURNAL                   │
│                                                                                              │
│                                  C R O W N   A F F A I R                                     │
│                                                                                              │
│                              [ Search ]            [ Account ]            [ Bag (1) ]        │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```
* **Cấu trúc 3 tầng sang trọng:**
  * Tầng trên: Dải thông báo mảnh nền kem `#F2EFE9`, chữ 11px căn giữa.
  * Tầng giữa: Logo **CROWN AFFAIR** phông chữ hoa kéo dài, căn giữa trang trọng như một ấn phẩm tạp chí.
  * Tầng dưới: Menu điều hướng căn hai bên cân đối; liên kết *"THE HAIR QUIZ"* được nhấn phông chữ hoa đậm nét.
  * Icon túi xách: Hiển thị chữ tối giản `Bag (0)` thay vì icon túi thông thường, khi click sẽ trượt mở Cart Drawer từ bên phải.

#### B. Chân trang Biên tập Tạp chí (The Editorial Footer)
```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  THE JOURNAL NEWSLETTER                                                                      │
│  "A gentle weekly dispatch on haircare rituals, literature, intentional living, and art."   │
│  [ Your email address...                           ]  [ JOIN THE CLUB ]                      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  THE PRODUCTS             THE RITUALS             CARE & POLICIES         ABOUT US           │
│  • The Wash Essentials    • The Wash Day Ritual   • Order Lookup (C15)    • Our Story & Art  │
│  • The Scalp Scrub        • The Air Dry Routine   • Flat $5.00 Shipping   • The Ingredients  │
│  • The Masks & Hydration  • Pre-Wash Treatment    • 7-Day Returns (C15)   • Brâncuși Design  │
│  • The Daily Oil          • Night Scalp Serum     • Privacy Policy (C16)  • Salon Partners   │
│  • The Towel & Brushes    • Retake Hair Quiz (C04)• Terms of Service      • Store Verified   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  © 2026 Crown Affair HairCare Insight. All Rights Reserved. Clean Formula Standard. USD ($)  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2. `C01` | Trang chủ (Home Page — The Art of Hair Rituals)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [HERO SECTION: "TAKE YOUR TIME"]                                            │
│                                                                              │
│                               T A K E   Y O U R   T I M E                    │
│                                                                              │
│        "Rethink your relationship with your hair. Care, not management.      │
│         Intentional formulas designed for slow mornings and quiet rituals."  │
│                                                                              │
│             [ DISCOVER THE ESSENTIALS ]      [ TAKE THE HAIR QUIZ ]          │
│             (Black Button)                   (Outline Button)                │
├──────────────────────────────────────────────────────────────────────────────┤
│  [EDITORIAL SPLIT FEATURE: THE OIL]                                          │
│  ┌────────────────────────────────────┬───────────────────────────────────┐  │
│  │                                    │  THE ICONIC NOURISHMENT           │  │
│  │  [PHOTO: TỦ KÍNH GỖ CHỨA CHAI      │  The Oil                          │  │
│  │   DẦU DƯỠNG TRONG SUỐT VỚI ÁNH     │                                   │  │
│  │   NẮNG SỚM CHIẾU XUYÊN QUA]        │  Formulated with cold-pressed     │  │
│  │                                    │  Tsubaki Seed Oil. Lightweight,   │  │
│  │                                    │  non-greasy, restores pure gloss. │  │
│  │                                    │                                   │  │
│  │                                    │  [ SHOP THE OIL — $40.00 USD ]    │  │
│  └────────────────────────────────────┴───────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  [THE 4-STEP RITUAL GALLERY - DẠNG THẺ NGANG KHÔNG VIỀN ĐEN]                 │
│  01. PRE-WASH            02. CLEANSE          03. HYDRATE        04. FINISH  │
│  ┌──────────────────┐    ┌────────────────┐   ┌──────────────┐   ┌─────────┐ │
│  │ The Scalp Scrub  │    │ The Shampoo    │   │ The Mask     │   │ The Oil │ │
│  │ [Photo mộc]      │    │ [Photo mộc]    │   │ [Photo mộc]  │   │ [Photo] │ │
│  └──────────────────┘    └────────────────┘   └──────────────┘   └─────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  [THE QUIZ BANNER: "FIND YOUR PERSONAL RITUAL"]                              │
│  Nền màu xanh Sage `#C2D6C8` dịu mát:                                        │
│  "Four thoughtful questions to understand your strand density, scalp needs,  │
│   and daily styling habits. Let us build your personalized regimen."         │
│  [ BEGIN THE CONSULTATION ]                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. `C02` | Cửa hàng & Danh mục (Catalog & Filter)
* **Bố cục Tạp chí:** Danh mục sản phẩm được dàn trang dạng lưới 3 hoặc 4 cột thoáng đãng, các bộ lọc nằm ngang tinh tế phía trên:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Home / All Care Essentials (59 Handcrafted Products)                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  COLLECTIONS:  [All]   [Wash Day]   [Masks]   [Treatment]   [Finish & Style] │
│  CONCERNS:     [Repair Damage]   [Hydration]   [Scalp Health]   [Volume]     │
│  AVAILABILITY: [x] In Stock Only              SORT: [ Curated Favorites ▼ ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐ │
│  │                      │  │                      │  │                     │ │
│  │      [PHOTO 1]       │  │      [PHOTO 2]       │  │      [PHOTO 3]      │ │
│  │                      │  │                      │  │                     │ │
│  ├──────────────────────┤  ├──────────────────────┤  ├─────────────────────┤ │
│  │ The Renewal Mask     │  │ The Cleansing Scrub  │  │ The Leave-In        │ │
│  │ Deep moisture repair │  │ Scalp detox & polish │  │ Weightless softness │ │
│  │ $42.00 USD           │  │ $38.00 USD           │  │ $34.00 USD          │ │
│  │ [+ Quick Add]        │  │ [+ Quick Add]        │  │ [Sold Out]          │ │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.4. `C03` | Chi tiết sản phẩm (Product Detail Page — PDP)
* **Phong cách Minimalist Gallery:** Cột trái là các bức ảnh chụp chi tiết chất liệu sản phẩm (macro bọt kem, giọt dầu, hạt scrub). Cột phải cố định các thông tin cốt lõi:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Home / Wash Day / The Renewal Mask                                          │
├──────────────────────────────────────┬───────────────────────────────────────┤
│  [GALLERY CHỤP ẢNH TỰ NHIÊN]         │  C R O W N   A F F A I R              │
│                                      │  The Renewal Mask                     │
│  ┌────────────────────────────────┐  │  ★★★★★ 4.8 / 5.0 (96 Verified Reviews)│
│  │                                │  │                                       │
│  │                                │  │  $42.00 USD                           │
│  │     LARGE EDITORIAL PHOTO      │  │  Complimentary Flat Shipping $5.00    │
│  │     (Texture kem dẻo mịn)      │  │                                       │
│  │                                │  │  SELECT SIZE:                         │
│  │                                │  │  Travel 2.4 oz   |   Full 8.5 oz (✓)  │
│  └────────────────────────────────┘  │  ───────────────────────────────────  │
│  ┌──────────────┐  ┌──────────────┐  │  AVAILABILITY:                        │
│  │ Photo Góc 2  │  │ Photo Góc 3  │  │  ● In Stock & Ready to Ship           │
│  └──────────────┘  └──────────────┘  │                                       │
│                                      │  QUANTITY:   —   1   +                │
│                                      │                                       │
│                                      │  ┌─────────────────────────────────┐  │
│                                      │  │       ADD TO BAG — $42.00       │  │
│                                      │  └─────────────────────────────────┘  │
│                                      │  ┌─────────────────────────────────┐  │
│                                      │  │        BUY NOW (Instant)        │  │
│                                      │  └─────────────────────────────────┘  │
│                                      │                                       │
│                                      │  ▼ THE RITUAL (HOW TO USE)            │
│                                      │  After cleansing, smooth through      │
│                                      │  strands from mid-lengths to ends.    │
│                                      │  Leave for 5–10 minutes. Rinse cool.  │
│                                      │                                       │
│                                      │  ▶ THE INGREDIENTS (Tsubaki, Algae)   │
│                                      │  ▶ CLINICAL PROMISE & PACKAGING       │
├──────────────────────────────────────┴───────────────────────────────────────┤
│  [VERIFIED COMMUNITY THOUGHTS]                                               │
│  Rated 4.8 out of 5 based on 96 Verified Orders.                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Elena R. — Verified Customer ⭐⭐⭐⭐⭐                      18 Oct 2026 │  │
│  │ "This mask transformed my dry ends into silk. The fragrance is subtle,  │  │
│  │ crisp, and calming. Truly a ritual I look forward to each Sunday."     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.5. `C04` & `C05` | The Hair Ritual Quiz & Kết quả Đề xuất
* **Trải nghiệm Thư thái (Slow Quiz Wizard):** Nền màu kem mộc `#F9F8F6`, từng câu hỏi trắc nghiệm hiện ra mềm mại không gấp gáp.

#### A. Màn hình `C04` — Khảo sát 4 Bước Chẩn đoán Tóc
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  THE HAIR CONSULTATION                                           [ Exit ✕ ]  │
│  Question 02 of 04                                                           │
│  [=========================================-----------------------] 50%     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│             DESCRIBE YOUR NATURAL STRAND TEXTURE                             │
│             How does your hair feel when left to air-dry naturally?          │
│                                                                              │
│    ┌───────────────────────────┐       ┌───────────────────────────┐         │
│    │  (●) FINE & DELICATE      │       │  ( ) BALANCED / MEDIUM    │         │
│    │  Strands are soft, quick  │       │  Holds shape with ease,   │         │
│    │  to lose root volume.     │       │  moderate strand density. │         │
│    └───────────────────────────┘       └───────────────────────────┘         │
│    ┌───────────────────────────┐       ┌───────────────────────────┐         │
│    │  ( ) COARSE & THICK       │       │  ( ) CURLY OR COILY       │         │
│    │  Dense, thirsty strands   │       │  Defined spiral pattern,  │         │
│    │  craving rich moisture.   │       │  needs frizz protection.  │         │
│    └───────────────────────────┘       └───────────────────────────┘         │
│                                                                              │
│  [ ← Previous Question ]                            [ Next Question → ]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### B. Màn hình `C05` — Bộ Nghi thức Chăm sóc Đề xuất
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  YOUR CURATED RITUAL                                                         │
│  Diagnosis: Delicate Strands Seeking Deep Repair & Silken Moisture          │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ℹ️ CLINICAL & DERMATOLOGY NOTICE - BR-QUZ-09]                               │
│  These cosmetic recommendations are formulated to nurture strand health and   │
│  do not replace dermatological guidance for chronic scalp medical conditions.│
├──────────────────────────────────────────────────────────────────────────────┤
│  YOUR 4-STEP INTENTIONAL SYSTEM:                                             │
│                                                                              │
│  01. CLEANSE            02. NOURISH          03. RENEW          04. PROTECT   │
│  ┌──────────────────┐   ┌────────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ The Shampoo      │   │ The Conditioner│   │ The Mask     │   │ The Oil   │ │
│  │ [Photo mộc]      │   │ [Photo mộc]    │   │ [Photo mộc]  │   │ [Photo]   │ │
│  │ $30.00 USD       │   │ $32.00 USD     │   │ $42.00 USD   │   │ $40.00 USD│ │
│  └──────────────────┘   └────────────────┘   └──────────────┘   └───────────┘ │
│                                                                              │
│  COMPLIMENTARY SCALP ADD-ON:                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ The Scalp Scrub ($38.00 USD)                      [ + ADD THIS STEP ]  │  │
│  │ Gentle physical exfoliation to detoxify and invigorate hair follicles. │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  RITUAL TOTAL: 4 Products · $144.00 USD                                      │
│                                                                              │
│  ┌────────────────────────────────────────┐   ┌───────────────────────────┐  │
│  │      ADD COMPLETE RITUAL TO BAG        │   │    SAVE TO HAIR PROFILE   │  │
│  └────────────────────────────────────────┘   └───────────────────────────┘  │
│                                                                              │
│  [ ↺ Retake the Consultation ]                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.6. `C06` | Túi Mua Sắm (The Cart Drawer)
* Ngăn kéo giỏ hàng trượt ra nhẹ nhàng từ cạnh phải, tối giản với bảng màu đen-trắng-kem:

```
┌───────────────────────────────────────────────────────────────┐
│ YOUR BAG (2 Items)                                [ Close ✕ ] │
├───────────────────────────────────────────────────────────────┤
│ [NOTE] Flat Rate $5.00 Shipping Applied at Checkout           │
├───────────────────────────────────────────────────────────────┤
│ ┌─────┐  The Oil                                              │
│ │ IMG │  Size: Full - 3.4 fl oz                               │
│ │     │  $40.00 USD                                           │
│ └─────┘  Qty: — 1 +                         Total: $40.00     │
│          [ Remove ]                                           │
├───────────────────────────────────────────────────────────────┤
│ ┌─────┐  The Renewal Mask                                     │
│ │ IMG │  Size: Full - 8.5 fl oz                               │
│ │     │  $42.00 USD                                           │
│ └─────┘  Qty: — 1 +                         Total: $42.00     │
│          [ Remove ]                                           │
├───────────────────────────────────────────────────────────────┤
│ GIFT / VOUCHER CODE:                                          │
│ [ RITUAL10                  ]  [ APPLY ]                      │
│ ✓ Code applied: -$8.20 USD                                    │
├───────────────────────────────────────────────────────────────┤
│ Subtotal                                             $82.00   │
│ Ritual Discount                                     -$8.20   │
│ Flat Shipping                                         $5.00   │
│ ────────────────────────────────────────────────────────────  │
│ TOTAL ESTIMATE                                       $78.80   │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐ │
│ │                  PROCEED TO CHECKOUT                      │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

### 6.7. `C07` – `C09` | Quy trình Đặt hàng & Xác thực Thanh toán
* **`C07` Checkout:** Thiết kế tối giản 2 cột. Bỏ qua các banner quảng cáo gây xao nhãng để người dùng tập trung hoàn tất đơn. Hỗ trợ COD hoặc Chuyển khoản USD.
* **`C08` Chờ thanh toán điện tử (Payment Pending — 30 Phút):**
  * Đồng hồ đếm ngược thiết kế tối giản kiểu Thụy Điển: `[ 29 : 30 ]`.
  * Khối thông tin ngân hàng & mã QR USD trên nền giấy kem `#F2EFE9`.
  * Nút "Simulate Successful Payment" để kiểm thử mô phỏng giao dịch tức thời.
* **`C09` Đặt hàng thành công:** Biểu tượng vòng hoa nhỏ thanh nhã, mã đơn `#HCI-YYYYMMDD-XXXX`, lời cảm ơn chân phương và liên kết theo dõi đơn hàng `C15`.

---

### 6.8. `C10` – `C15` | Cổng Khách hàng Cá nhân (Client Portal)
* **`C10` & `C11` Auth Flow:** Thẻ đăng nhập / đăng ký tối giản không khung viền rườm rà, đặt giữa trang giấy mộc.
* **`C13` Hồ sơ & Hair Profile:** Tab hiển thị tình trạng tóc đã chẩn đoán và 4 bước chăm sóc tóc đã lưu, có nút *"Retake Hair Quiz"*.
* **`C14` & `C15` Lịch sử & Chi tiết Đơn:** Danh sách đơn hàng dạng bảng mỏng, hỗ trợ gửi đánh giá sản phẩm sau khi đơn hoàn tất và gửi yêu cầu đổi trả trong 7 ngày.

---

## 7. ĐẶC TẢ CHI TIẾT 14 MÀN HÌNH QUẢN TRỊ (ADMIN PORTAL A01–A14)

### 7.1. Triết lý Giao diện Quản trị "Artisan Back-Office"
Giao diện Admin kế thừa bảng màu tối giản của Crown Affair: Sử dụng tông xám than đậm `#1C1B1A` cho thanh điều hướng, kết hợp không gian làm việc trắng kem `#F9F8F6` tạo cảm giác làm việc thư thái, chuyên nghiệp và có chiều sâu thẩm mỹ.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  C R O W N   A F F A I R   A D M I N   │  🔍 Search catalog, orders...  [Admin: Dianna ▼]     │
├──────────────────────────┬───────────────────────────────────────────────────────────────────┤
│  • A02 Dashboard         │  Breadcrumb: Dashboard / Demand Forecasting & Replenishment (A03) │
│  • A03 ML Demand Forest  ├───────────────────────────────────────────────────────────────────┤
│  • A04 Product Catalog   │                                                                   │
│  • A05 Add New Product   │  [ BẢNG DỮ LIỆU ĐỘ TƯƠNG PHẢN CAO, ĐƯỜNG KẺ 1PX MẢNH NHƯ TƠ ]     │
│  • A07 Inventory Stock   │  Biểu đồ đường mộc, số liệu in đậm rõ ràng, các nút bấm đen vuông.│
│  • A08 Order Management  │                                                                   │
│  • A09 Fulfillment & Rtn │                                                                   │
│  • A10 Vouchers          │                                                                   │
│  • A13 Customer CRM      │                                                                   │
│  • A14 Review Moderation │                                                                   │
│  • A12 Store Settings    │                                                                   │
└──────────────────────────┴───────────────────────────────────────────────────────────────────┘
```

---

### 7.2. `A02` | Bảng điều khiển trung tâm (Dashboard & KPIs)
* **Thẻ Chỉ số Thanh lịch:** Doanh thu thuần (Net Revenue USD), Đơn hàng hoàn tất, Giá trị đơn trung bình (AOV), Khách hàng mới.
* **Biểu đồ Doanh thu Tối giản:** Đường line mảnh màu đen than `#111111` trên nền canvas kem nhạt.
* **Phân bổ 6 Danh mục & BI Hair Quiz:** Thống kê tỷ lệ các nhóm nhu cầu tóc mà khách đã làm bài khảo sát (Repair, Hydration, Scalp, Volume...).

---

### 7.3. `A03` | Dự báo bán hàng & Tái nhập kho ML (Sales Forecast & Replenishment)
* **Đặc tả Mô hình ML:** Hiển thị sai số WAPE (ngưỡng an toàn $\le 20\%$) và dự báo nhu cầu 14 ngày tới.
* **Bảng Đề xuất Nhập hàng Thông minh:**
  * Cột: SKU, Biến thể, Tồn kho `On Hand`, Đang giữ chỗ `Reserved`, Đang về `Incoming`, Khả dụng `Available`, Dự báo 14 ngày, Số lượng đề xuất nhập `Reorder Qty`.
  * **Nút bấm 1-click `[ Order Stock ]`:** Bấm đặt hàng sẽ tăng trường `Incoming`, ML tự động cập nhật lại dự báo để không trùng lặp.

---

### 7.4. `A07` | Quản lý tồn kho theo biến thể (Inventory Stock Management)
* **Cơ chế tính toán cốt lõi:**
  $$\text{Available} = \text{On Hand} - \text{Reserved}$$
* Khi nhận hàng thực tế tại kho, thủ kho bấm nút **"Receive Stock"**:
  $$\text{On Hand mới} = \text{On Hand cũ} + \text{Incoming}; \quad \text{Incoming mới} = 0$$
* Cung cấp ô sửa nhanh tồn kho `Quick Adjust` bắt buộc chọn lý do kiểm toán.

---

### 7.5. `A09` | Chi tiết & Xử lý vòng đời đơn hàng (Fulfillment & Returns)
* **Quy trình duyệt Đổi trả 7 ngày (Return Approval):**
  * Nút **"Approve & Refund"**: 1-click chuyển đơn sang `Returned`, thanh toán sang `Refunded`, tự động hoàn tiền `Order Total - $5.00` (hoặc 100% nếu lỗi của shop), hoàn lại số lượng tồn kho `On Hand`.
  * Nút **"Reject Return"**: Bắt buộc ghi lý do từ chối.

---

## 8. QUY CHUẨN MOTION, MICRO-INTERACTIONS & TRẢI NGHIỆM CHẬM (SLOW UX)

Khác với các trang web thương mại điện tử giật gân, Crown Affair áp dụng triết lý **Slow UX & Calming Micro-Interactions**:
1. **Chuyển động Êm dịu (`ease-editorial`):** Sử dụng hàm thời gian `cubic-bezier(0.25, 1, 0.5, 1)` với thời lượng nhỉnh hơn bình thường một chút (`0.4s` đến `0.5s`) để tạo cảm giác từ tốn, dịu dàng.
2. **Hover Ảnh Sản phẩm:** Không phóng to giật cục; ảnh mờ nhẹ và chuyển sang góc chụp khác với độ chuyển mờ nhạt (`opacity transition 0.4s`).
3. **Thanh Menu Dropdown:** Xuất hiện như một tấm màn lụa buông xuống êm ái, không rung giật.
4. **Chọn Trắc nghiệm Quiz:** Khi chọn câu trả lời, viền đen mảnh xuất hiện nhẹ nhàng, dấu chấm tròn đen xuất hiện ở tâm radio mà không có hiệu ứng nảy bật thô bạo.

---

## 9. TIÊU CHUẨN KHẢ NĂNG TIẾP CẬN & RESPONSIVE

### 9.1. Chuẩn Tiếp cận WCAG 2.1 AA
* **Tỷ lệ Tương phản:** Chữ đen `#111111` trên nền kem mộc `#F9F8F6` đạt tỷ lệ tương phản kỷ lục **`18.2:1`** (vượt xa chuẩn AA yêu cầu 4.5:1), giúp người dùng đọc văn bản cực kỳ dễ chịu kể cả dưới ánh sáng mặt trời mạnh.
* **Focus Visible:** Khi dùng bàn phím Tab, đường viền nét đứt mảnh màu đen than xuất hiện cách phần tử 2px.

### 9.2. Ma trận Hiển thị Responsive

| Thành phần | Desktop ($> 1024px$) | Tablet ($768px - 1023px$) | Mobile ($< 768px$) |
|---|---|---|---|
| **Header** | Logo giữa, 2 cụm menu 2 bên | Logo giữa, Menu hamburger | Menu trượt trái, Bag góc phải |
| **Lưới Catalog** | 3 hoặc 4 cột thoáng đãng | 2 hoặc 3 cột | 1 hoặc 2 cột với padding thoáng |
| **PDP C03** | 2 Cột tỷ lệ 60/40 | 2 Cột tỷ lệ 50/50 | 1 Cột cuộn dọc, nút Mua cố định đáy |
| **Quiz C04** | 2x2 Ô lựa chọn lớn | 2x2 Ô lựa chọn | 1 Cột dọc với nút Next cố định |

---

## 10. MÃ NGUỒN CẤU HÌNH TAILWIND CSS & CSS TOKENS TOÀN CỤC

### 10.1. Cấu hình Tailwind CSS (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html,vue,blade.php}",
    "./templates/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        crown: {
          linen: '#F9F8F6',     // Nền giấy mộc canvas chính
          chalk: '#FFFFFF',     // Nền card trắng tinh
          ink: '#111111',       // Đen tuyền cho chữ và nút chính
          charcoal: '#262626',  // Chữ nội dung
          muted: '#6E6A64',     // Chữ phụ, caption
          border: '#E2DDD5',    // Viền mỏng trang sách
          surface: '#F2EFE9',   // Nền ấm phụ
          sage: {
            DEFAULT: '#C2D6C8', // Xanh Sage signature vỏ hộp
            light: '#EBF2ED',
            dark: '#7FA88B',
          },
          amber: '#E5A96E',     // Vàng hổ phách The Oil
          bordeaux: '#4A1521',  // Đỏ rượu Bordeaux Collection
          surf: '#B8CBD8',      // Xanh bọt sóng The Towel
        }
      },
      fontFamily: {
        display: ['Syne', 'Montserrat', 'Helvetica Neue', 'sans-serif'],
        body: ['Inter', 'Neue Haas Grotesk', 'system-ui', 'sans-serif'],
        editorial: ['Cormorant Garamond', 'Playfair Display', 'serif'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        'ritual': '0.14em',
        'subtle': '0.04em',
      },
      borderRadius: {
        'none': '0px', // Triết lý góc vuông mộc của Crown Affair
      },
      boxShadow: {
        'ca-drawer': '-15px 0 45px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
}
```

### 10.2. Mã CSS Biến Toàn cục (`styles/crownaffair-tokens.css`)

```css
/* ==========================================================================
   CROWN AFFAIR DESIGN TOKENS — ROOT VARIABLES
   ========================================================================== */

:root {
  /* Brand Canvas & Neutrals */
  --ca-bg-linen: #F9F8F6;
  --ca-bg-card: #FFFFFF;
  --ca-text-ink: #111111;
  --ca-text-body: #262626;
  --ca-text-muted: #6E6A64;
  --ca-border-light: #E2DDD5;
  --ca-surface-warm: #F2EFE9;

  /* Nature Accents */
  --ca-accent-sage: #C2D6C8;
  --ca-accent-amber: #E5A96E;
  --ca-accent-bordeaux: #4A1521;
  --ca-accent-surf: #B8CBD8;

  /* Typography */
  --ca-font-display: 'Syne', 'Montserrat', sans-serif;
  --ca-font-body: 'Inter', system-ui, sans-serif;
  --ca-font-editorial: 'Cormorant Garamond', serif;

  /* Transitions */
  --ca-ease-editorial: cubic-bezier(0.25, 1, 0.5, 1);
  --ca-duration: 0.35s;
}

/* Base Body Application */
body {
  background-color: var(--ca-bg-linen);
  color: var(--ca-text-body);
  font-family: var(--ca-font-body);
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

/* Button Classes */
.btn-crown-primary {
  background-color: var(--ca-text-ink);
  color: #FFFFFF;
  font-family: var(--ca-font-display);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 15px 32px;
  border: 1px solid var(--ca-text-ink);
  border-radius: 0px;
  cursor: pointer;
  transition: all var(--ca-duration) var(--ca-ease-editorial);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-crown-primary:hover {
  background-color: #2D2D2D;
  border-color: #2D2D2D;
}

.btn-crown-outline {
  background-color: transparent;
  color: var(--ca-text-ink);
  font-family: var(--ca-font-display);
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 14px 30px;
  border: 1px solid var(--ca-text-ink);
  border-radius: 0px;
  cursor: pointer;
  transition: all var(--ca-duration) var(--ca-ease-editorial);
}

.btn-crown-outline:hover {
  background-color: var(--ca-text-ink);
  color: #FFFFFF;
}

/* Card Minimalist Styling */
.ca-product-card {
  background-color: var(--ca-bg-linen);
  transition: transform var(--ca-duration) var(--ca-ease-editorial);
}

.ca-product-card:hover {
  transform: translateY(-3px);
}
```

---

## SO SÁNH NHANH: MOROCCANOIL VS. CROWN AFFAIR

| Tiêu chí | Moroccanoil Design System (`design.md`) | Crown Affair Design System (`crownaffair_design.md`) |
|---|---|---|
| **Định vị & Phong cách** | Salon-Professional Luxury, Rực rỡ, Địa Trung Hải. | **Quiet Luxury, Slow Beauty, Art Editorial, Thiền định.** |
| **Màu sắc Chủ đạo** | Xanh ngọc lam `#0CBCBF` & Cam Argan `#F58227`. | **Trắng kem giấy mộc `#F9F8F6`, Đen mực `#111111` & Xanh Sage `#C2D6C8`.** |
| **Nền Canvas** | Trắng tinh khiết `#FFFFFF` sáng bóng. | **Kem mộc hữu cơ `#F9F8F6` tạo cảm giác trang sách.** |
| **Cách đặt tên SP** | Theo công dụng: *Hydrating Shampoo, Moisture Repair Mask*. | **Theo định danh thủ công: *The Oil, The Shampoo, The Renewal Mask*.** |
| **Tư vấn Liệu trình** | *Hair Routine Quiz* (Khắc phục hư tổn, salon cấp tốc). | ***The Hair Ritual* (Nâng niu nghi thức sống chậm hàng ngày).** |
| **Cảm giác Mang lại** | Sang trọng, năng động, chuẩn salon tóc Hollywood. | **Tĩnh lặng, nghệ thuật, tinh tế như một bảo tàng New York.** |

