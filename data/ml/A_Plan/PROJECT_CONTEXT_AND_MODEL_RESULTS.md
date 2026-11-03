# Project context and ML results

Updated: 27 October 2026

This note consolidates the project's data and ML context, the experiments already run, the current result files, and the limitations that should be kept in mind when researching or presenting improvements. The data-preparation guide and experiment script remain the detailed sources of truth for implementation.

## 1. Project scope

The project has two separate data tracks:

| Track | Intended use | Data source | Currency |
|---|---|---|---|
| HairCare web catalog | Display products in the demo website | Crawled HairCare catalog (`products_crawl.csv`) | USD |
| ML forecasting demo | Demonstrate sales-data preparation, regression forecasting, and an inventory suggestion | Online Retail II transactions | GBP |

There is no actual HairCare transaction history joined to the HairCare catalog. The 59 retail SKUs are mapped one-to-one to 59 HairCare catalog products as **simulated labels**. The forecast values come from the original retail transactions, not HairCare sales. Do not describe the resulting model scores as accuracy on the HairCare market.

The current cleaned catalog has six normalized categories: `shampoo`, `hairmask`, `treatment`, `dry shampoo`, `conditioner`, and `hairstyling`. Web-demo availability is set to available for all 59 products, while the crawled availability is retained separately; the demo flag is not an inventory observation.

## 2. Data sources and suitability

### Main sources

- **Online Retail II**: source for the ML quantity, price, date, and revenue. The cleaned transaction output has 1,019,654 valid positive-sale rows, retains GBP, and excludes cancelled invoices and invalid quantity/price rows. Source data covers 2009–2011.
- **HairCare catalog crawl**: 59 products, used for the website and simulated product labels, not to define the retail sales targets.
- **E-commerce cosmetic reference**: 1,420 cleaned Hair listings from 12,615 source rows. It is product-listing data, not sales history; its price currency is unconfirmed and must not be joined to the ML revenue.
- **Raw alternatives** in `dataset raw/` include Olist, e-commerce transaction/forecasting datasets, Amazon product snapshots, product/review collections, cosmetic ingredient references, and HairCare product files. These have different fields and purposes; most are not direct substitutes for longitudinal HairCare sales.

### Alternative-data screening already performed

| Candidate | Observed characteristics | Potential use / limitation |
|---|---|---|
| Olist `health_beauty` | About 9,670 order-item rows and 2,444 products during 2016–2018; 335 products have at least five orders | Best candidate found for a broader health-and-beauty retail exercise. It is not HairCare-only; product-order frequency is sparse, and the available data does not provide a directly comparable sales-quantity series without additional definition and aggregation. |
| E-commerce `Beauty` transaction data | About 4,103 transaction rows and 3,964 product IDs; 136 IDs occur twice and none occur five or more times | Too sparse by product for stable per-product time-series training without changing the prediction unit or combining products. |
| Amazon Hair products | About 8,669 products with fields such as `boughtInLastMonth` | Product-popularity snapshot, not dated historical sales, so it cannot directly support time-series backtesting. |
| Other e-commerce, review, catalog, and ingredient files | Fields focus on product attributes, reviews, or separate synthetic transactions | May support product/customer analyses after a separate data audit; not established as better HairCare forecasting data. |

These are screening results, not proof that no suitable dataset exists elsewhere. Any replacement should be assessed for dated transactions, product/category identity, quantity or an explicitly defined proxy, price/currency, coverage, and enough repeated observations for a temporal holdout.

## 3. Cleaning and prepared ML panel

The reproducible preparation entry point is [`prepare_haircare_demo.py`](./prepare_haircare_demo.py). It reads raw data without editing it and writes outputs to [`../processed/`](../processed/).

Key processing decisions:

- Overlapping invoices between Online Retail II sheets are removed from the later sheet only when the complete invoice contents match; a conflicting overlap stops the pipeline.
- Cancelled invoices, missing/non-positive quantity, missing/non-positive price, invalid dates, and missing SKU rows are excluded according to the documented priority order.
- Exact duplicate transaction rows within a sheet are reported but retained: there is no transaction-line ID proving they are accidental duplicates.
- Revenue is source `Quantity × Price` in GBP. The HairCare catalog USD prices are not used in ML revenue.
- The 59 retail SKUs are selected and mapped deterministically for demo purposes; mapping is not based on HairCare product similarity.
- Daily rows are completed for each mapped product and date. A zero denotes no observed source transaction for that product/day, not imputed missing data. Quantity outliers above 100 are flagged but retained.

| Panel fact | Current value |
|---|---:|
| Source transactions retained after cleaning | 1,019,654 |
| Mapped source SKUs / simulated HairCare labels | 59 / 59 |
| Daily panel period | 1 Dec 2009–9 Dec 2011 |
| Number of calendar days | 739 |
| Daily product-date rows | 43,601 (= 59 × 739) |
| Mapped source transaction rows | 126,981 |
| Total quantity in the panel | 1,721,039 |
| Source revenue in the panel | £3,626,460.44 |
| Zero-sale product-days | 12,535 (28.75%) |
| Source lines with quantity > 100, retained and flagged | 1,805 |

The panel total quantities and revenue were reconciled against the cleaned source transactions for the 59 mapped SKUs. The panel is suitable for demonstrating an ML workflow, but its simulated product identities prevent HairCare business conclusions.

## 4. Model workflows and findings

### Original notebook demo

[`revenue_inventory_ml_demo.ipynb`](./revenue_inventory_ml_demo.ipynb) contains the original EDA, daily and weekly forecasting workflow, and inventory-suggestion demonstration. The original daily workflow compares Seasonal Naive, Random Forest, Extra Trees, and HistGradientBoosting; the weekly workflow compares HistGradientBoosting, LightGBM, and XGBoost.

Previously recorded notebook results:

- HistGradientBoosting was selected through validation for both daily targets. Daily holdout WAPE was approximately **63.7% for revenue** and **69.0% for quantity**.
- Weekly holdout WAPE was approximately **40.6% for revenue** and **46.4% for quantity**.
- Daily and weekly WAPE values have different aggregation granularity and should not be directly compared as if they were the same evaluation target.
- The notebook contains saved outputs from its previous runs. They are not refreshed by the experiment script and may not represent the latest benchmark.

### Additional weekly benchmark

[`model_experiments.py`](./model_experiments.py) runs an independent benchmark on the prepared daily panel. It aggregates to weeks ending Sunday; uses lags 1, 2, 4, 8, 13, 26, and 52 weeks, rolling means of 4, 8, and 13 weeks, and calendar features; and compares:

1. Seasonal Naive (lag 1 week)
2. Linear Regression
3. LightGBM
4. Tuned LightGBM
5. CatBoost
6. XGBoost
7. Two-stage LightGBM (positive-demand classifier followed by conditional quantity/revenue regression)

The script uses three rolling validation origins, evaluates both weekly-updated and two-week recursive forecasts, and keeps a final holdout for evaluation. Model selection is based on mean **two-week recursive validation MAE**, not holdout performance. Two-week recursive forecasting uses the first forecast as input to the second week's prediction.

| Target | Selected by validation MAE | Validation MAE | Holdout MAE | Holdout WAPE | Holdout RMSE | Holdout R² |
|---|---|---:|---:|---:|---:|---:|
| Quantity (`quantity_sold`) | CatBoost | 117.11 units/week | 109.95 units/week | 45.1% | 147.15 units/week | 0.558 |
| Revenue (`revenue_gbp`) | Linear Regression | £257.18/week | £271.26/week | 49.7% | £364.57/week | 0.542 |

Interpretation and caveats:

- These are errors in the simulated 59-SKU retail panel, not HairCare demand accuracy.
- The selection is based on only three validation origins. It is not enough evidence for stable superiority.
- The validation winner need not be best on holdout. For revenue, Linear Regression is selected by validation MAE, but its holdout MAE is worse than the other boosted candidates. XGBoost has the lowest holdout revenue MAE among this run's candidates, at about £202.65/week; that does not make it the selected model because holdout must remain an evaluation set.
- For quantity, CatBoost is selected by validation MAE, while LightGBM has a slightly lower holdout MAE (about 108.13 units/week). This is another sign that model ranking is not stable across the available evaluation windows.
- R² is not a percentage of forecast accuracy. WAPE also has known sensitivity to aggregate actual volume and should be reported alongside an interpretable unit-based metric such as MAE.
- Two-stage classification/regression is an extension of the course's core regression material; it should be explained as optional, not as a required advanced method.

The earlier experiments with longer lags, price-related features, two-stage modeling, and alternative boosting models did not establish a robust, repeatable improvement. More model complexity or changing the error metric alone cannot correct a mismatch between the source retail products and HairCare labels or add missing business context.

## 5. Sales spikes and investigation context

[`../processed/retail_anomaly_context_notes.md`](../processed/retail_anomaly_context_notes.md) gives the full anomaly table, invoice examples, source descriptions, and questions for external context research.

The flags use robust z-scores on daily quantity and revenue for the 59 mapped SKUs, with a threshold of 3.5. The union contains ten dates:

`2010-06-07`, `2010-11-11`, `2010-11-15`, `2010-11-25`, `2011-01-11`, `2011-03-29`, `2011-08-04`, `2011-09-20`, `2011-11-03`, `2011-11-14`.

Prioritize:

- **8–16 Nov 2010**: consecutive elevated activity; the week ending 14 Nov has mapped-panel revenue £77,344.97 and quantity 34,866.
- **11 Jan 2011**: the top three invoices account for about 86.2% of mapped-panel revenue that day.
- **20 Sep 2011** and **14 Nov 2011**: high days both in the mapped panel and relative to the full retail dataset.
- **November in both 2010 and 2011**: mapped monthly revenue rises compared with the preceding October.

These are leads, not causes. Some mapped source descriptions are household/seasonal decorative goods rather than HairCare. Do not label spikes as holidays, promotions, wholesale activity, or data errors without corroborating context. The source does not contain promotion, inventory, customer segment, or explanatory event fields.

## 6. Complete list of model result and related diagnostic files

Shared preparation outputs and data audits are in [`../processed/`](../processed/). Plan A's model comparisons, experimental forecasts, and inventory recommendations are in [`results/`](./results/).

### Direct outputs from the additional weekly benchmark

| File | Contents |
|---|---|
| [`weekly_model_comparison.csv`](./results/weekly_model_comparison.csv) | Summary comparison for 7 candidate methods × 2 targets (14 rows); validation and holdout WAPE, MAE, RMSE, R²; selected-by-validation flag. |
| [`weekly_model_comparison_folds.csv`](./results/weekly_model_comparison_folds.csv) | Per-fold validation and holdout scores (56 rows); use to see how model performance varies by validation window. |
| [`weekly_sales_forecast_experimental.csv`](./results/weekly_sales_forecast_experimental.csv) | Two-week recursive experimental forecast for 59 products (118 product-week rows; dates 18 and 25 Dec 2011 in the current output). Includes the model chosen separately for quantity and revenue. |
| [`demo_inventory_recommendations_experimental_weekly.csv`](./results/demo_inventory_recommendations_experimental_weekly.csv) | Experimental weekly inventory suggestions for 59 products, based on forecast quantity and explicitly assumed stock/lead-time/review-period/safety-stock parameters. |

### Original notebook recommendation outputs

| File | Contents / status |
|---|---|
| [`demo_inventory_recommendations.csv`](./results/demo_inventory_recommendations.csv) | Daily-notebook inventory recommendation output; uses demo inventory assumptions. |
| [`demo_inventory_recommendations_weekly.csv`](./results/demo_inventory_recommendations_weekly.csv) | Weekly-notebook inventory recommendation output; uses demo inventory assumptions. |

