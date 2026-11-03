# Kế hoạch triển khai dự báo doanh thu và tối ưu tồn kho

## 1. Mục tiêu

Xây dựng hệ thống hỗ trợ dự báo nhu cầu tổng và đề xuất đặt hàng tồn kho cho 59 SKU HairCare mô phỏng.

Hệ thống phải trả lời ba câu hỏi:

1. Tổng nhu cầu doanh thu/số lượng theo tháng là bao nhiêu?
2. Nhu cầu tổng theo từng danh mục hay từng SKU là bao nhiêu?
3. Mỗi SKU cần nhập thêm bao nhiêu dựa trên tồn kho, lead time và mức tồn kho an toàn?

Mô hình dự báo hỗ trợ quyết định, không thay thế hoàn toàn nhân viên quản lý kho.

## 2. Nguyên tắc sử dụng dữ liệu

Tất cả dữ liệu bán lẻ hiện tại:

- Chỉ sử dụng dữ liệu demo mapping;
- Giữ số liệu quantity và revenue của Online Retail II;
- Không mô tả thương hiệu, tên, danh mục HairCare là dữ liệu bán thật;
- Không xóa dữ liệu bất thường trừ khi có bằng chứng transactional hợp lệ cho việc loại bỏ;
- Báo cáo rõ số liệu thực tế, dữ liệu mô phỏng và khoảng thời gian huấn luyện.

### Khoảng dữ liệu hiện tại

- Panel daily: 01/12/2009–09/12/2011;
- 59 SKU đã mapping;
- Panel monthly: theo tháng đầy đủ trong dữ liệu nguồn;
- 10 ngày robust-z bất thường đã được lưu và cần giữ làm signal phân tích;
- Monthly December 2011 chưa đầy đủ và không dùng để so sánh tổng tháng đầy đủ.

## 3. Hai tầng dự báo

### Tầng 1: Dự báo tổng theo tháng

Mục tiêu chính:

- Dự báo tổng quantity và tổng revenue theo tháng;
- Lập kế hoạch mua hàng theo chu kỳ; 
- Ước tính ngân sách và nguồn lực;
- Theo dõi nhu cầu mùa cao như tháng 11 và tháng 12.

Từ kết quả thử nghiệm hiện tại:

| Mục tiêu | Mô hình tốt nhất theo tổng tháng |
|---|---|
| Quantity | Lag seasonality: WAPE ~18,82% |
| Revenue | Lag seasonality: WAPE ~15,89% |

Ưu tiên tầng này làm kế hoạch tổng cấp chu kỳ.

### Tầng 2: Phân bổ nhu cầu xuống SKU

Sau khi có dự báo tổng tháng:

1. Tính tỷ trọng SKU trong tháng hoặc 13 tuần gần nhất;
2. Điều chỉnh theo mùa vụ, xu hướng và tốc độ bán gần nhất;
3. Tạo dự báo quantity/revenue theo từng SKU;
4. So sánh dự báo SKU, tồn kho thực tế, lead time và sales velocity;
5. Sinh đề xuất đặt hàng theo từng SKU hoặc từng nhóm.

Công thức tham khảo:

```text
SKU forecast tháng
= Tổng forecast tháng
× Tỷ trọng SKU dự kiến
× Điều chỉnh mùa vụ của SKU
```

Tỷ trọng có thể bắt đầu bằng trung bình theo 8–13 tuần gần nhất. Sau đó thử thêm tỷ trọng từ lag 52, rolling mean và mô hình SKU.

## 4. Seasonal features cần triển khai

### Lịch

- Tuần trong năm;
- Tháng trong năm;
- Sin/cos tuần hoặc tháng;
- Indicator tháng 11/12;
- Khoảng cách tới ngày 25/12;
- Indicator cửa sổ mùa cao 4 tuần và 8 tuần.

### Time-series lags

- Lag 1, 2, 4 tuần;
- Lag 52 tuần;
- Rolling mean 4, 8, 13 tuần;
- Lag 12 tháng;
- Rolling mean 3, 6 tháng.

### Ratio và chỉ số mùa vụ

```text
seasonal_ratio = giá trị tuần hiện tại / giá trị tháng hoặc tuần tương ứng năm trước
```

