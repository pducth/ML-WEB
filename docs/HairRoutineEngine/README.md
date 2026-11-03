# Hair Routine Engine

Hệ chuyên gia tư vấn chăm sóc tóc theo luật **IF–THEN**. Câu hỏi, đáp án, luật suy diễn, thứ tự ưu tiên, routine và nhãn sản phẩm được đặt trong JSON; mã Python nạp cấu hình, kiểm tra đầu vào, suy diễn kết quả, chọn sản phẩm và ghi nhận sự kiện quiz.

Ruleset hiện tại là phiên bản `3.0.0` (thiết kế lại cho **150 sản phẩm** đang bán trên web, bốn thương hiệu Moroccanoil, Davines, Rahua, AROMATICA), locale `vi-VN`. Các business rule được khai báo trong ruleset: BR-QUZ-01, BR-QUZ-02, BR-QUZ-03, BR-QUZ-04, BR-QUZ-05, BR-QUZ-06, BR-QUZ-08, BR-QUZ-09 và BR-QUZ-10.

### Có gì mới ở phiên bản 3.0.0

- **Quiz 8 câu** (7 bắt buộc + 1 tùy chọn), bỏ câu "dùng nhiệt tạo kiểu" (và luật R-STY-02) và mục tiêu "duy trì tóc khỏe" (không có nhãn riêng). Câu độ dày tóc trở thành **bắt buộc**.
- **Da đầu có thêm đáp án `thinning`** (tóc thưa hoặc rụng nhiều) → luật R-SCA-04 → nhãn Scalp, routine dùng Davines Energizing, AROMATICA Rosemary (conditioner làm dày, serum PDRN). Sản phẩm gắn da đầu `normal` cũng dùng được cho `thinning`.
- **Mục tiêu "Mượt và tạo kiểu"** gộp "mượt, vào nếp" và "tạo texture, giữ nếp". Tóc khỏe nhận sản phẩm tạo kiểu theo kiểu tóc × độ dày (9 tổ hợp), tóc hư tổn nhận sản phẩm làm mượt/chống xù; người gội thưa nhận dry shampoo. Vì thiếu câu về nhiệt, các sản phẩm chống nhiệt được gợi ý qua tình trạng tóc (khô, xơ, hư tổn).
- **Câu 8 (tùy chọn) – ưu tiên công thức** (`formula_preference`: `none`, `botanical`, `salon`, `eco`). Mỗi sản phẩm có `quiz.formula` (danh sách thẻ). Câu này **chỉ sắp xếp lại** các ứng viên đã phù hợp (ưu tiên sản phẩm có thẻ khớp lên trước), không đổi nhãn, không loại sản phẩm hay bỏ bước. Thẻ công thức được suy ra từ định vị thương hiệu và mô tả sản phẩm (`ECO` và `formula_tags()` trong `scripts/build_quiz_catalog.py`) và **cần người phụ trách sản phẩm xác nhận**.
- **Nội dung tiếng Anh nằm trong ruleset** (`text_en`, `label_en`, `hint_en`, `title_en`, `subtitle_en`); bản TypeScript không còn bảng chữ viết sẵn.
- Giao diện: chỉ câu 2 (kiểu tóc) và câu 3 (độ dày) có hình minh họa (`public/assets/quiz/`); các câu còn lại là thẻ chữ.
- 145/150 sản phẩm vẫn có thể xuất hiện trong kết quả (vét cạn 113.400 tổ hợp). Năm mặt nạ phủ màu theo tông (Bordeaux, Cocoa, Copper, Coral, Rose Gold) không được quiz gợi ý vì quiz không hỏi tông tóc.

## Cấu trúc thư mục

