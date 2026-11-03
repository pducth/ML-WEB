"""Run Plan B fixed-origin experiments on the project's exact 59-SKU mapping."""

from __future__ import annotations

import warnings
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd


warnings.filterwarnings("default")

DATA_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = Path(__file__).resolve().parent
TRANSACTIONS_PATH = (
    DATA_ROOT / "processed/retail_transactions_cleaned.csv.gz"
)
MAPPING_PATH = (
    DATA_ROOT / "processed/haircare_demo_product_mapping.csv"
)
ANOMALY_PATH = (
    DATA_ROOT / "B_Plan/anomaly_days_investigation.csv"
)

HORIZON_WEEKS = 9
ORIGINS = pd.date_range("2011-08-14", "2011-10-02", freq="W-SUN")
WEEKS = pd.date_range("2009-12-06", "2011-12-04", freq="W-SUN")
MODEL_COLUMNS = [
    "A_baseline_level_features",
    "B_tweedie",
    "C_ratio_to_level",
    "D_ratio_plus_last_year_index",
    "E_naive_recent_13w_mean",
    "F_average_A_and_C",
]
MODEL_PARAMS: dict[str, Any] = {
    "n_estimators": 250,
    "learning_rate": 0.05,
    "num_leaves": 15,
    "min_child_samples": 25,
    "subsample": 0.8,
    "subsample_freq": 1,
    "colsample_bytree": 0.8,
    "reg_lambda": 1.0,
    "verbosity": -1,
    "n_jobs": 2,
    "random_state": 7,
}


def load_inputs() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if not TRANSACTIONS_PATH.is_file():
        raise FileNotFoundError(f"Missing cleaned source transactions: {TRANSACTIONS_PATH}")
    if not MAPPING_PATH.is_file():
        raise FileNotFoundError(f"Missing project SKU mapping: {MAPPING_PATH}")

    transactions = pd.read_csv(
        TRANSACTIONS_PATH,
        encoding="utf-8-sig",
        dtype={"Invoice": "string", "StockCode": "string"},
        parse_dates=["sale_date"],
    )
    mapping = pd.read_csv(
        MAPPING_PATH,
        encoding="utf-8-sig",
        dtype={"StockCode": "string", "product_id": "string"},
    ).sort_values("source_sku_rank", kind="stable")
    expected_mapping_fields = {
        "StockCode",
        "product_id",
        "product_name",
        "category",
        "source_sku_rank",
        "is_simulated",
        "label_is_simulated",
    }
    missing = expected_mapping_fields - set(mapping.columns)
    if missing:
        raise ValueError(f"Project mapping lacks required fields: {sorted(missing)}")
    if len(mapping) != 59 or mapping["StockCode"].nunique() != 59:
        raise ValueError("Expected exactly 59 unique mapped source SKUs.")
    if mapping["product_id"].nunique() != 59:
        raise ValueError("Expected 59 unique HairCare demo product IDs.")
    if not mapping["is_simulated"].astype(bool).all() or not mapping[
        "label_is_simulated"
    ].astype(bool).all():
        raise ValueError("Mapping labels must be explicitly marked as simulated.")

    mapping["StockCode"] = mapping["StockCode"].str.strip().str.upper()
    transactions["StockCode"] = transactions["StockCode"].str.strip().str.upper()
    if mapping["StockCode"].duplicated().any():
        raise ValueError("Normalized mapping StockCode values are not unique.")
    mapped_codes = set(mapping["StockCode"])
    matching = transactions.loc[transactions["StockCode"].isin(mapped_codes)]
    if matching.empty:
        raise ValueError("No cleaned source transactions match the project mapping.")
    mapping_codes_missing_from_transactions = mapped_codes - set(
        matching["StockCode"].dropna().unique()
    )
    if mapping_codes_missing_from_transactions:
        raise ValueError(
            "Mapped SKUs have no cleaned transactions: "
            f"{sorted(mapping_codes_missing_from_transactions)}"
        )

    service_rows = transactions.loc[
        transactions["description_is_service_or_adjustment"].astype(bool)
    ]
    excluded_service_codes = set(service_rows["StockCode"].dropna().unique())
    mapped_service_codes = mapped_codes.intersection(excluded_service_codes)
    if mapped_service_codes:
        raise ValueError(
            "Mapping includes SKUs marked as service/adjustment: "
            f"{sorted(mapped_service_codes)}"
        )

    enriched = matching.merge(
        mapping[
            [
                "StockCode",
                "product_id",
                "product_name",
                "category",
                "source_sku_rank",
            ]
        ],
        on="StockCode",
        how="left",
        validate="many_to_one",
    )
    if enriched["product_id"].isna().any():
        raise ValueError("At least one mapped source transaction did not join to a product.")
    return transactions, mapping, enriched


