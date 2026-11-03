# Báo cáo phân tích: dự báo doanh thu trên Online Retail II

Ngày thực hiện: 27/10/2026. Phạm vi: dataset UCI Online Retail II, panel 59 SKU mô phỏng nhãn HairCare của nhóm.

> Lưu ý chung: toàn bộ kết quả là trên **panel retail mô phỏng 59 SKU**, không phải độ chính xác trên thị trường HairCare. Nhóm chưa có dữ liệu bán hàng HairCare thật.

---

## 1. Tóm tắt

1. Sai số dự báo theo **từng SKU từng tuần** có một "sàn" khoảng 40% (WAPE). Các cách chỉnh mô hình (log, Tweedie, tách đơn lớn, thêm feature mùa vụ, kết hợp mô hình) chỉ giảm thêm khoảng **2–3 điểm**.
2. Sai số **tổng cả panel theo tuần** thấp hơn nhiều (khoảng **16–18%**), nên dự báo ở mức tổng/nhóm hàng rồi phân bổ xuống SKU là hướng hợp lý hơn.
3. Hiện tượng "dự báo thấp hơn thực tế" trong biểu đồ holdout của nhóm tái hiện được (khoảng −31% doanh thu ở mốc 02/10/2011), nhưng **không ổn định**: qua 8 mốc dự báo khác nhau, độ lệch dao động từ −36% đến +12%. Cách "dự báo tỷ lệ so với mức nền" không sửa được ổn định.
4. Các ngày bất thường chủ yếu do **đơn số lượng lớn** (dòng ≥100 cái), không phải đơn xuất khẩu. Nguyên nhân cụ thể từng ngày **chưa thể xác nhận** vì file không có CustomerID.
5. Có hai vấn đề dữ liệu ảnh hưởng đến đánh giá: **ngày cuối (09/12/2011) chỉ là nửa ngày**, và cửa hàng **nghỉ cuối năm** (khoảng 24/12–03/01).

---

## 2. Dataset Online Retail II (thông tin từ UCI)

- Nguồn: Daqing Chen, UCI (ID 502), DOI 10.24432/C5CG6D, giấy phép CC BY 4.0 (cần ghi nguồn).
- Nội dung: toàn bộ giao dịch của một doanh nghiệp bán lẻ online đăng ký tại Anh, không có cửa hàng, từ 01/12/2009 đến 09/12/2011. Chủ yếu bán đồ quà tặng độc đáo cho mọi dịp; nhiều khách hàng là nhà bán buôn.
- Quy mô: 1.067.371 dòng, 8 cột: InvoiceNo (bắt đầu bằng "C" là hóa đơn hủy), StockCode, Description, Quantity, InvoiceDate, UnitPrice (£), CustomerID, Country.
- Theo bản trên OpenML: 243.007 dòng thiếu CustomerID (khoảng 22,8%).
- Không có trường khuyến mãi, tồn kho, sự kiện hay phân khúc khách.
- Mục đích gốc của dataset: phân khúc khách hàng theo RFM và dự báo lợi nhuận khách hàng, không phải dự báo doanh số theo SKU.

---

## 3. Dữ liệu đầu vào của nhóm và những gì đã kiểm tra

Các file nhóm cung cấp: ghi chú bối cảnh bất thường, tài liệu kết quả mô hình, các CSV kết quả benchmark tuần, các CSV khuyến nghị tồn kho, hai bảng kiểm tra doanh thu, và `retail_transactions_cleaned.csv.gz` (1.019.654 dòng sau làm sạch).

**Dựng lại panel 59 SKU.** File cleaned không kèm file ánh xạ SKU, nên mình tìm quy tắc chọn: *59 StockCode có nhiều hóa đơn khác nhau nhất, sau khi loại các SKU dịch vụ/điều chỉnh (cờ `description_is_service_or_adjustment`)*. Kiểm tra:

| Chỉ tiêu | Dựng lại | File của nhóm |
|---|---:|---:|
| Số dòng giao dịch | 126.981 | 126.981 |
| Tổng số lượng | 1.721.039 | 1.721.039 |
| Tổng doanh thu | £3.626.460,44 | £3.626.460,44 |
| Doanh thu/số lượng/số hóa đơn theo tháng | khớp tuyệt đối với `mapped_monthly_activity_audit.csv` | |

