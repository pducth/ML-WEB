# FOLMARÉ — Logo Kit (giữ đúng hình đã duyệt)

Bộ này lấy **trực tiếp từ 5 hình logo bạn vừa thấy**, không dựng lại kiểu F, không trace thành hình vector khác và không thay đổi cấu trúc logo.

## Thư mục
- `01_primary` — logo đứng (F + FOLMARÉ + tagline)
- `02_horizontal` — logo ngang
- `03_wordmark` — chữ FOLMARÉ
- `04_monogram` — biểu tượng F có ngôi sao
- `05_app_icon` — icon gradient xanh–coral
- `06_favicon` — favicon kích thước 16 → 1024px và favicon.ico
- `07_source_originals` — 5 ảnh PNG gốc **giữ nguyên 100% pixel** để đối chiếu
- `08_preview` — bảng xem trước trên nền sáng/tối

## Dùng trên web
- Nên dùng logo ngang WebP/PNG trong header, wordmark cho các khối typography.
- Dùng các file *dark* trên nền sáng; *white* trên nền tối.
- Dùng app icon cho tab/app/favicon.
- Các file PNG và WebP có alpha nền trong suốt (riêng app icon có hình vuông bo góc màu nền trong chính icon).

## Lưu ý quan trọng
Đây là ảnh **raster gốc**, không phải SVG vector. SVG tự trace từ ảnh trước từng cho kết quả xấu/khác mẫu. Để giữ logo **y hệt**, bản này chủ ý không tự chế vector giả. Nếu cần vector gốc chuẩn tuyệt đối, phải dựng Bézier thủ công theo mẫu dưới sự duyệt lại.
