# Tài liệu xử lý dữ liệu demo HairCare Insight

Tài liệu này giải thích nguồn dữ liệu, các bước xử lý, cách đọc những file đầu ra và giới hạn cần trình bày khi dùng dữ liệu cho đồ án. Mục tiêu là để các thành viên có thể hiểu và tiếp tục pipeline mà không nhầm dữ liệu mô phỏng với doanh số HairCare thật.

## 1. Mục tiêu và nguyên tắc quan trọng

Đồ án có hai luồng dữ liệu riêng:

| Luồng | Dùng cho | Nguồn chính | Tiền tệ |
|---|---|---|---|
| Catalog Web | Hiển thị sản phẩm trên giao diện thương mại điện tử HairCare | `products_crawl.csv` | USD |
| Dữ liệu ML | Thử nghiệm xử lý chuỗi thời gian, dự báo số lượng/doanh thu và minh họa gợi ý tồn kho | Online Retail II | GBP |

**Không lấy giá USD từ catalog HairCare để tính doanh thu ML.** Giá, số lượng và doanh thu ML phải xuất phát từ giao dịch Online Retail II. Tên sản phẩm HairCare trong dữ liệu ML chỉ là nhãn giả lập gắn với SKU nguồn để giao diện demo dễ hiểu; không có nghĩa là giao dịch nguồn thực sự bán sản phẩm HairCare.

Pipeline dữ liệu sạch hiện sử dụng **6 danh mục**: `shampoo`, `hairmask`, `treatment`, `dry shampoo`, `conditioner`, `hairstyling`. Các file nguồn raw được giữ nguyên; trong các output sạch, nhãn `oil`, `serum` và nguồn crawl `Treatment / Oil` được gộp thành `treatment`. Tài liệu cũ có thể còn nhắc taxonomy 7 hoặc 8 nhóm; các con số đó không còn mô tả pipeline hiện tại.

Pipeline làm sạch và tạo dữ liệu bàn giao có thể chạy lại bằng [`prepare_haircare_demo.py`](./prepare_haircare_demo.py). Script không sửa raw; các kết quả được ghi vào [`../processed/`](../processed/). Notebook [`data_preparation_haircare_demo.ipynb`](./data_preparation_haircare_demo.ipynb) là notebook xử lý/khám phá được tạo trước script; để tái tạo đúng bộ audit và báo cáo mới nhất, hãy chạy script làm nguồn chuẩn.

## 2. Các nguồn dữ liệu và vai trò

### 2.1. `products_crawl.csv` — catalog dùng cho Web

- Có 59 sản phẩm; trạng thái crawl gốc là 58 available và 1 unavailable.
- Tất cả giá trong file có đơn vị USD.
- Tên, mã sản phẩm, giá và thông tin catalog được làm sạch để dùng cho luồng Web demo.
- Vì website đồ án giả lập tất cả sản phẩm đều có hàng, đầu ra đặt `availability=true` cho cả 59 sản phẩm; `source_availability` giữ trạng thái crawl gốc để truy vết. Trạng thái này là giả định demo, không phải tồn kho thực.

### 2.2. Online Retail II — giao dịch dùng cho ML

- Workbook nằm trong `online+retail+ii (1)/online_retail_II.xlsx`, gồm dữ liệu giao dịch ở hai sheet/năm.
- `Quantity` và `Price` là số liệu nguồn; giá được giữ theo tiền tệ của dataset là GBP.
- Sau các bước lọc và loại giao dịch không hợp lệ, có **1.019.654 dòng bán hợp lệ**.
- Đây là dữ liệu bán lẻ tổng hợp, không phải dữ liệu ngành hàng chăm sóc tóc.

### 2.3. E-commerce cosmetic dataset — dữ liệu tham khảo riêng

Dữ liệu hair từ `ecomcosmetic/E-commerce  cosmetic dataset.csv` được làm sạch và xuất riêng thành 1.420 listing tham khảo. Đơn vị giá của nguồn này chưa được xác nhận nên **không trộn giá từ file này vào catalog USD hoặc phép tính doanh thu ML**.

## 3. Quy trình xử lý

### Bước 1 — Chuẩn hóa catalog Web và taxonomy

Catalog crawl được kiểm tra các trường cần thiết, chuẩn hóa văn bản/giá và phân loại sản phẩm về 6 danh mục:

| Category trong dữ liệu xử lý | Quy tắc từ taxonomy crawl |
|---|---|
| `shampoo` | `Shampoo` |
| `hairmask` | `Hair Masks` |
| `treatment` | `Treatment / Oil` và các sản phẩm `Styling & Finishing` có chữ “serum” trong tên |
| `dry shampoo` | `Dry Shampoo` |
| `conditioner` | `Conditioner` |
| `hairstyling` | Các sản phẩm `Styling & Finishing` còn lại |