10 ngày bất thường (robust z ≥ 3,5) cũng khớp danh sách của nhóm.

**Hạn chế của file cleaned:** không có CustomerID; hóa đơn hủy đã bị loại; không có file ánh xạ SKU.

---

## 4. Phân tích các ngày bất thường

### 4.1 Kết quả chính

- Dòng có số lượng ≥100 chỉ chiếm **2,9% số dòng** nhưng **26,8% doanh thu** panel.
- Trong 10 ngày bất thường, **8 ngày** có 59–80% doanh thu đến từ các dòng ≥100 cái. Hai ngày còn lại là 25/11/2010 (24%) và 29/03/2011 (43%), nơi doanh thu phân tán trên nhiều hóa đơn.
- Khách ở Anh chiếm **88–99%** doanh thu trong mọi ngày bị gắn cờ, nên không phải đơn xuất khẩu.
- Tháng 11 tăng so với tháng 10 là do **nhiều hóa đơn hơn** (2.062 so với 1.685 năm 2010; 1.992 so với 1.408 năm 2011), tỷ trọng đơn lớn gần như không đổi.

### 4.2 Bảng 10 ngày (đầy đủ trong `anomaly_days_investigation.csv`)

| Ngày | Doanh thu | Hóa đơn | Tỷ trọng từ dòng ≥100 cái | Hóa đơn lớn nhất | Tỷ trọng hóa đơn lớn nhất |
|---|---:|---:|---:|---|---:|
| 2010-06-07 | £18.712 | 78 | 64% | 511164 (£3.610,50) | 19% |
| 2010-11-11 | £19.588 | 93 | 59% | 532358 (£4.176,00) | 21% |
| 2010-11-15 | £21.947 | 76 | 64% | 533027 (£11.916,15) | 54% |
| 2010-11-25 | £14.756 | 118 | 24% | 535228 (£1.275,00) | 9% |
| 2011-01-11 | £27.550 | 40 | 80% | 540689 (£12.797,52) | 46% |
| 2011-03-29 | £17.543 | 48 | 43% | 548203 (£6.493,30) | 37% |
| 2011-08-04 | £18.168 | 64 | 64% | 562439 (£6.379,20) | 35% |
| 2011-09-20 | £21.350 | 59 | 72% | 567381 (£4.651,20) | 22% |
| 2011-11-03 | £17.548 | 67 | 74% | 574293 (£5.733,98) | 33% |
| 2011-11-14 | £20.541 | 75 | 64% | 576365 (£9.192,50) | 45% |

### 4.3 Các điểm đáng chú ý

- **07/06/2010:** hai hóa đơn 511164 và 511176 có nội dung giống hệt (3 dòng lunch bag, mỗi dòng 830 cái, cùng giá £1,45, lập cách nhau 7 phút), chiếm 38,6% doanh thu ngày đó. Không đủ dữ liệu để kết luận là đơn lặp thật hay nhập trùng.
- **15/11/2010:** hóa đơn 533027 gồm 9 mặt hàng, mỗi mặt hàng 119–902 cái (có paper chain Giáng sinh 835 cái và popcorn holder 902 cái). Giống giỏ hàng của người mua sỉ, nhưng không xác nhận được.
- **Mức Giáng sinh khác nhau rất nhiều theo SKU** (tỷ trọng số lượng Q4 trong năm 2010): paper chain 85%, hot water bottle 66–73%, popcorn holder 52%; SKU trung vị chỉ 27%.
- **Giá trung bình mỗi đơn vị tăng vào Q4** (£2,28 tháng 11 và £2,63 tháng 12/2010, so với khoảng £1,9–2,1 các tháng khác), do thay đổi cơ cấu hàng. Doanh thu không chỉ là số lượng nhân giá không đổi.
- Có SKU thay đổi giá trong kỳ (ví dụ một số túi jumbo từ £1,95 lên £2,08 từ 04/2011).

### 4.4 Chưa xác nhận được

Nguyên nhân từng ngày (khách buôn, khuyến mãi, ngày lễ, đơn lặp) **chưa được xác minh**. Cần CustomerID và hóa đơn hủy từ file gốc UCI để kiểm tra.

---

## 5. Vấn đề chất lượng dữ liệu ảnh hưởng đến đánh giá