### Dữ liệu bất thường

Không loại actual khỏi holdout hoặc training.

Thêm các flag riêng:

- robust_zscore quantity/revenue;
- spike_flag;
- top_invoice_share;
- top3_invoice_share;
- số invoice trong ngày/tuần;
- giá trị đơn hàng trung bình;
- bulk_order_flag nếu dữ liệu xác nhận được;

Mỗi extreme date phải được báo cáo như một trường hợp cần kiểm tra, không tự động gắn nhãn là Sai data, promotion, Christmas hoặc HairCare.

## 5. Mô hình thực nghiệm

Thực hiện theo thứ tự tăng dần độ phức tạp.

### Baseline

- Lag 1 tuần/tháng;
- Mean 4/13 tuần;
- Seasonal naive lag 52 hoặc lag 12;
- Linear Regression;

### Mô hình chính

- LightGBM;
- CatBoost;
- XGBoost;
- Ensemble trung bình hoặc Ridge meta-model;

### Dự báo tháng

Ưu tiên thử:

1. Lag 12 tháng;
2. Trung bình rolling 3 hoặc 6 tháng;
3. Seasonal index;
4. LightGBM với monthly features;
5. Ensemble giữa seasonal naive và lightGBM.

### Dự báo tuần

Ưu tiên thử:

1. LightGBM với lag 52 và calendar features;
2. CatBoost;
3. Two-stage model nếu dữ liệu không bán đủ ngày;
4. Ensemble model;
5. Forecast interval hoặc quantile model.

## 6. Phương pháp validation

Không dùng một holdout cố định duy nhất làm kết luận cuối.

### Theo tháng

- Backtest origin mỗi tháng;
- Horizon tối thiểu 1–3 tháng;
- Không dùng future month trong training;
- Train/test cố định theo origin;
- Báo cáo riêng monthly November/December.

### Theo tuần

- Walk-forward validation;
- Một holdout cuối;
- Mỗi origin huấn luyện thêm dữ liệu mới;
- Dự báo 4–9 tuần;
- Kiểm tra từng horizon thay vì chỉ lấy trung bình toàn bộ horizon.

### Metric

Mỗi cấp độ phải được tách riêng:

1. SKU/period WAPE;
2. SKU/period MAE;
3. Total-period WAPE;
4. Revenue WAPE;
5. Quantity WAPE;
6. Bias;
7. Underforecast và overforecast cost;
8. WAPE riêng November và December;
9. Coverage forecast interval 80–95%.

Không cộng trực tiếp accuracy tháng và accuracy tuần; hai aggregation khác nhau và không thể so sánh như cùng metric business.

## 7. Quy tắc đề xuất tồn kho

Với mỗi SKU theo tuần hoặc tháng:

```text
forecast_demand
= Dự báo số lượng SKU trong khoảng review

safety_stock
= Z × σ(error) × √lead_time + service_level adjustment

recommended_order
= forecast_demand
+ safety_stock
+ on_order
- current_stock
- backorder

recommended_order
= max(0, recommended_order)
```

### Tham số cần giữ trong cấu hình

- Lead time SKU/cửa hàng;
- Review period;
- Current stock;
- Inbound stock/on-order;
- Safety stock/service level;
- Minimum/maximum order quantity;
- Pack size/case pack;
- Shelf life;
- Promotion/calendar flags;
- Average sales velocity;

Dữ liệu demo hiện không có các trường này nên chỉ tạo công thức, bảng mô phỏng và đề xuất có cảnh báo. Không coi output là quyết định mua hàng cho cửa hàng thực.

## 8. Output đầu ra

Tạo các bảng và biểu đồ sau:

### Bảng dự báo

- Tổng quantity/revenue theo tháng;
- Forecast dưới/ước tính/forecast trên;
- Quantity/revenue theo SKU-tháng;
- Quantity/revenue theo SKU-tuần;
- Tổng theo danh mục;
- Horizon confidence interval;

### Bảng tồn kho

- SKU;
- Forecast demand;
- Current stock;
- On-order;
- Safety stock;
- Recommended order;
- Lead time;
- Stockout risk;
- Replenishment status;

### Biểu đồ