Đối với cosmetic reference, các `subcategory` nguồn `oil` và `serum` được đưa vào `suggested_haircare_category=treatment`; `subcategory` gốc vẫn được giữ để truy vết. Giá catalog được giữ ở `price_usd`; không dùng giá này để thay thế `Price` của giao dịch Online Retail II.

### Bước 2 — Làm sạch giao dịch Online Retail II

Script kết hợp dữ liệu hai sheet rồi loại các nhóm dữ liệu không phù hợp để tính bán hàng:

1. Loại phần invoice bị lặp giữa các sheet/năm, nhưng chỉ sau khi đối chiếu chữ ký toàn bộ các dòng của từng invoice giữa hai sheet. Nếu cùng invoice có nội dung khác nhau, pipeline dừng bằng lỗi thay vì âm thầm loại.
2. Loại invoice hủy (mã invoice hủy thường bắt đầu bằng `C`).
3. Loại dòng có `Quantity` thiếu/không dương, `Price` thiếu/không dương, ngày không hợp lệ hoặc SKU thiếu.
4. Tính doanh thu nguồn từ `Quantity × Price`, giữ GBP.
5. Không đưa Customer ID vào file giao dịch đã xuất; bảng ML không cần định danh khách hàng.

Lý do loại trừ trong báo cáo là mutually exclusive theo thứ tự: invoice hủy > quantity > price > date > SKU. Như vậy có thể cộng để đối soát số dòng, nhưng thứ tự ưu tiên có nghĩa một dòng có nhiều lỗi chỉ được tính vào lý do đầu tiên.

**Không loại exact duplicate nội bộ sheet một cách tự động.** Không có transaction-line ID để chứng minh một dòng lặp là lỗi nhân bản thay vì hai dòng mua hợp lệ giống nhau. Pipeline báo cáo số dòng lặp nhưng giữ lại. Riêng invoice trùng giữa hai sheet bị loại khỏi sheet sau chỉ khi toàn bộ nội dung invoice khớp.

Kết quả làm sạch được ghi vào `retail_cleaning_report.csv`; chi tiết thiếu/trùng từng cột và khóa được ghi vào `data_quality_audit.csv`. Các điều kiện được định nghĩa trong script; sau khi thay đổi điều kiện, chạy lại script để đồng bộ tất cả đầu ra.

### Bước 3 — Tạo mapping giả lập giữa SKU nguồn và sản phẩm HairCare

Để demo nhiều chuỗi sản phẩm, cả 59 sản phẩm crawl được ghép một-một với 59 SKU nguồn. SKU nguồn được lựa chọn theo mức độ xuất hiện trong invoice; việc ghép được thực hiện theo thứ tự ổn định để có thể chạy lại nhất quán. Việc gán `availability=true` cho cả catalog chỉ phục vụ giao diện giả lập.

Mapping giữ thông tin truy vết như `StockCode`, mô tả gốc, số invoice/dòng nguồn và thông tin sản phẩm HairCare được gán. Mapping **không dựa trên sự tương đồng thực tế giữa mô tả sản phẩm nguồn và sản phẩm HairCare**. Ví dụ, một SKU nguồn mô tả đồ gia dụng vẫn có thể được gắn nhãn sản phẩm HairCare.

Phân bổ hiện tại:

| Danh mục | Số sản phẩm được map |
|---|---:|
| `shampoo` | 10 |
| `conditioner` | 8 |
| `hairmask` | 11 |
| `treatment` (gộp oil và serum) | 5 |
| `dry shampoo` | 2 |
| `hairstyling` | 23 |
| **Tổng** | **59** |

Đây là mapping nhãn phục vụ demo, không phải bằng chứng các sản phẩm HairCare này đã bán được số lượng ghi trong nguồn.

### Bước 4 — Tạo dữ liệu theo ngày cho ML

Các giao dịch của 59 SKU đã map được tổng hợp theo sản phẩm và ngày. Notebook tạo đủ tổ hợp ngày × sản phẩm trong khoảng dữ liệu, kể cả ngày không có giao dịch:

- `quantity_sold`: tổng Quantity nguồn trong ngày; bằng 0 nếu không có giao dịch.
- `revenue_gbp`: tổng `Quantity × Price` nguồn trong ngày; bằng 0 nếu không có giao dịch.
- `unit_price_gbp`: giá đơn vị bình quân từ giao dịch trong ngày; ngày không bán sẽ để trống.
- `is_zero_sale_day`: cờ nhận biết ngày không phát sinh bán.
- `outlier_source_lines`: số dòng giao dịch nguồn có Quantity lớn trong ngày.

Quantity lớn hơn 100 được **giữ nguyên và gắn cờ**, không cắt ngọn (cap) hay sửa giá trị. Cách làm này giữ nguyên dữ liệu mục tiêu gốc; nhóm có thể kiểm tra các ngoại lệ và quyết định cách xử lý trong một thí nghiệm ML riêng.

## 4. Các kết quả hiện tại đã kiểm tra