def build_weekly_panel(
    transactions: pd.DataFrame,
    mapping: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray]:
    mapping_columns = mapping[
        ["StockCode", "product_id", "product_name", "category", "source_sku_rank"]
    ].copy()
    mapped = transactions.merge(
        mapping_columns,
        on="StockCode",
        how="inner",
        validate="many_to_one",
    )
    mapped["week"] = mapped["sale_date"] + pd.to_timedelta(
        6 - mapped["sale_date"].dt.weekday,
        unit="D",
    )
    ordered_codes = mapping["StockCode"].tolist()
    weekly_index = pd.MultiIndex.from_product(
        [WEEKS, ordered_codes],
        names=["week", "StockCode"],
    )

    def wide(target: str) -> pd.DataFrame:
        result = (
            mapped.groupby(["week", "StockCode"], observed=True)[target]
            .sum()
            .reindex(weekly_index, fill_value=0)
            .unstack("StockCode")
            .reindex(index=WEEKS, columns=ordered_codes)
            .fillna(0.0)
            .astype(float)
        )
        return result

    weekly_sales = pd.DataFrame(index=WEEKS)
    for source_column, target_column in [
        ("revenue_source", "revenue_gbp"),
        ("Quantity", "quantity_sold"),
    ]:
        panel = wide(source_column)
        weekly_sales[target_column] = panel.sum(axis=1)

    date_feature = WEEKS

    def weeks_to_christmas(date: pd.Timestamp) -> float:
        christmas = pd.Timestamp(date.year, 12, 25)
        if date > christmas:
            christmas = pd.Timestamp(date.year + 1, 12, 25)
        return (christmas - date).days / 7

    christmas_feature = np.asarray([weeks_to_christmas(date) for date in date_feature])
    week_of_year = WEEKS.isocalendar().week.to_numpy(dtype=int)
    mapped = mapped.copy()
    mapped.attrs["ordered_codes"] = ordered_codes
    return mapped, weekly_sales, christmas_feature, week_of_year


def make_wide_targets(
    mapped: pd.DataFrame,
    target_column: str,
    ordered_codes: list[str],
) -> pd.DataFrame:
    dated = mapped.copy()
    dated["week"] = dated["sale_date"] + pd.to_timedelta(
        6 - dated["sale_date"].dt.weekday,
        unit="D",
    )
    return (
        dated.groupby(["week", "StockCode"], observed=True)[target_column]
        .sum()
        .unstack("StockCode")
        .reindex(index=WEEKS, columns=ordered_codes)
        .fillna(0.0)
        .astype(float)
    )


def make_training_examples(
    panel: pd.DataFrame,
    origin_index: int,
    christmas_feature: np.ndarray,
    week_of_year: np.ndarray,
    include_last_year: bool,
) -> pd.DataFrame | None:
    values = panel.to_numpy(dtype=float)
    panel_total = values.sum(axis=1)
    roll4 = values[max(0, origin_index - 3) : origin_index + 1].mean(axis=0)
    roll8 = values[max(0, origin_index - 7) : origin_index + 1].mean(axis=0)
    roll13 = values[max(0, origin_index - 12) : origin_index + 1].mean(axis=0)
    total_roll4 = panel_total[max(0, origin_index - 3) : origin_index + 1].mean()
    total_roll13 = panel_total[max(0, origin_index - 12) : origin_index + 1].mean()
    output: list[pd.DataFrame] = []

    for horizon in range(1, HORIZON_WEEKS + 1):
        target_index = origin_index + horizon
        if target_index >= len(WEEKS):
            continue
        features = pd.DataFrame(
            {
                "skuc": np.arange(values.shape[1]),
                "h": horizon,
                "rm4": roll4,
                "rm8": roll8,
                "rm13": roll13,
                "trm4": total_roll4,
                "trm13": total_roll13,
                "woy": week_of_year[target_index],
                "wtx": christmas_feature[target_index],
            }
        )
        if include_last_year:
            last_year_index = target_index - 52
            if last_year_index < 1 or origin_index - 64 < 0:
                continue
            last_year_level = values[
                last_year_index - 1 : last_year_index + 2
            ].mean(axis=0)
            last_year_baseline = values[
                origin_index - 64 : origin_index - 51
            ].mean(axis=0)
            features["ly_idx"] = last_year_level / (last_year_baseline + 1e-9)
            last_year_total = panel_total[
                last_year_index - 1 : last_year_index + 2
            ].mean()
            last_year_total_baseline = panel_total[
                origin_index - 64 : origin_index - 51
            ].mean()
            features["tly_idx"] = last_year_total / (
                last_year_total_baseline + 1e-9
            )
        features["j"] = target_index
        features["y"] = values[target_index]
        features["wk"] = WEEKS[target_index]
        output.append(features)
    return pd.concat(output, ignore_index=True) if output else None