The inventory outputs are demonstrations, not operational reorder advice. The source files do not provide actual on-hand inventory, lead times, safety stock policy, or review period.

### Supporting sales diagnostics (not model scores)

| File | Contents |
|---|---|
| [`high_revenue_period_audit.csv`](./results/high_revenue_period_audit.csv) | High-revenue dates and invoice concentration for the mapped source SKUs. |
| [`mapped_monthly_activity_audit.csv`](../processed/mapped_monthly_activity_audit.csv) | Month-level revenue, quantity, invoices, and SKU activity. |
| [`eda_category_summary.csv`](../processed/eda_category_summary.csv) | EDA by simulated product category. |
| [`eda_product_summary.csv`](../processed/eda_product_summary.csv) | EDA by product/SKU. |
| [`eda_monthly_summary.csv`](../processed/eda_monthly_summary.csv) | Monthly EDA totals. |

The original notebook's model score tables and prediction plots are stored as notebook cells, not exported as dedicated score CSVs. The generated benchmark CSVs above are the latest standalone model comparison for the additional experiment script.

## 7. Other key project files

- [`DATA_PREPARATION_GUIDE.md`](./DATA_PREPARATION_GUIDE.md): detailed preparation, schema, audit, reproduction, and interpretation documentation.
- [`prepare_haircare_demo.py`](./prepare_haircare_demo.py): source cleaning and output generation.
- [`model_experiments.py`](./model_experiments.py): weekly model benchmark, recursive forecasts, recommendations, and anomaly audits.
- [`data_preparation_haircare_demo.ipynb`](./data_preparation_haircare_demo.ipynb): data preparation/exploration notebook; use the script as the reproducible source for the latest outputs.
- [`dataset_survey_haircare.ipynb`](./dataset_survey_haircare.ipynb): source dataset survey.
- [`../processed/haircare_demo_daily_sales.csv`](../processed/haircare_demo_daily_sales.csv): daily ML panel.
- [`../processed/haircare_demo_product_mapping.csv`](../processed/haircare_demo_product_mapping.csv): mapping from retail source SKUs to simulated HairCare identities.
- [`../processed/retail_transactions_cleaned.csv.gz`](../processed/retail_transactions_cleaned.csv.gz): cleaned source transactions for audit and traceability.
- [`../processed/preparation_quality_report.csv`](../processed/preparation_quality_report.csv), [`../processed/retail_cleaning_report.csv`](../processed/retail_cleaning_report.csv), and [`../processed/data_quality_audit.csv`](../processed/data_quality_audit.csv): preparation and data-quality checks.

## 8. Reproduction

From the project root in PowerShell:

```powershell
python data\prepare_haircare_demo.py
python data\ml\A_Plan\model_experiments.py
```

The preparation script recreates cleaned data and preparation reports. The experiment script recreates the standalone weekly benchmark, forecasts, inventory suggestions, and related sales audits. The experiment requires `pandas`, `numpy`, `scikit-learn`, `lightgbm`, `xgboost`, and `catboost`; available versions depend on the active Python environment. The original notebook may have saved outputs from an earlier execution, so check the output timestamps and compare against the generated CSVs before using results in a report.

## 9. Suggested next research steps

1. Verify the origin and business context of the flagged invoices/dates using the source dataset documentation or an authoritative external reference.
2. Decide whether the project question is **HairCare-specific forecasting** or **general retail forecasting**. If it is HairCare-specific, seek a dated HairCare transaction dataset instead of relying on simulated labels.
3. Before adding model complexity, inspect target aggregation, product frequency, zero-sales definition, invoice concentration, and data leakage. Keep a chronological holdout untouched during model selection.
4. Compare a course-aligned Linear Regression baseline against simple seasonal baselines using consistent folds, horizons, and reported metrics. Present both validation and holdout results.
5. Treat feature additions (calendar/events, price/promotion, stock availability) as hypotheses until those fields are sourced and verified. Do not infer demand effects from dates alone.
6. Keep recommendation parameters visibly labeled as assumptions unless real stock and lead-time data is obtained.