| Vấn đề | Bằng chứng | Ảnh hưởng |
|---|---|---|
| Ngày cuối là nửa ngày | Giao dịch cuối cùng lúc 12:50 thứ Sáu 09/12/2011; doanh thu ngày đó £4.677 (các thứ Sáu thường khoảng gấp đôi) | Điểm cuối của biểu đồ holdout bị thấp giả; tuần kết thúc 11/12/2011 không đầy đủ |
| Cửa hàng nghỉ cuối năm | Doanh thu bằng 0 từ khoảng 24/12/2010 đến 03/01/2011 | Dự báo tuần 25/12 cần xử lý riêng |
| Gần như không bán thứ Bảy | 99% thứ Bảy có doanh thu 0 | Cấu trúc lịch, không phải nhiễu |
| Tuần đầu không đủ | Dữ liệu bắt đầu thứ Ba 01/12/2009, thiếu thứ Hai 30/11 | Ảnh hưởng nhỏ |

Trong các thử nghiệm dưới đây, tuần cuối (kết thúc 11/12/2011) đã được loại bỏ.

---

## 6. Thử nghiệm mô hình

### 6.1 Thiết kế

Đây là **bản tự dựng lại** theo thiết kế tương tự benchmark của nhóm, không phải script gốc `model_experiments.py` (mình không có file đó).

- Đơn vị: SKU × tuần (tuần kết thúc Chủ nhật), 59 SKU, hai mục tiêu: `quantity_sold` và `revenue_gbp`.
- Đặc trưng nền: lag 1, 2, 4, 8, 13, 26, 52 tuần; trung bình trượt 4, 8, 13 tuần; trung bình tích lũy; mã SKU; tuần trong năm; tháng.
- Đặc trưng mở rộng: số tuần đến Giáng sinh; tổng panel (lag, trung bình 4 và 13 tuần, cùng kỳ năm trước); số hóa đơn gần đây của từng SKU.
- Mô hình: LightGBM (250 cây, learning rate 0,05, 15 lá).

### 6.2 Thử nghiệm A: dự báo 1 tuần, cập nhật mỗi tuần (rolling-origin)

Mỗi tuần mục tiêu, mô hình được huấn luyện lại chỉ trên dữ liệu trước tuần đó. Ba khối đánh giá, tổng 48 tuần:

- Q4 2011: 9 tuần kết thúc 09/10 đến 04/12/2011.
- Q4 2010: 9 tuần (chưa có mùa Giáng sinh năm trước để học).
- Giữa 2011: 30 tuần kết thúc 06/03 đến 25/09/2011.

Các biến thể: Seasonal Naive (lag 1), trung bình 4 tuần, LightGBM thô, LightGBM log1p, Tweedie, dự báo tỷ lệ so với mức nền 13 tuần (ratio), có/không đặc trưng mở rộng, bù hệ số Duan cho mô hình log, tách đơn lớn (decomposition: nền + đơn ≥100 cái), và hai kiểu kết hợp trung bình.

**Kết quả gộp 48 tuần, doanh thu** (đầy đủ trong `rolling_one_step_pooled_48_weeks.csv`):

| Mô hình | WAPE theo SKU-tuần | Độ lệch | WAPE tổng theo tuần |
|---|---:|---:|---:|
| Seasonal Naive (lag 1) | 49,8% | −3,4% | 20,8% |
| Trung bình 4 tuần | 44,0% | −7,2% | 20,1% |
| LightGBM thô, đặc trưng nền (tham chiếu) | 44,1% | −1,8% | 17,9% |
| LightGBM log1p | 42,6% | −17,7% | 22,4% |
| LightGBM Tweedie | 42,3% | −7,1% | 18,2% |
| LightGBM ratio | 44,2% | −0,2% | 17,7% |
| LightGBM thô, đặc trưng mở rộng | 44,7% | +2,1% | 16,9% |
| log1p mở rộng + bù Duan | 44,6% | +4,3% | 17,3% |
| Tweedie mở rộng | 42,3% | −4,0% | 17,0% |
| Tách đơn lớn (decomposition) | 43,4% | +0,2% | 18,1% |
| Kết hợp 4 mô hình (ens4) | 41,9% | −1,3% | 16,1% |
| Kết hợp 4 mô hình cây (ens_trees) | 42,3% | −2,7% | 16,2% |