| Kiểm tra | Kết quả |
|---|---:|
| Sản phẩm crawl trong catalog | 59 |
| Danh mục chuẩn hóa | 6 |
| Trạng thái crawl gốc: available / unavailable | 58 / 1 |
| Sản phẩm available trong web demo | 59 (giả lập) |
| Sản phẩm được map / SKU nguồn không trùng | 59 / 59 |
| Ngày dữ liệu | 01/12/2009–09/12/2011 |
| Số ngày trong khoảng | 739 |
| Số dòng panel ngày × sản phẩm | 43.601 (= 59 × 739) |
| Giao dịch nguồn được map | 126.981 |
| Tổng số lượng trong panel | 1.721.039 |
| Tổng doanh thu nguồn trong panel | £3.626.460,44 |
| Dòng Quantity > 100 được giữ và gắn cờ | 1.805 |

Tổng số lượng và doanh thu trong panel đã được đối chiếu với tổng hợp trực tiếp từ giao dịch nguồn đã làm sạch cho toàn bộ 59 SKU được map. Không có cột USD trong file daily ML.

## 5. File đầu ra và cách dùng

| File | Nội dung | Dùng ở bước nào |
|---|---|---|
| `../processed/haircare_catalog_cleaned.csv` | Catalog Web 59 sản phẩm; `availability=true` giả lập, `source_availability` giữ trạng thái crawl gốc; có giá USD | Giao diện/luồng Web |
| `../processed/cosmetic_hair_reference_cleaned.csv` | Listing Hair tham khảo đã làm sạch; đơn vị giá chưa xác minh | Tham khảo, không đưa giá vào ML |
| `../processed/retail_transactions_cleaned.csv.gz` | Giao dịch nguồn hợp lệ sau làm sạch, còn StockCode, Quantity, Price và ngày | Truy vết, kiểm tra và tạo đặc trưng |
| `../processed/haircare_demo_product_mapping.csv` | 59 SKU nguồn ghép với product ID, tên và danh mục HairCare giả lập | Tra cứu mapping/nhãn |
| `../processed/haircare_demo_daily_sales.csv` | Panel ngày × 59 sản phẩm; target số lượng và doanh thu nguồn GBP | Đầu vào để thử nghiệm ML |
| `../processed/retail_cleaning_report.csv` | Số dòng trước/sau làm sạch và số dòng bị loại theo sheet | Kiểm toán bước làm sạch |
| `../processed/preparation_quality_report.csv` | Các chỉ số tổng hợp chất lượng và số lượng đầu ra | Kiểm tra nhanh/báo cáo |
| `../processed/data_quality_audit.csv` | Thiếu/trùng theo cột, khóa, stage raw/cleaned | Kiểm tra chất lượng chi tiết |
| `../processed/eda_category_summary.csv`, `eda_product_summary.csv`, `eda_monthly_summary.csv` | Bảng số liệu EDA tổng hợp | Báo cáo/biểu đồ |

Pandas có thể đọc file `.csv.gz` trực tiếp bằng `pd.read_csv(...)`.

Script chỉ xuất `retail_transactions_cleaned.csv.gz`. Thư mục legacy `retail_transactions_cleaned.csv/` (bản CSV cũ, cùng số dòng nhưng thiếu các cột `currency`, `source_dataset`, `is_simulated`) đã được xoá.

## 6. Hướng làm tiếp cho bài toán ML

`haircare_demo_daily_sales.csv` là dữ liệu chuẩn bị ban đầu, chưa phải bộ feature cuối cùng. Trước khi huấn luyện:

Notebook demo EDA, Data Analytics, so sánh Seasonal Naive/Random Forest/Extra Trees/HistGradientBoosting theo ngày và HistGradientBoosting/LightGBM/XGBoost theo tuần, kèm khuyến nghị tồn kho, nằm tại [`revenue_inventory_ml_demo.ipynb`](./revenue_inventory_ml_demo.ipynb). Notebook dự báo cả `revenue_gbp` lẫn `quantity_sold`; khuyến nghị đặt hàng dựa trên quantity và các giả định tồn kho được khai báo trong notebook. Notebook cần `pandas`, `numpy`, `scikit-learn`, `matplotlib`, `IPython`; phần mô hình tuần cần thêm `lightgbm` và `xgboost`.

Trên daily workflow, HistGradientBoosting được chọn qua validation cho cả hai target; WAPE holdout là khoảng 63,7% doanh thu và 69,0% quantity. Trong workflow tuần hiện tại, WAPE holdout theo tuần cập nhật hàng tuần khoảng 40,6% doanh thu và 46,4% quantity. WAPE tuần khác độ phân giải với WAPE ngày, nên không so sánh trực tiếp như cùng một target. Kết quả nền được lưu trong notebook; benchmark thử nghiệm có thể chạy độc lập bằng script bên dưới.

### 6.1. Benchmark bổ sung và chọn model theo đúng kỳ dự báo