| Tệp | Nội dung |
|---|---|
| `hair_routine_rules.json` | Ruleset: câu hỏi, options, luật IF–THEN, nhãn, thứ tự ưu tiên và ánh xạ mục tiêu → nhãn (`labels.goal_to_label`), routine theo nhãn, luật tồn kho/thay thế, fallback, thông báo và disclaimer. |
| `product_quiz_catalog.json` | Danh mục 150 sản phẩm: thông tin hiển thị, quiz tags, Active ban đầu, tồn kho ban đầu và khả năng được dùng làm hàng thay thế. |
| `hair_routine_engine.py` | Engine Python: nạp và kiểm tra JSON, xác thực câu trả lời, suy diễn, chọn/thay sản phẩm và ghi Quiz_Event. |
| `test_hair_routine_engine.py` | Bộ kiểm thử cho cấu hình, câu trả lời, luật, routine, tồn kho, tính tất định, sự kiện, các tổ hợp quiz và độ phủ 150 sản phẩm. |

`product_quiz_catalog.json` và phần `routine.by_label` / `routine.addons_by_label` của `hair_routine_rules.json` được **sinh bởi** `scripts/build_quiz_catalog.py` (xem mục "Cập nhật JSON"). Câu hỏi và luật IF–THEN vẫn chỉnh tay trong ruleset.

Các đường dẫn mặc định của engine trỏ đến hai file JSON ở cùng thư mục với `hair_routine_engine.py`.

## Yêu cầu và chạy kiểm thử

- Python 3.10 trở lên.
- Engine chỉ dùng thư viện chuẩn của Python; không cần cài package bên ngoài.
- Chạy lệnh từ thư mục `HairRoutineEngine`:

```bash
python -m unittest -v test_hair_routine_engine
```

Bộ test (79 ca, chạy khoảng một phút) vét cạn duyệt **113.400 tổ hợp câu trả lời hợp lệ**, kiểm tra các bất biến (nhãn, routine, add-on, tồn kho, da đầu) và độ phủ: mọi sản phẩm trừ 5 mặt nạ phủ màu theo tông đều xuất hiện trong ít nhất một kết quả, mỗi nhãn gợi ý sản phẩm của từ ba thương hiệu trở lên. Bên cạnh đó là các ca kiểm thử riêng cho thay thế sản phẩm, hết hàng, sản phẩm inactive, log SQLite và tính tất định.

## Quiz: 8 câu hỏi, bốn bước

Dấu `*` biểu thị câu bắt buộc (`required: true`). Câu tùy chọn có thể bỏ trống.

| Bước | Câu hỏi | Các lựa chọn |
|---|---|---|
| 1. Da đầu | 1. `scalp_condition` * | `normal`, `oily`, `dry_sensitive`, `flaky`, `thinning`. |
| 2. Sợi tóc | 2. `hair_texture` * (có hình), 3. `hair_thickness` * (có hình), 4. `hair_damage` * | Kiểu tóc: `straight`, `wavy`, `curly`; độ dày: `fine`, `medium`, `thick`; tình trạng: `healthy`, `dry_frizzy`, `damaged`. |
| 3. Màu tóc và thói quen gội | 5. `chemical_history` * (nhiều lựa chọn), 6. `wash_frequency` * | Hóa chất: `none`, `dyed`, `bleached` ("Blonde, bleached or grey"), `permed`; tần suất gội: `daily`, `every_2_3_days`, `weekly`. |
| 4. Mục tiêu và sở thích | 7. `primary_goal` *, 8. `formula_preference` (tùy chọn) | Mục tiêu: `repair`, `scalp_care`, `color_protect`, `define_curls`, `hydrate`, `volume`, `smooth_style`; công thức: `none`, `botanical`, `salon`, `eco`. |

Lịch sử hóa chất là câu nhiều lựa chọn. `none` có thuộc tính loại trừ, vì vậy không được chọn cùng `dyed`, `bleached` hoặc `permed`. ID trong bảng là giá trị cần gửi cho engine; nội dung tiếng Việt cho người dùng được định nghĩa riêng trong ruleset.

### Ví dụ dữ liệu đầu vào

```python
answers = {
    "scalp_condition": "oily",
    "hair_damage": "damaged",
    "hair_texture": "curly",
    "hair_thickness": "medium",
    "wash_frequency": "every_2_3_days",
    "chemical_history": ["bleached", "permed"],
    "primary_goal": "repair",
    "formula_preference": "botanical",  # tùy chọn
}
```