def fit_model(
    features: pd.DataFrame,
    target: pd.Series,
    columns: list[str],
    tweedie: bool = False,
) -> lgb.LGBMRegressor:
    parameters = dict(MODEL_PARAMS)
    if tweedie:
        parameters.update(
            objective="tweedie",
            tweedie_variance_power=1.3,
        )
    return lgb.LGBMRegressor(**parameters).fit(
        features[columns],
        target,
        categorical_feature=["skuc"],
    )


def get_origin_predictions(
    panel: pd.DataFrame,
    origin: pd.Timestamp,
    christmas_feature: np.ndarray,
    week_of_year: np.ndarray,
    mapping: pd.DataFrame,
    target_name: str,
) -> pd.DataFrame:
    origin_index = WEEKS.get_loc(origin)
    train_parts: list[pd.DataFrame] = []
    for train_origin in range(13, origin_index):
        examples = make_training_examples(
            panel,
            train_origin,
            christmas_feature,
            week_of_year,
            include_last_year=True,
        )
        if examples is not None:
            train_parts.append(examples.loc[examples["j"].le(origin_index)])
    if not train_parts:
        raise ValueError(f"No training examples available before origin {origin.date()}.")
    train = pd.concat(train_parts, ignore_index=True)
    test = make_training_examples(
        panel,
        origin_index,
        christmas_feature,
        week_of_year,
        include_last_year=True,
    )
    if test is None:
        raise ValueError(f"No evaluation examples available at origin {origin.date()}.")

    epsilon = 1.0 if target_name == "quantity" else 5.0
    train_level = np.maximum(train["rm13"].to_numpy(dtype=float), epsilon)
    test_level = np.maximum(test["rm13"].to_numpy(dtype=float), epsilon)
    forecast = test[["wk", "h"]].copy().reset_index(drop=True)
    forecast["StockCode"] = np.tile(mapping["StockCode"].to_numpy(), test["h"].nunique())
    forecast["actual"] = test["y"].to_numpy(dtype=float)
    calendar_features = ["skuc", "h", "woy", "wtx"]
    level_features = ["rm4", "rm8", "rm13", "trm4", "trm13"]
    forecast["A_baseline_level_features"] = np.clip(
        fit_model(
            train,
            train["y"],
            calendar_features + level_features,
        ).predict(test[calendar_features + level_features]),
        0,
        None,
    )
    forecast["B_tweedie"] = np.clip(
        fit_model(
            train,
            train["y"],
            calendar_features + level_features,
            tweedie=True,
        ).predict(test[calendar_features + level_features]),
        0,
        None,
    )
    ratio_features = calendar_features + ["trm4", "trm13"]
    forecast["C_ratio_to_level"] = np.clip(
        fit_model(
            train,
            pd.Series(
                np.clip(train["y"].to_numpy(dtype=float) / train_level, 0, 15)
            ),
            ratio_features,
        ).predict(test[ratio_features])
        * test_level,
        0,
        None,
    )
    seasonal_ratio_features = ratio_features + ["ly_idx", "tly_idx"]
    forecast["D_ratio_plus_last_year_index"] = np.clip(
        fit_model(
            train,
            pd.Series(
                np.clip(train["y"].to_numpy(dtype=float) / train_level, 0, 15)
            ),
            seasonal_ratio_features,
        ).predict(test[seasonal_ratio_features])
        * test_level,
        0,
        None,
    )
    forecast["E_naive_recent_13w_mean"] = test_level
    forecast["F_average_A_and_C"] = (
        forecast["A_baseline_level_features"] + forecast["C_ratio_to_level"]
    ) / 2
    forecast["target"] = target_name
    forecast["origin"] = origin
    forecast["product_id"] = forecast["StockCode"].map(
        mapping.set_index("StockCode")["product_id"]
    )
    forecast["product_name"] = forecast["StockCode"].map(
        mapping.set_index("StockCode")["product_name"]
    )
    forecast["category"] = forecast["StockCode"].map(
        mapping.set_index("StockCode")["category"]
    )
    return forecast