Chạy từ thư mục gốc project:

```powershell
python data\ml\A_Plan\model_experiments.py
```

Script so sánh seasonal-naive, Linear Regression, LightGBM gốc/tinh chỉnh, CatBoost, XGBoost và LightGBM hai giai đoạn. Ngoài đánh giá rolling 4 tuần cập nhật bằng số liệu tuần thực tế (one-step), script mô phỏng **dự báo đệ quy cố định 2 tuần** ở ba cửa sổ validation; cách thứ hai sát hơn với horizon dùng trong gợi ý nhập hàng. Theo hướng báo cáo bám nội dung môn học, mô hình được chọn theo **MAE validation 2 tuần** (đơn vị sản phẩm hoặc GBP); WAPE, RMSE và R² được lưu làm chỉ số tham khảo. Holdout được giữ để đánh giá sau khi chọn, không dùng để chọn model.

Benchmark trên dữ liệu hiện tại cho kết quả:

| Target | Model tốt nhất theo MAE validation 2 tuần | Validation MAE | Holdout MAE | Holdout RMSE | Holdout R² |
|---|---|---:|---:|---:|---:|
| `quantity_sold` | CatBoost | 117,1 sản phẩm/tuần | 109,9 sản phẩm/tuần | 147,1 sản phẩm/tuần | 55,8% |
| `revenue_gbp` | Linear Regression | £257,18/tuần | £271,26/tuần | £364,57/tuần | 54,2% |

Các MAE/RMSE được tính trên hai tuần liên tiếp tại mỗi origin, dự báo tuần thứ hai dùng forecast tuần thứ nhất thay vì dùng actual đã biết. R² được tính trên toàn bộ holdout và không phải phần trăm độ chính xác. Chỉ có ba validation origin và một khoảng holdout; do đó kết quả chưa đủ để kết luận model tốt hơn một cách bền vững. Linear Regression được chọn theo MAE validation cho doanh thu nhưng MAE holdout cao hơn CatBoost (doanh thu) và LightGBM (doanh thu); cần báo cáo sự chênh lệch này như dấu hiệu độ ổn định còn yếu, không tuyên bố mô hình đã cải thiện. Xem toàn bộ chỉ số tại `results/weekly_model_comparison.csv` và điểm từng fold tại `results/weekly_model_comparison_folds.csv`. Script cũng xuất forecast và bảng nhập hàng **thử nghiệm riêng**, không ghi đè kết quả notebook hiện tại:

- `results/weekly_sales_forecast_experimental.csv`
- `results/demo_inventory_recommendations_experimental_weekly.csv`

Tồn kho hiện tại, lead time, review period và safety stock trong bảng experimental vẫn là giả định demo (lần lượt 50 sản phẩm, 7 ngày, 7 ngày và z=1,65), không phải đầu vào quan sát thực.

Trong các thử nghiệm thêm, CatBoost và LightGBM tinh chỉnh không cải thiện rõ rệt ở cách đánh giá cập nhật hàng tuần; mô hình two-stage cũng không tốt hơn ổn định. Panel tuần chỉ có khoảng 4,0% dòng zero-quantity (so với khoảng 28,75% ở panel ngày), nên xử lý hurdle vốn nhắm vào zero ngày không đem lại lợi thế rõ ở horizon tuần. Thêm lag mùa vụ 52 tuần, rolling dài và biến Q4/giá cũng không cải thiện validation trong thử nghiệm hiện tại; chỉ có khoảng hai năm dữ liệu, vì vậy lag theo năm còn ít mẫu để học và có thể làm mất dữ liệu train.

### 6.2. Diễn giải các giai đoạn doanh thu cao

Script xuất top ngày doanh thu cùng số invoice, SKU, doanh thu từ invoice lớn nhất và tỷ trọng top 3 vào `results/high_revenue_period_audit.csv`; tổng doanh thu/số lượng/invoice theo tháng nằm trong `../processed/mapped_monthly_activity_audit.csv`.

Ở dữ liệu SKU nguồn được map, tháng 11 cao hơn tháng 10 ở cả hai năm: năm 2010 doanh thu tăng 43,6%, quantity tăng 33,3%, số invoice tăng 22,4%; năm 2011 lần lượt tăng 60,3%, 45,5%, 41,5%. Nhưng một số ngày đỉnh tập trung rất mạnh vào vài invoice: ngày 2011-01-11, invoice lớn nhất chiếm 46,5% doanh thu ngày và top 3 chiếm 86,2%; ngày 2010-11-15 các tỷ lệ là 54,3% và 65,9%. Đây có thể là đơn hàng số lượng lớn/wholesale, cơ cấu hàng hoặc sự kiện khác; dữ liệu không có nhãn khuyến mãi, ngày lễ, stockout hay loại khách hàng để xác định nguyên nhân. Một số SKU nguồn có mô tả đồ gia dụng/trang trí Giáng sinh, không phải mỹ phẩm tóc.