Engine từ chối câu trả lời bắt buộc bị thiếu, option không hợp lệ, câu hỏi lạ, kiểu dữ liệu không phù hợp và tổ hợp vi phạm lựa chọn loại trừ. Lỗi đầu vào là `QuizInputError`; danh sách vấn đề cụ thể có trong thuộc tính `issues`. Danh sách đáp án nhiều lựa chọn được loại phần tử trùng và chuẩn hóa thứ tự, nên thứ tự nhập không làm thay đổi kết quả.

## Luật và thứ tự ưu tiên nhãn

Ruleset có **18 luật**. Mỗi luật gồm ID, nhãn, mô tả và điều kiện `when`. Nhiều luật có thể cùng khớp; engine thu thập các nhãn khớp, loại nhãn trùng rồi chọn nhãn chính:

1. **Mục tiêu của khách** (`labels.goal_to_label`): `repair`→Repair, `scalp_care`→Scalp, `color_protect`→Color, `define_curls`→Curl, `hydrate`→Hydration, `volume`→Volume, `smooth_style`→Styling. Nếu nhãn của mục tiêu nằm trong các nhãn đã khớp luật thì nó là `primary_label`.
2. Các nhãn còn lại (và toàn bộ nhãn khi luật của mục tiêu không khớp, ví dụ chọn "định hình xoăn" nhưng tóc thẳng) xếp theo thứ tự ưu tiên:

**Repair > Scalp > Color > Curl > Hydration > Volume > Styling**

Nhãn đứng đầu danh sách là `primary_label` và dùng để tạo routine. Nhãn đứng kế tiếp là `secondary_label`; nhãn phụ chỉ được dùng để chọn tối đa **một** add-on tùy chọn. Nếu không có nhãn phụ, add-on là `None`.

Tóm tắt các điều kiện được khai báo:

- **Repair:** tóc hư tổn; tóc khô/xơ hoặc hư tổn sau tẩy/uốn; hoặc mục tiêu là phục hồi.
- **Scalp:** da đầu khô/nhạy cảm, bong tróc, dầu nhờn, thưa/rụng nhiều; hoặc mục tiêu là chăm sóc da đầu.
- **Color:** tóc đã nhuộm/tẩy hoặc mục tiêu là giữ màu.
- **Curl:** tóc xoăn tự nhiên; tóc gợn sóng kèm mục tiêu định hình xoăn; hoặc tóc đã uốn hóa chất kèm mục tiêu định hình xoăn.
- **Hydration:** tóc khô/xơ; mục tiêu cấp ẩm; hoặc gội hằng ngày kết hợp tóc đã qua xử lý hóa chất.
- **Volume:** mục tiêu tăng phồng; hoặc tóc mảnh kết hợp da đầu dầu.
- **Styling:** chỉ khi mục tiêu là "Mượt và tạo kiểu" (nên nhãn này luôn là nhãn chính, không bao giờ là nhãn phụ).

Nếu không luật nào khớp (ví dụ mục tiêu "định hình xoăn" với tóc thẳng chưa uốn), engine trả về nhãn mặc định **Hydration**, đặt `fallback_used` thành `true` và thêm ghi chú fallback. Fallback không thay thế việc xác thực: thiếu câu trả lời bắt buộc vẫn gây lỗi.

### Cú pháp điều kiện trong ruleset

Điều kiện hỗ trợ:

- `{"q": "hair_damage", "op": "eq", "value": "damaged"}` — một đáp án bằng một giá trị.
- `{"q": "scalp_condition", "op": "in", "value": ["oily", "flaky"]}` — một đáp án thuộc một danh sách giá trị.
- `{"q": "chemical_history", "op": "contains_any", "value": ["dyed", "bleached"]}` — câu nhiều lựa chọn có ít nhất một giá trị trong danh sách.
- `{"all": [...]}`, `{"any": [...]}`, `{"not": {...}}` — kết hợp điều kiện AND, OR và NOT; có thể lồng nhau.