def summarize_predictions(predictions: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for (target, origin), group in predictions.groupby(["target", "origin"]):
        weekly_total = group.groupby("wk")[["actual"] + MODEL_COLUMNS].sum()
        actual_total = float(group["actual"].sum())
        for model_name in MODEL_COLUMNS:
            errors = group[model_name] - group["actual"]
            total_errors = weekly_total[model_name] - weekly_total["actual"]
            rows.append(
                {
                    "target": target,
                    "origin": origin,
                    "model": model_name,
                    "sku_week_WAPE": float(errors.abs().sum() / actual_total),
                    "bias": float(errors.sum() / actual_total),
                    "total_week_WAPE": float(
                        total_errors.abs().sum() / weekly_total["actual"].sum()
                    ),
                }
            )
    return pd.DataFrame(rows)


def write_mapping_audit(
    transactions: pd.DataFrame,
    mapping: pd.DataFrame,
    enriched: pd.DataFrame,
) -> None:
    mapped_rows = len(enriched)
    monthly = (
        enriched.assign(month=enriched["sale_date"].dt.to_period("M").astype(str))
        .groupby("month", as_index=False)
        .agg(
            quantity=("Quantity", "sum"),
            revenue_gbp=("revenue_source", "sum"),
            invoice_count=("Invoice", "nunique"),
            source_sku_count=("StockCode", "nunique"),
        )
    )
    monthly.to_csv(
        OUTPUT_DIR / "mapped_monthly_activity_by_haircare_label.csv",
        index=False,
        encoding="utf-8-sig",
    )
    mapping[[
        "StockCode",
        "product_id",
        "product_name",
        "category",
        "source_description",
        "source_sku_rank",
    ]].to_csv(
        OUTPUT_DIR / "mapping_crosswalk_used.csv",
        index=False,
        encoding="utf-8-sig",
    )
    audit = pd.DataFrame(
        [
            {"metric": "mapping_rows", "value": len(mapping)},
            {"metric": "unique_mapped_StockCode", "value": mapping["StockCode"].nunique()},
            {"metric": "source_cleaned_transaction_rows", "value": len(transactions)},
            {"metric": "mapped_transaction_rows", "value": mapped_rows},
            {"metric": "mapped_quantity", "value": int(enriched["Quantity"].sum())},
            {"metric": "mapped_revenue_gbp", "value": round(float(enriched["revenue_source"].sum()), 2)},
            {"metric": "mapped_unique_invoice_count", "value": enriched["Invoice"].nunique()},
            {"metric": "mapping_labels_are_simulated", "value": True},
            {
                "metric": "source_SKU_set_matches_mapping",
                "value": len(set(enriched["StockCode"])) == len(mapping),
            },
            {
                "metric": "revenue_target_currency",
                "value": "GBP source Price × Quantity; not HairCare catalogue USD price",
            },
        ]
    )
    audit.to_csv(
        OUTPUT_DIR / "mapping_data_audit.csv",
        index=False,
        encoding="utf-8-sig",
    )


def enrich_anomaly_table(enriched: pd.DataFrame) -> None:
    if not ANOMALY_PATH.is_file():
        return
    anomalies = pd.read_csv(ANOMALY_PATH, dtype={"top_invoice": "string"})
    top_sku_rows = []
    for date in pd.to_datetime(anomalies["date"]):
        day = enriched.loc[enriched["sale_date"].eq(date)].copy()
        sku_totals = (
            day.groupby(
                ["StockCode", "product_id", "product_name", "category"],
                as_index=False,
            )
            .agg(
                quantity=("Quantity", "sum"),
                revenue_gbp=("revenue_source", "sum"),
                invoice_count=("Invoice", "nunique"),
            )
            .sort_values("revenue_gbp", ascending=False)
        )
        for rank, row in enumerate(sku_totals.head(5).itertuples(index=False), start=1):
            top_sku_rows.append(
                {
                    "date": date.date().isoformat(),
                    "rank": rank,
                    "StockCode": row.StockCode,
                    "product_id": row.product_id,
                    "product_name_simulated": row.product_name,
                    "category_simulated": row.category,
                    "source_description": day.loc[
                        day["StockCode"].eq(row.StockCode), "Description"
                    ].dropna().iloc[0],
                    "quantity": row.quantity,
                    "revenue_gbp": row.revenue_gbp,
                    "invoice_count": row.invoice_count,
                    "warning": "HairCare product identity/category is simulated.",
                }
            )
    pd.DataFrame(top_sku_rows).to_csv(
        OUTPUT_DIR / "anomaly_top_skus_with_haircare_labels.csv",
        index=False,
        encoding="utf-8-sig",
    )


def main() -> None:
    transactions, mapping, enriched = load_inputs()
    ordered_codes = mapping["StockCode"].tolist()
    write_mapping_audit(transactions, mapping, enriched)
    enrich_anomaly_table(enriched)

    _, sales_panel, christmas_feature, week_of_year = build_weekly_panel(
        transactions,
        mapping,
    )
    predictions: list[pd.DataFrame] = []
    for target_name, source_column in [
        ("revenue", "revenue_source"),
        ("quantity", "Quantity"),
    ]:
        panel = make_wide_targets(enriched, source_column, ordered_codes)
        if not panel.index.equals(WEEKS) or panel.isna().any().any():
            raise AssertionError(f"Weekly {target_name} panel has missing date/SKU values.")
        if not np.allclose(
            panel.sum(axis=1).to_numpy(),
            sales_panel[
                "revenue_gbp" if target_name == "revenue" else "quantity_sold"
            ].to_numpy(),
        ):
            raise AssertionError(f"Weekly {target_name} totals do not reconcile.")
        for origin in ORIGINS:
            predictions.append(
                get_origin_predictions(
                    panel,
                    origin,
                    christmas_feature,
                    week_of_year,
                    mapping,
                    target_name,
                )
            )
    prediction_frame = pd.concat(predictions, ignore_index=True)
    summary = summarize_predictions(prediction_frame)
    prediction_frame.to_csv(
        OUTPUT_DIR / "fixed_origin_predictions.csv",
        index=False,
        encoding="utf-8-sig",
    )
    summary.to_csv(
        OUTPUT_DIR / "fixed_origin_summary.csv",
        index=False,
        encoding="utf-8-sig",
    )
    for target in ["revenue", "quantity"]:
        target_summary = (
            summary.loc[summary["target"].eq(target)]
            .groupby("model")
            .agg(
                bias_min=("bias", "min"),
                bias_median=("bias", "median"),
                bias_max=("bias", "max"),
                mean_abs_bias=("bias", lambda values: values.abs().mean()),
                total_week_WAPE=("total_week_WAPE", "mean"),
                sku_week_WAPE=("sku_week_WAPE", "mean"),
            )
        )
        target_summary.to_csv(
            OUTPUT_DIR / f"robustness_across_origins_{target}.csv",
            encoding="utf-8-sig",
        )
    final_origin = pd.Timestamp("2011-10-02")
    final_origin_summary = summary.loc[
        summary["target"].eq("revenue")
        & summary["origin"].eq(final_origin)
    ].sort_values("total_week_WAPE")
    print("Exact mapped SKU set:", len(mapping))
    print("Mapped source rows / quantity / GBP revenue:",
          len(enriched), int(enriched["Quantity"].sum()),
          round(float(enriched["revenue_source"].sum()), 2))
    print("Mapped forecast output:", OUTPUT_DIR / "fixed_origin_predictions.csv")
    print("\nRevenue results at origin 2011-10-02:")
    print(final_origin_summary.to_string(index=False))
    print(f"\nOutputs written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