**Số lượng:** hướng tương tự; WAPE theo SKU từ 48,0% (tham chiếu) xuống khoảng 45–46% với Tweedie, kết hợp hoặc log+bù; Seasonal Naive 56,3%; WAPE tổng khoảng 18–19% cho các mô hình tốt.

**Kiểm định độ tin cậy:** bootstrap theo tuần (2.000 lần) cho chênh lệch WAPE so với tham chiếu. Với doanh thu, Tweedie (−1,8 điểm), log mở rộng (−2,7 điểm) và kết hợp (−1,8 đến −2,2 điểm) có khoảng tin cậy 90% không chứa 0. LightGBM ratio, đặc trưng mở rộng thô, và decomposition **không** khác tham chiếu có ý nghĩa.

**Lưu ý:** mô hình log có WAPE tốt nhưng **lệch thấp 16–18%** (log hướng về trung vị). Khi cần tổng doanh thu, nên bù hệ số hoặc dùng Tweedie. Mô hình ens4 được chọn sau khi đã xem kết quả, nên có thể hơi lạc quan.

### 6.3 Thử nghiệm B: dự báo cố định mốc, 9 tuần phía trước

Mô phỏng tình huống trong biểu đồ của nhóm (holdout cố định vài tuần). Mô hình huấn luyện đến một mốc, rồi dự báo 9 tuần tiếp theo chỉ từ thông tin có tại mốc. Dữ liệu thực nghiệm: `ratio_fix_fixed_origin.py`.

Phương pháp: A (đặc trưng mức nền), B (Tweedie), C (ratio so với mức nền 13 tuần), D (ratio + chỉ số mùa vụ năm trước), E (trung bình 13 tuần), F (trung bình của A và C).

**Ở mốc 02/10/2011** (holdout giống biểu đồ của nhóm), doanh thu:

| Mô hình | Độ lệch | WAPE tổng theo tuần |
|---|---:|---:|
| A. đặc trưng mức nền | −30,8% | 31,0% |
| B. Tweedie | −32,7% | 32,7% |
| C. ratio | −7,6% | 14,9% |
| D. ratio + mùa vụ năm trước | −6,3% | 14,8% |
| E. trung bình 13 tuần | −27,0% | 28,7% |

Kết quả này cho thấy dự báo thấp khoảng 30% giống biểu đồ, và cách ratio có vẻ sửa được. **Nhưng đây chỉ đúng ở mốc này.**

**Kiểm tra độ bền qua 8 mốc hàng tuần (14/08 đến 02/10/2011), doanh thu:**

| Mô hình | Độ lệch nhỏ nhất | Trung vị | Lớn nhất | |lệch| trung bình | WAPE tổng | WAPE SKU |
|---|---:|---:|---:|---:|---:|---:|
| A. đặc trưng mức nền | −36,4% | −17,6% | +12,1% | 18,1% | 23,9% | 53,0% |
| B. Tweedie | −36,9% | −21,0% | +5,4% | 19,2% | 24,7% | 51,9% |
| C. ratio | −25,8% | +2,9% | +65,2% | 16,4% | 25,5% | 61,9% |
| D. ratio + mùa vụ | −10,4% | +10,5% | +72,0% | 24,3% | 30,6% | 67,4% |
| E. trung bình 13 tuần | −30,1% | −22,7% | −10,7% | 21,1% | 23,3% | 52,9% |
| F. trung bình A và C | −31,1% | −8,6% | +38,7% | 15,3% | 23,5% | 54,3% |

**Kết luận thử nghiệm B:** không phương pháp nào sửa độ lệch ổn định. Cách ratio có độ lệch trung vị gần 0 nhưng có mốc lệch +65%. Cách này cũng làm WAPE theo SKU xấu hơn (khoảng 62% so với 53%). Lý do có khả năng là dữ liệu chỉ có **một mùa Giáng sinh trước đó** (2010) để học mức tăng mùa vụ, và năm 2011 yếu hơn 2010 (panel Jan–Nov 2011 thấp hơn cùng kỳ 4,7%; Q4 thấp hơn 10–20%). Đây là suy luận, chưa kiểm chứng riêng.

Khi cập nhật hàng tuần (Thử nghiệm A), độ lệch Q4 2011 nhỏ (khoảng −1% đến +9%). Vậy dự báo ngắn hạn cập nhật thường xuyên ổn định hơn dự báo cố định mốc nhiều tuần.

---