Điều kiện của luật và điều kiện `when` trên ứng viên sản phẩm đều dùng cú pháp này. Các đáp án của câu tùy chọn chưa được trả lời không làm khớp các điều kiện trực tiếp `eq`, `in` hoặc `contains_any`.

## Routine và danh mục sản phẩm

Engine tạo đúng bốn mục routine theo thứ tự:

| Thứ tự | Bước | Vai trò |
|---:|---|---|
| 1 | Cleanse — làm sạch | Sản phẩm được gắn bước `cleanse`, thường thuộc danh mục Shampoo. |
| 2 | Condition — dưỡng | Conditioner. |
| 3 | Treat & Nourish — điều trị/chăm sóc | Hair Masks, Treatment / Oil hoặc sản phẩm được gắn bước Treat, bao gồm sản phẩm chăm sóc da đầu trước khi gội. |
| 4 | Style & Protect — tạo kiểu/bảo vệ | Styling & Finishing. |

Catalog hiện có 150 sản phẩm: **36 Cleanse, 29 Condition, 46 Treat và 39 Style & Protect** (Moroccanoil 53, Davines 44, Rahua 33, AROMATICA 20). Mỗi sản phẩm có:

- `product_id`, `key`, tên, thương hiệu, danh mục, URL trang hãng, đường dẫn ảnh trên web và giá (size nhỏ nhất, USD).
- `quiz.scalp`: các loại da đầu phù hợp; `"all"` nghĩa là phù hợp với mọi loại da đầu theo cấu hình.
- `quiz.needs`: một đến ba nhãn nhu cầu sản phẩm đáp ứng, nhãn đầu tiên là mục đích chính.
- `quiz.step`: bước routine của sản phẩm.
- `quiz.formula`: thẻ công thức (`botanical`, `salon`, `eco`), có thể rỗng.
- `allow_auto_substitute`: cho biết sản phẩm có được dùng làm hàng thay thế tự động hay không.
- `active`, `inventory_available`: giá trị trạng thái/tồn kho ban đầu.

Các trường quiz chuẩn để engine dùng là `quiz.scalp`, `quiz.needs`, `quiz.step` và `quiz.formula`.

Việc gán bước dựa trên vai trò tư vấn, không chỉ dựa vào danh mục bán hàng. Dry Shampoo được gắn bước `style_protect`; các sản phẩm tẩy tế bào chết da đầu (scalp scrub) và tonic/serum da đầu thuộc bước `treat` (dùng trước hoặc giữa các lần gội); dầu gội và co-wash thuộc bước `cleanse`.

Ứng viên cho từng nhãn và bước được liệt kê trong `routine.by_label` (28 danh sách, mỗi danh sách 4–12 ứng viên). Engine xét theo thứ tự cấu hình và lấy ứng viên đầu tiên có điều kiện `when` khớp, phù hợp da đầu và còn hàng. Vì vậy mỗi danh sách xếp **ứng viên chuyên biệt trước, lựa chọn an toàn cuối cùng**. Ví dụ nhãn Volume, bước Cleanse: tóc mảnh gội cách ngày → Davines VOLU; tóc mảnh gội hằng ngày → Rahua Voluminous; da đầu dầu → Moroccanoil Clarifying; còn lại → Moroccanoil Extra Volume.

Các điều kiện dùng bảy câu bắt buộc (da đầu, kiểu tóc, độ dày, tình trạng sợi tóc, hóa chất, tần suất gội, mục tiêu), nên cùng một nhãn cho ra routine khác nhau tùy khách: tóc tẩy hư tổn nhận dòng HEART OF GLASS của Davines, tóc dày xoăn nhận dòng Rahua Hydration, da đầu dầu nhận sản phẩm AROMATICA/Davines, v.v. Add-on của từng nhãn phụ cũng được chọn theo điều kiện (`routine.addons_by_label`), đó là nơi dầu dưỡng và sản phẩm da đầu bổ sung xuất hiện (nhãn Styling không có add-on vì không bao giờ là nhãn phụ).

