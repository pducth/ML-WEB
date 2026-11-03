# Data layout

```
data/
├── store/                      # dữ liệu cho web bán lẻ (crawl từ website chính thức của 4 thương hiệu)
│   ├── product_data/           # sản phẩm: moroccanoil/ aromatica/ rahua/ davines/ + catalog/ (gộp)
│   └── brand_media/            # video sản phẩm, ảnh campaign, ảnh texture/before-after/model, icon thành phần
└── ml/                         # dữ liệu và thí nghiệm cho mô hình dự báo
    ├── raw/                    # dataset gốc — không chỉnh sửa
    ├── processed/              # đầu ra chuẩn của pipeline chuẩn bị dữ liệu (dùng chung cho Plan A và B)
    ├── A_Plan/                 # script, notebook, tài liệu và kết quả Plan A (A_Plan/results/)
    └── B_Plan/                 # script, báo cáo và dự báo Plan B (B_Plan/mapped_59_skus/)
```

## store/ — dữ liệu bán hàng

Bốn thương hiệu **Moroccanoil · AROMATICA · Rahua · Davines**, cùng 6 danh mục (Shampoo, Conditioner,
Hair Masks, Treatment / Oil, Dry Shampoo, Styling & Finishing), giá USD.

- `product_data/` — xem [store/product_data/README.md](store/product_data/README.md).
  `product_data/catalog/` là toàn bộ 242 sản phẩm crawl được; `product_data/storefront/` là **150 sản phẩm
  đang bán trên web** (xem [storefront/README.md](store/product_data/storefront/README.md)).
- `brand_media/` — xem [store/brand_media/README.md](store/brand_media/README.md).

Mọi đường dẫn file lưu trong dữ liệu (`image_local_path`, `local_path`, `poster_path`) tính từ thư mục gốc repo,
dạng `data/store/...`.

Tạo lại từ thư mục gốc repo:

```powershell
python scripts\crawl_brand_products.py      # product_data/ (AROMATICA, Rahua, Davines) + catalog/
python scripts\crawl_brand_media.py         # brand_media/ (cả 4 thương hiệu)
python scripts\crawl_variant_images.py      # ảnh packshot theo từng size của các sản phẩm trên web
python scripts\build_mock_db.py             # chọn 150 sản phẩm → seed web + product_data/storefront/
```

## ml/ — dữ liệu dự báo

- `raw/` chứa dataset gốc (Online Retail II, E-commerce cosmetic, products_crawl). Giữ nguyên các file này.
- `processed/` là đầu ra chuẩn dùng chung của pipeline chuẩn bị dữ liệu. Plan A và Plan B đều đọc giao dịch
  Online Retail II đã làm sạch (`retail_transactions_cleaned.csv.gz`) và mapping 59 SKU HairCare mô phỏng từ đây.
  Không copy các input dùng chung này vào thư mục của từng plan.
- `A_Plan/` chứa script, notebook, tài liệu phân tích và kết quả Plan A trong `A_Plan/results/`.
- `B_Plan/` chứa script, báo cáo và kết quả dự báo Plan B. Dự báo theo mapping nằm trong
  `B_Plan/mapped_59_skus/`; phần điều tra ngày bất thường nằm trực tiếp trong `B_Plan/`.

Một file chỉ thuộc `processed/` khi nó là dataset đã chuẩn bị chuẩn hoặc audit dùng chung cho các plan; so sánh
mô hình, dự báo, khuyến nghị tồn kho và báo cáo của chúng nằm trong plan tương ứng.

Tạo lại dữ liệu `processed/` từ thư mục gốc repo:

```powershell
python data\ml\A_Plan\prepare_haircare_demo.py
```

Notebook trong `A_Plan/` và `docs/EDA/` tự tìm `ml/raw` và `ml/processed` khi mở từ thư mục gốc repo hoặc từ thư
mục của notebook.
