# Thử nghiệm dự báo trên 59 SKU đã mapping HairCare

## Mục tiêu

Chạy thử nghiệm fixed-origin của Plan B với danh sách SKU lấy trực tiếp từ `data/ml/processed/haircare_demo_product_mapping.csv`, đồng thời gắn `product_id`, `product_name` và `category` mô phỏng vào các kết quả. Kết quả forecast của Plan B nằm trong `B_Plan/mapped_59_skus`; các kết quả của Plan A và dữ liệu dùng chung được lưu riêng.

## Xác nhận dữ liệu và mapping

- Mapping có 59 `StockCode` duy nhất; danh sách SKU và thứ tự theo `source_sku_rank` trùng chính xác với danh sách 59 SKU do script Claude gốc chọn theo số hóa đơn.
- Tập giao dịch đã làm sạch gồm 1.019.654 dòng; trong đó có 126.981 dòng thuộc 59 SKU được mapping.
- Phần dữ liệu được dự báo có 1.721.039 đơn vị bán, doanh thu nguồn £3.626.460,44 và 29.001 hóa đơn có chứa các SKU này.
- Đối soát tuần cho doanh thu và số lượng khớp với tổng panel giao dịch; không có giá trị thiếu trong kết quả dự báo, không có nhãn mapping bị thiếu.
- Doanh thu vẫn là doanh thu nguồn tính theo GBP. Tên và danh mục HairCare là nhãn mô phỏng gắn với SKU, không phải mô tả hàng hóa thật của giao dịch.

Các số đối soát đầy đủ nằm trong [mapping_data_audit.csv](./mapping_data_audit.csv), và crosswalk được dùng nằm trong [mapping_crosswalk_used.csv](./mapping_crosswalk_used.csv).

## Thiết lập dự báo

- Panel tuần kết thúc Chủ nhật, từ 06/12/2009 đến 04/12/2011. Tuần kết thúc 11/12/2011 không đưa vào vì dữ liệu nguồn chỉ đến 09/12/2011 và tuần đó chưa đầy đủ.
- Có 8 mốc dự báo hàng tuần từ 14/08/2011 đến 02/10/2011; mỗi mốc dự báo 9 tuần tiếp theo.
- Chạy trên cả doanh thu và số lượng, với 6 phương án A–F trong script fixed-origin Claude: baseline LightGBM, Tweedie, ratio-to-level, ratio có chỉ số năm trước, trung bình 13 tuần gần nhất và trung bình A/C.
- Target tỷ lệ ở mô hình C và D được giới hạn trong [0, 15], giống script fixed-origin gốc.
- Các chỉ số trong bảng “trung bình 8 mốc” là trung bình số học của WAPE/bias từng mốc, không phải một lần gộp toàn bộ dự báo.

## Kết quả trung bình qua 8 mốc

WAPE và bias dưới đây được thể hiện theo phần trăm. WAPE SKU-tuần đo sai số tuyệt đối trên từng cặp SKU-tuần; WAPE tổng-tuần trước hết cộng 59 SKU thành tổng panel theo tuần rồi đo sai số. Bias âm nghĩa là dự báo thấp hơn thực tế.

### Doanh thu

| Mô hình | WAPE SKU-tuần | WAPE tổng-tuần | Bias |
|---|---:|---:|---:|
| B — Tweedie | **51,82%** | 24,66% | -17,81% |
| A — Baseline | 52,77% | 23,78% | -15,00% |
| E — Trung bình 13 tuần | 52,88% | **23,27%** | -21,07% |
| F — Trung bình A/C | 54,20% | 23,48% | -5,05% |
| C — Ratio-to-level | 61,92% | 25,49% | +4,90% |
| D — Ratio + chỉ số năm trước | 67,20% | 31,03% | +18,40% |

### Số lượng

| Mô hình | WAPE SKU-tuần | WAPE tổng-tuần | Bias |
|---|---:|---:|---:|
| E — Trung bình 13 tuần | **51,15%** | **21,19%** | -17,11% |
| B — Tweedie | 53,59% | 23,74% | -12,50% |
| A — Baseline | 54,55% | 23,58% | -9,68% |
| F — Trung bình A/C | 56,06% | 23,71% | -2,56% |
| C — Ratio-to-level | 62,84% | 25,40% | +4,57% |
| D — Ratio + chỉ số năm trước | 68,53% | 32,45% | +21,08% |