### Ưu tiên công thức (câu 8)

Khi khách chọn `botanical`, `salon` hoặc `eco`, engine sắp xếp lại danh sách ứng viên đã đủ điều kiện (`when`, da đầu) của từng bước và của add-on: sản phẩm có `quiz.formula` chứa giá trị đã chọn đứng trước (ổn định, giữ nguyên thứ tự khai báo giữa các sản phẩm cùng nhóm), rồi mới tới tồn kho/thay thế như bình thường. `none` hoặc bỏ trống cho kết quả giống hệt khi không có câu này. Cấu hình ở `routine.preference` (`question`, `product_tag`, `none_value`) và được `validate_config` kiểm tra.

### Quy tắc thay thế khi hết hàng

Một sản phẩm chỉ được chọn nếu trạng thái **Active** và `Available > 0`. Khi ứng viên không khả dụng, engine thực hiện:

1. Thử các ứng viên tiếp theo được khai báo cho cùng nhãn và bước trong ruleset.
2. Nếu các ứng viên đó đều không khả dụng, tìm sản phẩm thay thế tự động: cùng bước, `quiz.needs` có nhãn chính, phù hợp da đầu, `allow_auto_substitute: true`, và không thuộc danh sách ứng viên đã khai báo cho bước đó.
3. Xếp hạng hàng thay thế theo số nhãn nhu cầu (ít nhãn hơn trước), sau đó theo `key` để kết quả ổn định.
4. Nếu không có sản phẩm phù hợp, đánh dấu bước `skipped` và thêm ghi chú lý do.

Ứng viên bị điều kiện `when` loại ra vẫn được xem là đã được ruleset chủ động liệt kê và không được quay lại làm hàng thay thế tự động. Các sản phẩm phủ màu theo tông, sản phẩm cần lựa chọn sắc tố/tông tóc riêng và một số sản phẩm giữ nếp mạnh được đánh dấu không tự động thay thế. Các dòng tím dành cho tóc tẩy/sáng màu chỉ được dùng khi điều kiện tóc tẩy khớp.

`routine.min_steps` hiện là 3. Nếu ít hơn ba bước có sản phẩm, engine vẫn trả kết quả, đặt `meets_min_steps: false` và thêm cảnh báo; engine không tự tạo sản phẩm để lấp bước. Tối đa một add-on được chọn theo danh sách của nhãn phụ, kiểm tra tương thích da đầu/tồn kho và loại sản phẩm đã có trong routine.

## Tồn kho và trạng thái Active

Các giá trị `inventory_available` trong catalog chỉ là cờ ban đầu `0`/`1` từ nguồn dữ liệu, **không phải số lượng tồn kho thực tế**. Nguồn ban đầu cũng không có trạng thái Active; hiện các sản phẩm được khởi tạo `active: true`. Không nên dùng các giá trị này để khẳng định tồn kho hoặc trạng thái bán thực tế trong production.

Định dạng tồn kho là ánh xạ từ `product_id` dạng chuỗi sang thông tin sản phẩm:

```python
inventory = {
    "8161093255385": {"active": True, "available": 12},
    "8161093189849": {"active": True, "available": 0},
}
```

- `active` phải là boolean. Sản phẩm không Active không được đề xuất.
- `available` phải là số hữu hạn, không âm. Chỉ số lượng **lớn hơn 0** mới được coi là còn hàng.
- Sản phẩm không có trong ánh xạ tồn kho được coi là không khả dụng.
- Nên lấy số lượng khả dụng từ nguồn tồn kho hiện tại, ví dụ `On Hand - Reserved`.
- Dữ liệu tồn kho sai cấu trúc được báo lỗi; lỗi từ provider cũng được truyền lên bên gọi, không bị đổi thành kết quả thành công.

Có thể cung cấp hàm truy vấn tồn kho khi khởi tạo engine. Hàm nhận `product_id`; có thể trả về số lượng hoặc cả trạng thái:

```python
from hair_routine_engine import HairRoutineEngine

engine = HairRoutineEngine.from_files(
    inventory_provider=lambda product_id: inventory_service.get_product_stock(product_id)
)
result = engine.recommend(answers)
```

Giá trị trả về nên gồm cả Active và số lượng:

```python
{"active": True, "available": 12}
```

Nếu provider chỉ trả số lượng, engine lấy Active từ catalog. Nếu muốn truyền tồn kho riêng cho từng lượt, dùng `infer(answers, inventory)` hoặc `run_quiz(answers, inventory, event_sink)`. Tồn kho truyền trực tiếp được ưu tiên hơn provider; sản phẩm thiếu trong ánh xạ đó được xem là không khả dụng.

Khi gọi `recommend()` mà không cấu hình `inventory_provider`, engine dùng `active` và `inventory_available` ban đầu trong catalog. Đây chỉ là chế độ demo, không phản ánh tồn kho trực tiếp.

## Khởi tạo và sử dụng

Nạp mặc định ruleset/catalog từ cùng thư mục với engine:

```python
from hair_routine_engine import HairRoutineEngine

engine = HairRoutineEngine.from_files()
result = engine.recommend(answers, log_event=False)

print("Nhãn chính:", result["primary_label"])
print("Nhãn phụ:", result["secondary_label"])
for item in result["routine"]:
    product = item["product"]
    print(item["step"], product["name"] if product else "Bỏ bước")
print("Add-on:", result["optional_addon"])
```

Có thể truyền đường dẫn cấu hình riêng:

```python
engine = HairRoutineEngine.from_files(
    ruleset_path="config/hair_routine_rules.json",
    tags_path="config/product_quiz_catalog.json",
    inventory_provider=inventory_service.get_product_stock,
    event_db="data/quiz_events.sqlite3",
)
```

### Các API chính

| API | Hành vi |
|---|---|
| `HairRoutineEngine.from_files(ruleset_path=..., tags_path=..., inventory_provider=..., event_db=...)` | Nạp JSON và tạo engine; các đường dẫn mặc định trỏ đến file JSON trong thư mục dự án. |
| `validate_answers(answers)` | Kiểm tra và chuẩn hóa câu trả lời; lỗi đầu vào là `QuizInputError`. |
| `infer(answers, inventory=None)` | Suy diễn thuần, không ghi log; trả nhãn, luật khớp, chẩn đoán, routine, add-on và ghi chú. |
| `recommend(answers, log_event=True)` | API tiện dụng/tương thích; dùng provider hoặc tồn kho ban đầu trong catalog, và gọi SQLite logger nếu được cấu hình. |
| `run_quiz(answers, inventory=None, event_sink=..., now=None)` | Suy diễn rồi gửi một sự kiện ẩn danh vào sink; `event_sink` là bắt buộc. |
| `log_event(result)` | Ghi sự kiện vào SQLite khi `event_db` được cấu hình; nếu không cấu hình, phương thức không tạo database. |
| `inventory_from_catalog_json(path)` | Tạo ánh xạ tồn kho ban đầu từ catalog; dùng cho demo, không thay thế nguồn tồn kho thực tế. |

Lỗi cấu hình phát sinh `RulesetError` khi engine khởi tạo. Engine kiểm tra các tham chiếu luật/options, nhãn và bước sản phẩm, dữ liệu Active/tồn kho ban đầu, bốn bước routine, giới hạn add-on và số bước tối thiểu.

### Các trường kết quả

`infer()` trả về:

- `ruleset_version`, `primary_label`, `secondary_label`, `active_labels`.
- `fallback_used`, `matched_rules` (ID, nhãn, mô tả).
- `diagnosis` (tên hiển thị và lời khuyên cho nhãn chính/phụ).
- `routine`: luôn có bốn mục; mỗi mục có trạng thái `ok`, `substituted` hoặc `skipped`, thông tin sản phẩm, lý do và ghi chú.
- `addon`: sản phẩm add-on của nhãn phụ hoặc `None`.
- `notes`, `meets_min_steps`, `disclaimer`.