## 7. Đính chính các nhận định ở phản hồi trước

| Nhận định trước đó | Sau khi có dữ liệu |
|---|---|
| Có thể kiểm tra khách hàng/quốc gia các ngày bất thường | File không có CustomerID; chỉ phân tích được quốc gia, kích thước hóa đơn, giá |
| Q4 2011 là giai đoạn cao nhất chuỗi, cây không ngoại suy được | Panel 2011 thấp hơn 2010; không phải do tăng trưởng vượt vùng đã thấy |
| Thêm Croston/SBA làm baseline | Ở mức tuần chỉ 2,2% ô SKU-tuần bằng 0; ít giá trị. Gián đoạn chỉ nặng ở mức ngày (28,75% bằng 0) |
| Dự báo tỷ lệ so với mức nền + feature tuần đến Giáng sinh sẽ giảm lệch Q4 | Kiểm tra qua 8 mốc: không ổn định (xem 6.3) |
| Tách đơn lớn rồi dự báo riêng sẽ giảm sai số | Không khác tham chiếu có ý nghĩa thống kê (43,4% so với 44,1%) |

---

## 8. Hạn chế

1. Panel mô phỏng 59 SKU; không đại diện doanh số HairCare.
2. Danh sách 59 SKU được chọn theo số hóa đơn trên **toàn bộ** giai đoạn (gồm cả holdout), có thể gây thiên lệch nhẹ.
3. Mỗi khối đánh giá chỉ khoảng 9 tuần; thử nghiệm B chỉ có một mùa Giáng sinh để học.
4. Đây là bản dựng lại độc lập; kết quả không so trực tiếp từng số với `weekly_model_comparison.csv` của nhóm vì chưa có script gốc và cách chia fold khác.
5. Mình chưa có code mô hình ngày của nhóm, nên không biết chính xác vì sao mô hình ngày thiên thấp.
6. Không có CustomerID, hóa đơn hủy, khuyến mãi hay tồn kho, nên nguyên nhân các ngày bất thường chỉ là giả thuyết.

---

## 9. Việc nên làm tiếp

1. Báo cáo dự báo nhiều tuần kèm khoảng dao động, không chỉ một đường.
2. Chạy lại mốc 02/10/2011 với dữ liệu và script của nhóm để đối chiếu mô hình ngày.
3. Loại ngày 09/12/2011 (nửa ngày) và tuần 11/12 khỏi holdout.
4. Kiểm tra thủ công hai hóa đơn trùng 07/06/2010 và hóa đơn 533027 (15/11/2010) với dữ liệu gốc có CustomerID.
5. Báo cáo song song WAPE theo SKU và WAPE theo tổng.
6. Dự báo ở mức tổng/nhóm hàng theo tuần rồi phân bổ xuống SKU.
7. Xử lý riêng tuần nghỉ cuối năm (khoảng 24/12 đến 03/01).
8. Nếu muốn dùng log, bù hệ số hoặc dùng Tweedie để tránh dự báo thấp có hệ thống.

---

## 10. Danh sách file

| File | Nội dung |
|---|---|
| `ratio_fix_fixed_origin.py` | Script thử nghiệm B; chạy ~20 giây: `python3 ratio_fix_fixed_origin.py retail_transactions_cleaned.csv.gz out_dir` (cần pandas, numpy, lightgbm) |
| `anomaly_days_investigation.csv` | Bảng điều tra 10 ngày bất thường |
| `rolling_one_step_pooled_48_weeks.csv` | Kết quả thử nghiệm A gộp 48 tuần, kèm khoảng tin cậy bootstrap |
| `robustness_across_origins_revenue.csv` | Độ bền của thử nghiệm B qua 8 mốc (doanh thu) |

Script thử nghiệm A (huấn luyện lại hàng tuần, khoảng 12 phút) chưa được đóng gói thành file độc lập; có thể bổ sung nếu nhóm cần.

## Nguồn tham khảo

- Online Retail II, UCI Machine Learning Repository: https://archive.ics.uci.edu/dataset/502/online+retail+ii
- Online-Retail-II-UCI, OpenML: https://api.openml.org/d/43368
- Hierarchical Forecasting at Scale (arXiv): https://arxiv.org/pdf/2310.12809
- Cross-Temporal Forecast Reconciliation at Digital Platforms (arXiv): https://arxiv.org/pdf/2402.09033