- Actual và forecast theo tổng panel tháng;
- Actual và forecast theo từng SKU;
- WAPE theo tháng và horizon;
- Peak season November/December;
- Inventory coverage theo SKU;
- Bias và uncertainty;
- Top underforecast/overforecast SKU.

## 9. Cấu trúc thư mục đề xuất

```text
A_Plan/
├── PLAN_MONTHLY_FORECAST_INVENTORY.md
├── scripts/
│   ├── prepare_monthly_panel.py
│   ├── train_monthly_forecast.py
│   ├── allocate_monthly_to_sku.py
│   ├── build_inventory_recommendations.py
│   └── run_backtest.py
├── notebooks/
│   └── seasonal_forecast_analysis.ipynb
└── results/
    ├── monthly_forecast_results.csv
    ├── sku_allocation_results.csv
    ├── inventory_recommendations.csv
    ├── validation_metrics.csv
    └── charts/
```

Không ghi đè result benchmark hiện tại. Mọi phương án mới tạo thư mục riêng theo thời gian hoặc mô hình.

## 10. Phases triển khai

### Phase 1: Freeze baseline hiện tại

- Giữ model results cũ;
- Tài liệu hóa fixed origin và monthly origin;
- Kiểm tra data quality;
- Xác nhận December incomplete;
- Audit bulk/spike cases.

### Phase 2: Monthly forecast tổng

- Thử seasonal naive 12-month;
- Thử rolling mean 3/6-month;
- Thử LightGBM/Linear Regression;
- Walk-forward backtest;
- Chọn model bằng monthly total WAPE và bias.

### Phase 3: Phân bổ xuống SKU

- Tỷ trọng SKU từ lịch sử;
- Seasonal index;
- Mô hình SKU/month;
- Mô hình SKU/week;
- So sánh 3 cách phân bổ:
  1. Equal trend-adjusted weight;
  2. Historical weight;
  3. ML SKU forecast.

### Phase 4: Inventory recommendation

- Thêm sample store inventory;
- Thêm lead time và review period;
- Thêm safety stock;
- Kiểm tra pack size và shelf life;
- Sinh recommended order.

### Phase 5: Dashboard/report

- Actual vs forecast;
- Total and SKU views;
- Peak-season warning;
- Stockout risk;
- Under/overforecast view;
- Data limitation banner rõ ràng.

## 11. Điều kiện đề tài cho dữ liệu HairCare thật

Mô hình chỉ đạt ứng dụng thực tế khi bổ sung:

- Doanh thu HairCare theo cửa hàng/tháng;
- Stock on hand;
- Stock on order;
- Supplier lead time;
- Promotions;
- Price changes;
- New product launches;
- Product expiry/shelf life;
- Product replacement/discontinuation;
- Customer demand by channel;
- Store size and location;
- Inventory receiving calendar;

Khi data thật vẫn giữ cùng kết cấu mô hình, nhưng cần train lại riêng cho HairCare và không dùng retail mapping làm kết quả validation thực tế.

## 12. Acceptance criteria

Kế hoạch được xem là hoàn thành khi:

- Monthly total forecast được backtest trên nhiều origin;
- SKU allocation được kiểm tra bằng reconciliation, tức tổng allocation bằng total forecast;
- Weekly model không bị dùng sai scale so với monthly model;
- Recommendation table không âm và đã trừ inventory/on-order;
- Spike analysis không làm thay đổi actual holdout;
- Mỗi con số đều có nguồn file, ngày origin và horizon;
- Báo cáo nêu rõ sai số và giới hạn dữ liệu;
- Notebook/script có thể chạy lại từ dữ liệu canonical trong `processed`.

## 13. Kết luận kế hoạch

Phù hợp nhất với đề tài là:

> Dự báo doanh thu tổng theo tháng làm kế hoạch nhu cầu và nguồn lực; phân bổ tổng tháng xuống SKU; sau đó kết hợp forecast với tồn kho thực tế, lead time, mức tồn an toàn và thông tin cửa hàng để đề xuất đặt hàng.

Đây là cách tận dụng sai số thấp hơn ở mức tổng, đồng thời kiểm soát hạn chế sai số SKU thay vì chuyển kết quả dự báo thành con số đặt hàng tuyệt đối.