Sản phẩm trong kết quả `infer()` có `key`, `product_id`, tên, danh mục, URL, URL ảnh và giá. `recommend()` giữ các trường kết quả của `infer()` đồng thời bổ sung `matched_rule_ids`, `optional_addon`, ghi chú dạng chuỗi và trường `step` trong từng mục routine; sản phẩm được trả về kèm thông tin catalog/quiz.

## Quiz_Event và quyền riêng tư

Engine cung cấp hai cách ghi sự kiện:

1. **SQLite:** truyền `event_db` khi khởi tạo; `recommend()` mặc định gọi `log_event()`.
2. **Event sink:** dùng `run_quiz()` với `ListEventSink` (bộ nhớ) hoặc `JsonlEventSink(path)` (mỗi sự kiện một dòng JSON).

Ví dụ SQLite:

```python
engine = HairRoutineEngine.from_files(event_db="data/quiz_events.sqlite3")
result = engine.recommend(answers)
```

Ví dụ JSON Lines:

```python
from hair_routine_engine import HairRoutineEngine, JsonlEventSink

engine = HairRoutineEngine.from_files()
result = engine.run_quiz(
    answers,
    inventory,
    event_sink=JsonlEventSink("data/quiz_events.jsonl"),
)
```

Sự kiện do `build_quiz_event()` tạo cho sink gồm thời gian UTC, nhãn chính, nhãn phụ và phiên bản ruleset. SQLite lưu thời gian UTC, nhãn chính/phụ, phiên bản ruleset và ID luật khớp. Không lưu đáp án thô hoặc thông tin định danh người dùng như tên, email, user/account ID hay IP. Tham số `now` của `run_quiz()` cho phép cố định thời gian khi kiểm thử.

## Cập nhật JSON

1. Câu hỏi, options, luật IF–THEN, nhãn, thứ tự ưu tiên, `labels.goal_to_label`, fallback và thông báo chỉnh trực tiếp trong `hair_routine_rules.json`.
2. **Quiz tags của sản phẩm và routine** (ứng viên theo nhãn × bước, add-on) chỉnh trong `scripts/build_quiz_catalog.py` (bảng `TAGS` và `ROUTES`/`ADDONS`) rồi chạy từ thư mục gốc repo:

   ```bash
   python scripts/build_quiz_catalog.py     # ghi lại product_quiz_catalog.json và routine trong hair_routine_rules.json
   python scripts/build_mock_db.py          # đưa nhãn quiz vào dữ liệu web
   ```

   Script đọc danh sách sản phẩm từ `data/store/product_data/storefront/products.json` và dừng nếu thiếu nhãn cho một sản phẩm hoặc một ứng viên sai bước. Khi bộ 150 sản phẩm thay đổi: chạy `build_mock_db.py`, sau đó `build_quiz_catalog.py` (thêm nhãn cho sản phẩm mới), rồi `build_mock_db.py` lần nữa.
3. Cập nhật `ruleset_version` (hằng `RULESET_VERSION` trong script hoặc trực tiếp trong JSON) khi phát hành thay đổi cấu hình.
4. Chạy lại `python -m unittest -v test_hair_routine_engine` trong thư mục này.

Bản port TypeScript của engine (`src/app/core/services/hair-routine-engine.service.ts`) đọc cùng file `hair_routine_rules.json` (được Angular copy sang `/assets/hair-routine/`) và nhãn quiz trong dữ liệu sản phẩm, nên thay đổi ở đây tự có hiệu lực trên web sau khi chạy `build_mock_db.py`. Khi sửa **logic** của engine (không chỉ dữ liệu), cần sửa đồng thời cả hai bản.

Nhãn và lời khuyên trong catalog/ruleset là dữ liệu nghiệp vụ; cần được người phụ trách sản phẩm xác nhận trước khi sử dụng chính thức. Kết quả chỉ nhằm mục đích tư vấn mỹ phẩm, không thay thế chẩn đoán da liễu hoặc điều trị y khoa.
