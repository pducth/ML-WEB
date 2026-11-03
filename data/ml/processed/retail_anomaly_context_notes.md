# Ghi chú các giai đoạn bán hàng bất thường cần tra cứu

## Phạm vi và cách gắn cờ

Các mốc dưới đây được phát hiện trên **59 SKU nguồn được gán nhãn demo**, không phải doanh số HairCare. Khoảng phân tích là 01/12/2009–09/12/2011 (739 ngày), dùng giao dịch Online Retail II đã làm sạch.

Với tổng doanh thu/ngày và quantity/ngày của 59 SKU, tính robust z-score:

`robust z = 0.6745 × (giá trị - median) / MAD`

Trong đó `MAD` là median của độ lệch tuyệt đối so với median. Mốc `robust z >= 3.5` được dùng để **xếp hàng cần xem xét**, không chứng minh dữ liệu sai hoặc xác định nguyên nhân. Phân phối retail lệch phải và có các spike hợp lệ, nên cần đọc cùng số invoice, mô tả SKU và giao dịch gốc.

Baseline trên panel 59 SKU:

- Doanh thu/ngày: median **£4.492,04**; MAD **£2.290,65**; p95 **£11.671,50**; p99 **£17.546,34**.
- Quantity/ngày: median **2.223**; MAD **1.071**; p95 **5.405**; p99 **7.547**.
- Có 9 ngày vượt ngưỡng doanh thu và 6 ngày vượt ngưỡng quantity; danh sách bên dưới là hợp của hai nhóm, gồm 10 ngày.
- Khi đối chiếu toàn bộ SKU của file Online Retail II, 10 ngày này nằm từ khoảng percentile **83,6 đến 99,7** về doanh thu/ngày. Một vài ngày là spike của riêng 59 SKU đã chọn, còn một vài ngày cũng rất cao trong toàn bộ retail; cần dùng cột “xếp hạng toàn dataset” để ưu tiên tra cứu.

## Ngày cần tra cứu trước

| Ngày | Doanh thu 59 SKU | Quantity | Robust z doanh thu / quantity | Cả dataset retail | Invoice cần xem trước | Tín hiệu trong mô tả SKU |
|---|---:|---:|---:|---|---|---|
| 2011-01-11 | £27.549,57 | 10.736 | 6,79 / 5,36 | Doanh thu ngày khoảng p95,2 | `540689` (£12.797,52), `540815` (£8.621,50), `540832` (£2.332,77) | T-light holders, wicker hearts, metal sign; top 3 invoice chiếm 86,2% doanh thu của 59 SKU. Kiểm tra đơn lớn/wholesale hoặc invoice đặc biệt. |
| 2010-11-15 | £21.947,33 | 6.929 | 5,14 / 2,96 | Doanh thu ngày khoảng p99,3 | `533027` (£11.916,15), `532829` (£1.980,00), `533028` (£569,90) | `PAPER CHAIN KIT 50'S CHRISTMAS` và `SMALL POPCORN HOLDER`; top invoice chiếm 54,3%, top 3 chiếm 65,9%. Kiểm tra đơn hàng tập trung và hàng mùa vụ. |
| 2011-09-20 | £21.350,16 | 7.313 | 4,96 / 3,21 | Doanh thu ngày khoảng p99,5 | `567381` (£4.651,20), `567384` (£3.208,88), `567387` (£2.632,18) | Nhiều invoice lớn cùng ngày; không chỉ một invoice đơn lẻ. Kiểm tra nhóm khách hàng, đơn hàng và sản phẩm tạo doanh thu. |
| 2011-11-14 | £20.541,20 | 7.890 | 4,73 / 3,57 | Doanh thu khoảng p99,7; quantity khoảng p98,3 | `576365` (£9.192,50), `576090` (£1.997,44), `576179` (£921,32) | Christmas paper chain và popcorn holder nổi bật; top invoice chiếm 44,8%, top 3 chiếm 59,0%. |
| 2010-11-11 | £19.587,73 | 10.899 | 4,44 / 5,46 | Doanh thu khoảng p94,2 | `532358` (£4.176,00), `532296` (£3.300,00), `532140` (£2.812,50) | Ornaments và reusable bags có quantity lớn. Kiểm tra nhiều invoice số lượng cao cùng xuất hiện. |
| 2010-06-07 | £18.711,76 | 11.376 | 4,19 / 5,76 | Doanh thu khoảng p83,6; quantity khoảng p89,1 | `511164` (£3.610,50), `511176` (£3.610,50), `511277` (£3.175,50) | Ba invoice lặp giá trị và quantity lớn trên lunch bags; xem liệu là giao dịch đồng thời hay đặc điểm phân bổ đơn. |
| 2011-08-04 | £18.168,30 | 11.427 | 4,03 / 5,80 | Doanh thu khoảng p94,4; quantity khoảng p97,2 | `562439` (£6.379,20), `562348` (£1.609,82), `562353` (£906,50) | Assorted colour bird ornament chiếm quantity lớn; top invoice chiếm 35,1%. |
| 2011-11-03 | £17.548,19 | 7.101 | 3,84 / 3,07 | Doanh thu khoảng p93,9 | `574293` (£5.733,98), `574294` (£2.601,00), `574285` (£2.431,04) | Christmas paper chains và hanging-heart products. Nhiều invoice đầu ngày có giá trị cao. |
| 2011-03-29 | £17.543,31 | 7.585 | 3,84 / 3,38 | Doanh thu khoảng p95,4 | `548203` (£6.493,30), `548162` (£2.608,84), `548011` (£1.956,20) | Doanh thu phân bố trên nhiều invoice; xem các jumbo bags, party bunting, popcorn holder. |
| 2010-11-25 | £14.756,38 | 7.803 | 3,02 / 3,51 | Doanh thu khoảng p95,9; quantity p95,7 | `535228` (£1.275,00), `535104` (£1.009,20), `535243` (£876,00) | Quantity cao hơn tương đối nhưng doanh thu không ở nhóm 3,5 robust-z; xem nhiều đơn vừa/nhỏ và cơ cấu sản phẩm. |

