# FOLMARÉ — HairCare Insight

Angular storefront and admin portal for a curated haircare edit (Moroccanoil · Davines · Rahua · AROMATICA),
with the crawled product data and the demand-forecasting work behind it.

```
ML-WEB/
├── src/                      # Angular app
│   ├── index.html, main.ts, styles.scss
│   ├── styles/               # design tokens, global and component CSS
│   └── app/
│       ├── app.component.ts, app.config.ts, app.routes.ts
│       ├── core/             # data (mock backend), models, services, guards, layouts, environment
│       ├── features/
│       │   ├── storefront/   # customer pages (home, shop, product, cart, checkout, quiz, account…)
│       │   └── admin/        # admin portal (dashboard, products, inventory, orders, forecast…)
│       └── shared/           # header, footer, cart drawer, toast, small UI pieces
├── public/assets/            # static files served as /assets/…
│   ├── data/haircare-db.json #   seed of the mock backend (generated)
│   ├── products/, media/     #   product images and card hover clips (generated)
│   ├── hero/, hero-hd/       #   product cut-outs for the home page
│   ├── folmare/              #   FOLMARÉ logo, favicon and editorial images
│   └── brand/                #   partner brand logos
├── scripts/                  # Python: crawl brand sites, build the seed and the 150-product catalog
├── data/
│   ├── store/                # crawled products and brand media; product_data/storefront = the 150 on the web
│   └── ml/                   # forecasting datasets and experiments
└── docs/                     # proposal, plans, quiz engine, EDA, report outline, design notes, brand kit
```

## Run

```bash
npm install
npm start                      # http://localhost:4200
npm run build                  # production build in dist/
```

## Rebuild the product data

```bash
python scripts/crawl_variant_images.py   # packshot of each size (only when the product edit changes)
python scripts/build_mock_db.py
```

Picks the 150 storefront products from `data/store/product_data/catalog/`, exports their images and hover
media to `public/assets/`, writes the seed `public/assets/data/haircare-db.json` (and `db.json` for
`npm run mock`) and the dataset `data/store/product_data/storefront/`. Video clips need ffmpeg on PATH or
`pip install imageio-ffmpeg`. See `data/README.md` for the data layout.
