# FOLMARÉ — HairCare Insight

Angular storefront and admin portal for a curated, multi-brand haircare store (Moroccanoil · Davines · Rahua ·
AROMATICA): 150 products, a rule-based Hair Quiz that builds an explained routine across the four brands, a store
assistant chatbot, and an admin portal with inventory and a demand-forecast module.

**Live demo:** https://ml-web-phi.vercel.app/ (store) · https://ml-web-phi.vercel.app/admin (admin)

Data and transactions are simulated in the browser (no backend): the seed in `public/assets/data/haircare-db.json`
is loaded on first visit and kept in local storage.

## Features

| Area | What it does |
|---|---|
| Storefront | Search with typo tolerance, filters and sorting, product pages with size variants, cart and cart drawer, checkout with vouchers, cash on delivery or bank transfer (15-minute payment window), order history, cancellation, returns and verified reviews, wishlist |
| Hair Quiz | 8 questions → IF–THEN ruleset (18 rules, 7 need labels) → a 4-step routine with a reason for each product, in-stock only, saved to the hair profile |
| Chatbot and FAQ | Intent scoring over 23 topics, answers built from live catalogue, order and settings data, sharing one policy source with the FAQ page |
| Admin portal | Dashboard KPIs, products (brand, category, quiz tags, sizes), inventory (order stock / receive stock), orders and returns, vouchers, customers, review moderation, settings |
| Forecast | Weekly demand forecast per category with WAPE tracking, drift flag and restock suggestions |

Access is split into Guest, Customer and Admin with route guards (`src/app/core/guards/`).

## Project structure

```
ML-WEB/
├── src/                          # Angular app
│   ├── styles/                   #   design tokens, global and component CSS
│   └── app/
│       ├── core/                 #   mock backend, models, services, guards, layouts
│       ├── features/
│       │   ├── storefront/       #   customer pages
│       │   └── admin/            #   admin portal
│       └── shared/               #   header, footer, cart drawer, chatbot, toast, UI pieces
├── public/                       # static files served from the site root
│   ├── robots.txt
│   └── assets/                   #   seed data, product images, hero cut-outs, logos, quiz art
├── scripts/                      # Python: crawl brand sites, build the 150-product catalogue and the seed
├── data/                         # crawled store data and forecasting datasets (see data/README.md)
│   ├── store/                    #   not in git (1.3 GB); rebuilt by scripts/
│   └── ml/                       #   raw, processed, Plan A and Plan B experiments
└── docs/
    ├── HairRoutineEngine/        #   Hair Quiz ruleset (loaded by the app, see angular.json) + Python reference engine and tests
    ├── EDA/                      #   exploratory analysis for the forecast
    ├── brand-kit/                #   FOLMARÉ logo system and brand guidelines
    ├── design/                   #   design system specification
    └── HairCare_proposal.md, …   #   proposal (screens C01–C16, A01–A14), feature summary, forecast plan
```

Coursework material (report, test evidence, figures, wireframes) is kept outside the repository; see `.gitignore`.

## Run

```bash
npm install
npm start                      # http://localhost:4200
npm run build                  # production build in dist/haircare-insight/browser
npm run mock                   # optional json-server on db.json (port 3000)
```

Deployed on Vercel from this repository (`vercel.json`: build command, output folder and SPA rewrites).

## Hair Quiz engine tests

The ruleset `docs/HairRoutineEngine/hair_routine_rules.json` is shared by the app (TypeScript) and a Python
reference engine. The reference engine has 79 unit tests, including an exhaustive run over all 113,400 valid
answer combinations (standard library only, about one minute):

```bash
cd docs/HairRoutineEngine
python -m unittest -v test_hair_routine_engine
```

## Rebuild the product data

```bash
python scripts/crawl_variant_images.py   # packshot of each size (only when the product edit changes)
python scripts/build_quiz_catalog.py     # quiz tags and routine candidates for the 150 products
python scripts/build_mock_db.py          # seed for the app
```

`build_mock_db.py` picks the 150 storefront products from `data/store/product_data/catalog/`, exports their
images and hover media to `public/assets/`, and writes the seed `public/assets/data/haircare-db.json`
(plus `db.json` for `npm run mock`) and the dataset `data/store/product_data/storefront/`. Video clips need ffmpeg
on PATH or `pip install imageio-ffmpeg`. Python packages are listed in `scripts/requirements.txt`.