Invoice ID và giá trị được giữ nguyên theo giao dịch nguồn. Các invoice trên chỉ là những dòng cần mở tra cứu đầu tiên, không phải toàn bộ invoice trong ngày.

## Các giai đoạn liên tiếp và theo tuần/tháng

1. **08–16/11/2010:** nhiều ngày doanh thu cao liên tiếp trong chuỗi 59 SKU. Tuần kết thúc **14/11/2010** có doanh thu **£77.344,97** và quantity **34.866**, là tuần duy nhất vượt robust-z 3,5 trên panel theo tuần. Kiểm tra batch order, lịch giao dịch, các SKU mùa vụ và việc tuần có khác biệt về phạm vi ngày.
2. **23–30/11/2010:** tiếp tục nhiều ngày có quantity/doanh thu cao; 25/11 có 118 invoice trên 59 SKU map. Kiểm tra liệu mức tăng là do nhiều đơn hay vài đơn hàng lớn.
3. **Đầu–giữa tháng 11/2011:** các mốc 03/11, 07/11 và 14/11 đáng xem xét; tháng 11/2011 có doanh thu **£245.020,52**, cao hơn tháng 10/2011 khoảng **60,3%**, quantity cao hơn khoảng **45,5%**, số invoice cao hơn khoảng **41,5%**.
4. **Tháng 11/2010:** doanh thu **£273.552,49**, cao hơn tháng 10/2010 khoảng **43,6%**; quantity tăng khoảng **33,3%**, số invoice tăng khoảng **22,4%**. Mức tăng qua hai năm gợi ý có thể điều tra yếu tố mùa vụ trong **retail nguồn**, nhưng không chứng minh đây là mùa vụ HairCare.
5. **Cuối chuỗi:** dữ liệu kết thúc ngày 09/12/2011; tháng 12/2011 chỉ có dữ liệu đến ngày 09/12. Không so sánh tổng tháng 12 này trực tiếp với tháng đầy đủ hoặc kết luận doanh thu tháng giảm.

## Câu hỏi gợi ý khi tìm ngữ cảnh

- Ngày đó có đơn khách buôn/đơn lớn, đơn lặp, sự kiện giao hàng hoặc điều chỉnh invoice không?
- SKU có mô tả hàng Giáng sinh/mùa vụ hay sản phẩm quà tặng không? Các mô tả trong các ví dụ có đồ gia dụng và đồ trang trí; chúng không phải bằng chứng về HairCare.
- Có khuyến mãi, lịch bán hàng, ngày lễ, thay đổi giá hoặc thay đổi điều kiện vận hành nào không? Dataset hiện tại không có các trường này.
- Spike có xuất hiện trên toàn bộ retail không, hay chủ yếu trong 59 SKU được chọn? Ví dụ 2010-06-07 chỉ khoảng p83,6 doanh thu trên toàn bộ dataset nhưng là spike robust trên 59 SKU; 2010-11-15, 2011-09-20 và 2011-11-14 lại rất cao cả trên toàn bộ dataset.
- Invoice/quantity lớn có phải giao dịch hợp lệ? Không nên xóa hoặc winsorize actual chỉ để giảm metric; cần xác minh với nguồn hoặc báo cáo riêng phân tích nhạy cảm nếu có căn cứ.

## File kiểm tra liên quan

- `high_revenue_period_audit.csv`: top 20 ngày, mức tập trung doanh thu theo top invoice/top 3 invoice.
- `mapped_monthly_activity_audit.csv`: doanh thu, quantity, invoice và số SKU theo tháng.
- `weekly_model_comparison_folds.csv`: validation/holdout theo các fold mô hình.
- `retail_transactions_cleaned.csv.gz`: giao dịch đã làm sạch; dùng `Invoice`, `StockCode`, `Description`, `Quantity`, `Price`, `sale_date` để mở rộng tra cứu.