Vì thế, nên xem doanh thu cao là tín hiệu cần điều tra, không mặc định đó là mùa vụ HairCare. Khi có dữ liệu vận hành, bổ sung cờ khuyến mãi/chiến dịch, giá và giảm giá, loại khách/đơn sỉ, ngày lễ và tình trạng hết hàng; đánh giá xem mức tăng lặp lại qua nhiều năm/origin hay chỉ do một invoice. Không xóa spike khỏi actual để làm đẹp WAPE; nếu nghi lỗi dữ liệu, cần xác minh từng invoice và báo cáo cả kết quả gốc lẫn kịch bản điều chỉnh.

1. Chọn rõ target: dự báo `quantity_sold`, hoặc dự báo `revenue_gbp` (không trộn tiền tệ).
2. Chia train/test theo thời gian, không xáo trộn ngẫu nhiên các ngày.
3. Tạo lag và rolling features chỉ từ dữ liệu quá khứ để tránh leakage; ví dụ lag 1/7/28 ngày và trung bình trượt.
4. So sánh với baseline đơn giản trước khi thử các mô hình Regression/Random Forest theo đề cương.
5. Báo cáo MAE, RMSE và MAPE; xử lý rõ trường hợp actual bằng 0 khi tính MAPE. Có thể bổ sung WAPE hoặc sMAPE để tránh chia cho 0.
6. Dùng số lượng dự báo để minh họa gợi ý nhập hàng. Tồn kho hiện tại, lead time và safety stock **không có sẵn như sự thật quan sát được trong dataset**; cần khai báo là tham số/giả định mô phỏng.
7. Ghi rõ kết quả đánh giá chỉ phản ánh khả năng mô hình trên chuỗi bán lẻ nguồn được gán nhãn, không phải độ chính xác trên nhu cầu HairCare thật.

Với gợi ý nhập hàng, có thể dùng công thức nghiệp vụ trong tài liệu phân tích:

`Số lượng đề xuất = max(0, nhu cầu dự báo trong (lead time + chu kỳ nhập) + tồn an toàn - tồn kho hiện tại)`

Các đầu vào tồn kho và thời gian cung ứng cần được mô phỏng hoặc lấy từ dữ liệu vận hành riêng; không thể suy ra chúng từ Online Retail II.

## 7. Cách chạy lại và kiểm tra