## Mốc cuối 02/10/2011

Đây là mốc cuối cùng, dự báo 9 tuần tiếp theo (gồm giai đoạn bán hàng cuối năm):

- **Doanh thu, tổng panel theo tuần:** D đạt WAPE 14,78%; C đạt 14,94%. Tuy nhiên, theo SKU-tuần, F tốt nhất trong các phương án được thử (WAPE 49,58%).
- **Số lượng, tổng panel theo tuần:** C đạt WAPE 17,12%; D đạt 21,12%; F đạt 22,62%. Theo SKU-tuần, A tốt nhất với 48,05%.
- Kết quả ở mốc cuối tốt hơn đáng kể so với trung bình 8 mốc khi nhìn tổng panel, nhưng sai số từng SKU vẫn cao. Không nên lấy riêng mốc cuối để kết luận mô hình ổn định hoặc đã dự báo chính xác từng sản phẩm.

Kết quả từng mốc và từng SKU nằm trong [fixed_origin_predictions.csv](./fixed_origin_predictions.csv); bảng metric chi tiết trong [fixed_origin_summary.csv](./fixed_origin_summary.csv). Các bảng tổng hợp theo mốc nằm trong [robustness_across_origins_revenue.csv](./robustness_across_origins_revenue.csv) và [robustness_across_origins_quantity.csv](./robustness_across_origins_quantity.csv).

## So với file Claude cũ và cách diễn giải

Đây là lần chạy mới của thử nghiệm fixed-origin, tách biệt với kết quả Plan A. SKU set và thứ tự sản phẩm khớp với danh sách trong script fixed-origin ban đầu. Với doanh thu, các bảng robustness mới nhìn chung bám sát kết quả fixed-origin trước đó, với một số chênh lệch nhỏ giữa các lần chạy; không có bảng robustness số lượng tương ứng trong các kết quả cũ để đối chiếu trực tiếp. Không xem các chênh lệch nhỏ là cải thiện mô hình: phần thay đổi chính của đợt này là dùng mapping làm crosswalk chính thức và bổ sung tên nhãn mô phỏng vào đầu ra.

Kết luận mô hình cũng không cho thấy một phương án thắng trên mọi tiêu chí: B tốt nhất theo WAPE SKU-tuần doanh thu; E tốt nhất theo WAPE tổng-tuần doanh thu và cả hai tiêu chí số lượng. Sai số SKU-tuần vẫn khoảng 51–69% tùy target/mô hình, nên thử nghiệm này chưa giải quyết được độ chính xác thấp ở cấp SKU.

## Ngày bất thường và nhãn sản phẩm

[anomaly_top_skus_with_haircare_labels.csv](./anomaly_top_skus_with_haircare_labels.csv) nối 5 SKU có doanh thu cao nhất trong từng ngày bất thường với nhãn mapping, mô tả nguồn, số lượng, doanh thu và số hóa đơn. File có 50 dòng cho 10 ngày bất thường. Dùng `StockCode` và `source_description` để tra cứu ngữ cảnh hàng hóa gốc; không diễn giải `product_name_simulated` hoặc `category_simulated` như bằng chứng giao dịch thật là HairCare.

## Tệp trong thư mục kết quả

- `run_mapped_forecast.py` — script tái chạy, đọc mapping và dữ liệu nguồn, kiểm tra đầu vào, tạo dự báo và các bảng audit.
- `mapping_data_audit.csv` — đối soát dữ liệu/map.
- `mapping_crosswalk_used.csv` — crosswalk 59 SKU được dùng.
- `mapped_monthly_activity_by_haircare_label.csv` — tổng hợp tháng có gắn nhãn mô phỏng.
- `fixed_origin_predictions.csv` — dự báo chi tiết theo SKU, tuần, target, origin và mô hình.
- `fixed_origin_summary.csv` — WAPE/bias theo mô hình và origin.
- `robustness_across_origins_revenue.csv`, `robustness_across_origins_quantity.csv` — tổng hợp metric qua 8 mốc.
- `anomaly_top_skus_with_haircare_labels.csv` — SKU nổi bật theo ngày bất thường, có nhãn mô phỏng.