1. Đặt raw file tại đúng vị trí tương đối như trong project.
2. Dùng Python (khuyến nghị 3.10+) với `pandas>=2.2`, `numpy` và `openpyxl`. Phiên bản pandas tối thiểu cần thiết do pipeline sử dụng `groupby.apply(include_groups=False)`.
3. Từ thư mục gốc project, chạy `python data\prepare_haircare_demo.py`. Script tự tìm thư mục dữ liệu, kiểm tra các tổng đối soát rồi mới ghi các output; các file cùng tên trong `data\ml\processed\` sẽ được cập nhật.
4. Kiểm tra mapping có 59 `product_id` và 59 `StockCode` duy nhất; daily có 43.601 dòng và 59 sản phẩm. Catalog demo phải có 59 `availability=true`; `source_availability` giữ nguyên trạng thái crawl.
5. Script tự kiểm tra tổng `quantity_sold` và `revenue_gbp` của panel so với giao dịch map. Kiểm tra thêm file daily không chứa giá USD.
6. Xem `retail_cleaning_report.csv`, `data_quality_audit.csv`, `preparation_quality_report.csv` và các bảng EDA để xem số dòng, thiếu/trùng và thống kê.
7. Để chạy benchmark ML và audit giai đoạn doanh thu cao, cài thêm `scikit-learn`, `lightgbm`, `xgboost`, `catboost`, sau đó chạy `python data\ml\A_Plan\model_experiments.py`. Script tạo các file comparison, forecast thử nghiệm và spike audit nêu ở mục 6.1–6.2.

Notebook có thể còn output đã lưu từ lần chạy trước. Không dùng output cũ của notebook để thay cho CSV được tạo gần nhất bởi script.

## 8. Cách giải thích ngắn gọn khi demo/báo cáo

> Catalog của website dùng sản phẩm HairCare crawl được và giá USD; trong web demo, cả 59 sản phẩm được giả lập available. Do chưa có dữ liệu bán hàng HairCare đủ phù hợp, phần ML sử dụng giao dịch Online Retail II, giữ nguyên số lượng và giá nguồn GBP, rồi gán nhãn giả lập 59 SKU vào 59 sản phẩm HairCare để minh họa quy trình dự báo và chuẩn bị dữ liệu tồn kho. Vì vậy, đây là dữ liệu mô phỏng; kết quả không đại diện cho doanh thu hay nhu cầu thực tế của thị trường HairCare.

## 9. Kết quả kiểm tra thiếu, trùng và đối soát

Kết quả dưới đây được tạo lại từ raw bằng `prepare_haircare_demo.py`. Các tỷ lệ thiếu/trùng theo cột và khóa có thể tra cứu đầy đủ trong `data_quality_audit.csv`.

### 9.1. Catalog crawl

| Kiểm tra | Kết quả |
|---|---:|
| Dòng / cột raw | 59 / 25 |
| Trùng toàn dòng dư | 0 |
| `product_id` thiếu / trùng dư | 0 / 0 |
| `original_price` thiếu | 58 |
| `discount` thiếu | 59 |
| `product_description` thiếu | 1 |
| `size` / `available_sizes` thiếu | 1 / 1 |
| `rating` thiếu | 1 |
| Currency | USD, 59/59 |
| Availability crawl | 58 true, 1 false |

Các trường optional bị thiếu được giữ null, không tự điền nội dung. `availability` của catalog đầu ra được đặt true cho cả 59 sản phẩm để phục vụ web giả lập; `source_availability` và `availability_is_simulated` phân biệt trạng thái crawl gốc với giả định demo.

### 9.2. Cosmetic reference

| Kiểm tra | Kết quả |
|---|---:|
| Dòng / cột nguồn | 12.615 / 15 |
| Exact duplicate dòng dư trong file nguồn | 60 |
| Dòng `category=hair` trước khử trùng business key | 1.501 |
| Business duplicate bị loại (chỉ tính dòng đủ khóa) | 81 |
| Listing thiếu/không hợp lệ một thành phần business key, được giữ lại | 205 |
| Listing Hair còn lại | 1.420 |
| Listing cần xem thủ công | 155 |

Raw cosmetic có giá thiếu 317, ingredients thiếu 6.015, type thiếu 2.681, color thiếu 1.989, size thiếu 3.166, rating thiếu 2.067 và noofratings thiếu 459. Trong 1.420 Hair listing còn lại, thiếu giá 154, ingredients 926, type 77, size 204, rating 896 và noofratings 30. Business key dùng tên + brand + size đã chuẩn hóa; các bản ghi thiếu hoặc có thành phần khóa chuẩn hóa rỗng được giữ lại và không dùng để khử trùng. Pipeline giữ các exact duplicate nguồn được nhận diện theo toàn bộ dòng, nhưng chỉ loại các bản trùng business key trong các dòng có đủ khóa. Raw `category`/`subcategory` và cột hậu tố `_source` vẫn giữ nhãn gốc; nhãn sáu nhóm sau chuẩn hóa nằm trong `suggested_haircare_category`. Dataset khảo sát hiển thị 1.501 dòng hair chưa khử trùng với treatment 398 (oil 267 + serum 131); file sạch còn 1.420 listing với treatment 382 (oil 267 + serum 115). Output reference có 6 nhóm gợi ý: shampoo 517, hairmask 342, treatment 382, dry shampoo 88, conditioner 61, hairstyling 30. Các giá trị này chỉ là listing tham khảo; đơn vị tiền tệ chưa xác minh và dataset không chứa sales.

### 9.3. Online Retail II

| Kiểm tra / xử lý | Kết quả |
|---|---:|
| Sheet 2009–2010 / sheet 2010–2011 | 525.461 / 541.910 dòng |
| Tổng dòng nguồn | 1.067.371 |
| Invoice giao giữa hai sheet / dòng ở sheet sau bị bỏ | 1.088 / 22.523 |
| Dòng exact duplicate dư trong hai sheet (báo cáo, không tự bỏ) | 6.865 / 5.268 |
| Invoice hủy bị loại | 19.165 |
| Quantity thiếu hoặc không dương bị loại | 3.393 |
| Price thiếu hoặc không dương bị loại | 2.636 |
| Ngày không hợp lệ / SKU thiếu bị loại | 0 / 0 |
| Dòng bán hợp lệ sau làm sạch | 1.019.654 |
| Dòng exact duplicate dư còn giữ trong clean output | 11.741 |
| Customer ID thiếu trong raw, theo sheet | 107.927 / 135.080 |

Đối soát theo thứ tự xử lý: `1.067.371 = 22.523 invoice-overlap rows + 19.165 cancelled + 3.393 invalid quantity + 2.636 invalid price + 1.019.654 valid sales`. Không có dòng bị loại theo date/SKU trong bản raw hiện tại. Customer ID thiếu không làm giao dịch bị loại vì không cần cho dự báo chuỗi thời gian; Customer ID không được xuất trong clean transactions.

`retail_cleaning_report.csv` có số liệu từng sheet và ghi chú thứ tự ưu tiên lý do. Exact duplicate cùng sheet không bị xem là bằng chứng chắc chắn của lỗi; chúng được lưu lại để tránh xóa giao dịch có thể hợp lệ. Một invoice giữa hai sheet bị loại chỉ sau khi nội dung các dòng khớp, và pipeline sẽ dừng nếu phát hiện invoice overlap có chữ ký khác nhau.

## 10. EDA trên panel demo và cách diễn giải

Panel có 43.601 dòng (=59 sản phẩm × 739 ngày, 01/12/2009–09/12/2011), trong đó 12.535 dòng zero-sale (28,75%). Zero-sale là ngày không có dòng giao dịch cho SKU được map, được tạo khi hoàn chỉnh panel; không phải dữ liệu doanh số bị thiếu được thay bằng 0. `unit_price_gbp` để null trong ngày không bán vì không có giá giao dịch ngày đó.

| Category giả lập | Sản phẩm | Quantity nguồn | Revenue GBP nguồn | Tỷ trọng revenue | Zero-sale rate |
|---|---:|---:|---:|---:|---:|
| shampoo | 10 | 552.648 | £1.315.481,81 | 36,27% | 22,79% |
| hairstyling | 23 | 447.447 | £1.059.465,09 | 29,21% | 31,84% |
| hairmask | 11 | 374.211 | £540.162,79 | 14,90% | 26,63% |
| conditioner | 8 | 204.884 | £322.240,73 | 8,89% | 27,42% |
| treatment (gộp oil + serum) | 5 | 89.758 | £229.252,98 | 6,32% | 27,01% |
| dry shampoo | 2 | 52.091 | £159.857,04 | 4,41% | 44,32% |

Đây là thống kê của giao dịch bán lẻ nguồn sau khi gán nhãn HairCare giả lập; không diễn giải là thị phần hay nhu cầu thực của các ngành hàng HairCare. Các kết quả chi tiết theo sản phẩm/tháng được lưu trong `eda_product_summary.csv` và `eda_monthly_summary.csv`. Trong category EDA, `catalog_min/median/max_price_usd` là giá catalog crawl USD; `revenue_gbp` là doanh thu nguồn GBP — hai đơn vị không được cộng hoặc so sánh trực tiếp.

## 11. Từ điển cột cho các file bàn giao chính

Các cờ `is_simulated`, `label_is_simulated`, `is_simulated_sales`, `availability_is_simulated` giúp nhận diện giả lập. Với daily sales, **mọi dòng đều mang nhãn sản phẩm HairCare giả lập**, dù số lượng/giá và ngày bắt nguồn từ Online Retail II.

### 11.1. `haircare_catalog_cleaned.csv`

Giữ 25 cột catalog crawl, bổ sung các cột chuẩn hóa/truy vết sau:

| Cột | Ý nghĩa |
|---|---|
| `price_usd`, `price_unit` | Giá catalog đã chuẩn hóa và đơn vị USD. |
| `availability` | Cờ có hàng dùng cho Web demo; true cho cả 59 sản phẩm. |
| `source_availability` | Cờ availability gốc crawl, không bị ghi đè. |
| `availability_is_simulated`, `is_simulated` | Cờ cho biết trạng thái/đầu ra có yếu tố giả lập. |
| `category_source`, `category`, `categories`, `category_vi` | `category_source` giữ taxonomy crawl gốc; `category` và `categories` dùng cùng một nhãn trong taxonomy 6 nhóm; `category_vi` là tên tiếng Việt. |
| `category_mapping_rule` | Quy tắc đưa nhãn crawl vào taxonomy chuẩn. |
| `catalog_source`, `catalog_id` | Nguồn file và mã catalog đầu ra. |
| `needs_manual_review` | Cờ kiểm tra thủ công; không thay cho xác minh nội dung. |
| Các cột còn lại | Thông tin gốc crawl: tên, brand, URL, giá, mô tả, benefits, thành phần, cách dùng, size, rating, review, ảnh, thời điểm crawl và tags. Trường thiếu được giữ trống. |

### 11.2. `retail_transactions_cleaned.csv.gz`

| Cột | Ý nghĩa |
|---|---|
| `Invoice`, `StockCode` | Mã invoice và SKU nguồn Online Retail II. |
| `Description`, `Country` | Mô tả hàng và quốc gia nguồn; mô tả có thể thiếu. |
| `InvoiceDate`, `sale_date` | Thời điểm invoice và ngày đã chuẩn hóa. |
| `Quantity`, `Price` | Số lượng và đơn giá nguồn; đơn giá GBP. |
| `revenue_source` | `Quantity × Price`, doanh thu nguồn GBP. |
| `quantity_outlier_gt_100` | Cờ Quantity lớn hơn 100; dòng vẫn được giữ. |
| `description_is_service_or_adjustment` | Cờ mô tả thuộc pattern dịch vụ/điều chỉnh; dùng để loại SKU khỏi lựa chọn map, không loại giao dịch khỏi clean transactions. |
| `currency`, `source_dataset`, `is_simulated` | Đơn vị và xuất xứ; `is_simulated=false` cho giao dịch nguồn chưa gán nhãn. |

### 11.3. `haircare_demo_product_mapping.csv`

| Cột | Ý nghĩa |
|---|---|
| `product_id`, `product_name`, `category`, `category_vi` | Sản phẩm HairCare crawl được gán nhãn demo. |
| `StockCode`, `source_description` | SKU và mô tả bán lẻ gốc được ghép vào nhãn đó. |
| `distinct_invoices`, `source_rows`, `source_total_quantity` | Mức độ hoạt động của SKU nguồn dùng để xếp hạng/chọn mapping. |
| `source_median_price`, `source_median_price_gbp`, `source_currency` | Thống kê giá SKU nguồn, GBP; không phải giá catalog USD. |
| `source_sku_rank`, `mapping_rule`, `mapping_type` | Thứ hạng, quy tắc ghép ổn định và tuyên bố rõ mapping chỉ là nhãn giả lập. |
| `source_availability` | Trạng thái crawl của sản phẩm gán nhãn. |
| `is_simulated`, `label_is_simulated` | Đều true; identity sản phẩm/category không có quan hệ thật với SKU bán lẻ. |
| `price_used_for_ml` | Giải thích ML dùng Price giao dịch GBP, không dùng giá catalog USD. |

### 11.4. `haircare_demo_daily_sales.csv`

| Cột | Ý nghĩa |
|---|---|
| `sale_date`, `product_id` | Khóa duy nhất ngày × sản phẩm. |
| `quantity_sold`, `revenue_gbp` | Tổng Quantity và Quantity × Price từ các SKU được map trong ngày. |
| `source_order_count` | Số Invoice nguồn khác nhau cho sản phẩm/ngày. |
| `unit_price_gbp` | Đơn giá bình quân theo các dòng giao dịch ngày đó; null nếu zero-sale. |
| `outlier_source_lines` | Số dòng nguồn có Quantity >100 trong ngày. |
| `category`, `category_vi`, `product_name` | Nhãn HairCare giả lập lấy qua mapping. |
| `source_availability` | Availability crawl gốc của sản phẩm được gán, không phải tồn kho thực tại ngày bán. |
| `currency`, `source_dataset` | GBP và Online Retail II. |
| `is_simulated`, `label_is_simulated` | Đều true vì nhãn/quan hệ HairCare được mô phỏng. |
| `is_zero_sale_day` | true nếu không phát sinh giao dịch nguồn cho SKU/ngày. |

### 11.5. Các bảng audit/EDA

| File | Nội dung/cột chính |
|---|---|
| `data_quality_audit.csv` | Mỗi dataset/stage/cột có `row_count`, `column_count`, `missing_count`, `missing_percent`, `unique_non_null`; các dòng `__exact_duplicate_rows__` và `__business_key__:*` ghi duplicate dư/khóa thiếu. Duplicate business key chỉ tính trên dòng đủ khóa; cosmetic reference có audit riêng cho khóa tên + brand + size và `catalog_id`. |
| `retail_cleaning_report.csv` | Theo sheet: dòng nguồn, exact duplicate, invoice overlap bị bỏ, lý do loại trừ, dòng hợp lệ, thiếu Description/Customer ID và duplicate còn giữ. |
| `preparation_quality_report.csv` | Metric tổng quan để đối soát các nguồn và output chính. |
| `eda_category_summary.csv` | Tổng hợp category: số sản phẩm, số ngày zero-sale, quantity, revenue, tỷ trọng và giá catalog min/median/max (USD). |
| `eda_product_summary.csv` | Tổng hợp theo sản phẩm: dòng giao dịch nguồn, invoice, quantity/revenue GBP, zero-sale/active days, outlier. |
| `eda_monthly_summary.csv` | Tổng quantity/revenue và zero-sale theo tháng. |

## 12. Phạm vi và giới hạn sử dụng

- Không có dữ liệu giao dịch HairCare thực được nối với catalog. Một-một mapping SKU bán lẻ → sản phẩm HairCare là quy ước mô phỏng; mapping dựa trên xếp hạng tần suất SKU, không dựa trên mô tả tương đồng.
- Tất cả 59 sản phẩm được đánh dấu available chỉ trong Web demo. `source_availability` vẫn cho biết raw crawl có 1 sản phẩm unavailable.
- Dữ liệu bán lẻ trải từ 2009–2011; nhãn ngành hàng, taxonomy, giá catalog và transaction không cùng một nguồn/sản phẩm. Kết quả dự báo chỉ kiểm tra workflow/model trên chuỗi retail được gán nhãn.
- Tồn kho thực, lead time, hàng nhập, thiếu hàng và chi phí lưu kho không có trong các nguồn này. Recommendation tồn kho trong notebook ML là kết quả theo tham số giả định, không phải quyết định vận hành thực.
- `data_quality_audit.csv` đo thiếu/trùng theo file và khóa được nêu; duplicate business key không đồng nghĩa chắc chắn lỗi dữ liệu, đặc biệt với giao dịch retail thiếu line ID.
