"""Compare weekly sales forecasts and audit high-revenue periods."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.impute import SimpleImputer
from sklearn.metrics import r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBRegressor


DATA_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = DATA_ROOT / "processed"
OUTPUT_DIR = Path(__file__).resolve().parent / "results"
TARGETS = ["quantity_sold", "revenue_gbp"]
CATEGORICAL_FEATURES = ["product_id", "category"]
LAGS = [1, 2, 4, 8, 13, 26]
ROLLING_WINDOWS = [4, 8, 13]
RANDOM_STATE = 42


def make_preprocessor(numeric_features: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        [
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler()),
                    ]
                ),
                numeric_features,
            ),
        ],
        sparse_threshold=0,
    )


def build_features(
    weekly: pd.DataFrame, target: str
) -> tuple[pd.DataFrame, list[str], list[str]]:
    part = weekly[
        ["sale_date", "product_id", "category", "product_name", target]
    ].copy()
    part = part.sort_values(["product_id", "sale_date"]).reset_index(drop=True)
    grouped = part.groupby("product_id", sort=False)[target]
    for lag in LAGS + [52]:
        part[f"lag_{lag}"] = grouped.shift(lag)
    for window in ROLLING_WINDOWS:
        part[f"rolling_mean_{window}"] = grouped.transform(
            lambda values: values.shift(1).rolling(window, min_periods=window).mean()
        )

    week_of_year = part["sale_date"].dt.isocalendar().week.astype(int)
    part["week_of_year"] = week_of_year
    part["month"] = part["sale_date"].dt.month
    part["week_sin"] = np.sin(2 * np.pi * week_of_year / 52.18)
    part["week_cos"] = np.cos(2 * np.pi * week_of_year / 52.18)
    numeric_features = (
        [f"lag_{lag}" for lag in LAGS]
        + [f"rolling_mean_{window}" for window in ROLLING_WINDOWS]
        + ["week_of_year", "month", "week_sin", "week_cos"]
    )
    all_features = CATEGORICAL_FEATURES + numeric_features
    return (
        part.dropna(subset=all_features).reset_index(drop=True),
        numeric_features,
        all_features,
    )


def build_model(
    name: str, numeric_features: list[str]
) -> Pipeline | CatBoostRegressor | tuple[Pipeline, Pipeline]:
    preprocessing = make_preprocessor(numeric_features)
    if name == "LightGBM":
        estimator = LGBMRegressor(
            objective="regression_l1",
            n_estimators=120,
            learning_rate=0.03,
            num_leaves=7,
            min_child_samples=10,
            verbosity=-1,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        )
        return Pipeline([("preprocess", preprocessing), ("model", estimator)])
    if name == "Linear Regression":
        return Pipeline(
            [
                ("preprocess", preprocessing),
                ("model", LinearRegression()),
            ]
        )
    if name == "LightGBM tuned":
        estimator = LGBMRegressor(
            objective="regression_l1",
            n_estimators=180,
            learning_rate=0.025,
            num_leaves=15,
            min_child_samples=15,
            colsample_bytree=0.9,
            subsample=0.9,
            subsample_freq=1,
            reg_lambda=3,
            verbosity=-1,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        )
        return Pipeline([("preprocess", preprocessing), ("model", estimator)])
    if name == "XGBoost":
        estimator = XGBRegressor(
            objective="reg:squarederror",
            n_estimators=120,
            max_depth=3,
            learning_rate=0.03,
            min_child_weight=10,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=10,
            n_jobs=-1,
            random_state=RANDOM_STATE,
        )
        return Pipeline([("preprocess", preprocessing), ("model", estimator)])
    if name == "Two-stage LightGBM":
        classifier = Pipeline(
            [
                ("preprocess", make_preprocessor(numeric_features)),
                (
                    "model",
                    LGBMClassifier(
                        n_estimators=100,
                        learning_rate=0.03,
                        num_leaves=7,
                        min_child_samples=10,
                        verbosity=-1,
                        n_jobs=-1,
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        )
        regressor = Pipeline(
            [
                ("preprocess", make_preprocessor(numeric_features)),
                (
                    "model",
                    LGBMRegressor(
                        objective="regression_l1",
                        n_estimators=120,
                        learning_rate=0.03,
                        num_leaves=7,
                        min_child_samples=10,
                        verbosity=-1,
                        n_jobs=-1,
                        random_state=RANDOM_STATE,
                    ),
                ),
            ]
        )
        return classifier, regressor
    if name == "CatBoost":
        return CatBoostRegressor(
            iterations=300,
            depth=6,
            learning_rate=0.04,
            l2_leaf_reg=5,
            verbose=False,
            allow_writing_files=False,
            thread_count=4,
            random_seed=RANDOM_STATE,
        )
    raise ValueError(f"Unknown model: {name}")


def fit_model(
    name: str,
    model: Pipeline | CatBoostRegressor | tuple[Pipeline, Pipeline],
    train: pd.DataFrame,
    features: list[str],
    target: str,
) -> Pipeline | CatBoostRegressor | tuple[Pipeline, Pipeline]:
    train_x = train[features]
    train_y = (
        train[target]
        if name == "Linear Regression"
        else np.log1p(train[target])
    )
    if name == "CatBoost":
        cat_x = train_x.copy()
        for column in CATEGORICAL_FEATURES:
            cat_x[column] = cat_x[column].astype(str)
        model.fit(cat_x, train_y, cat_features=CATEGORICAL_FEATURES)
    elif name == "Two-stage LightGBM":
        classifier, regressor = model
        positive = train[target].gt(0)
        classifier.fit(train_x, positive.astype("int8"))
        if not positive.any():
            raise ValueError(f"No positive training rows for {target}.")
        regressor.fit(train_x.loc[positive], train_y.loc[positive])
    else:
        model.fit(train_x, train_y)
    return model


def predict_model(
    name: str,
    model: Pipeline | CatBoostRegressor | tuple[Pipeline, Pipeline] | None,
    frame: pd.DataFrame,
    features: list[str],
) -> np.ndarray:
    if name == "Seasonal Naive (lag 1 week)":
        return np.maximum(frame["lag_1"].to_numpy(dtype=float), 0)
    frame_x = frame[features]
    if name == "CatBoost":
        frame_x = frame_x.copy()
        for column in CATEGORICAL_FEATURES:
            frame_x[column] = frame_x[column].astype(str)
        prediction = np.expm1(model.predict(frame_x))
    elif name == "Linear Regression":
        prediction = model.predict(frame_x)
    elif name == "Two-stage LightGBM":
        classifier, regressor = model
        probability_positive = classifier.predict_proba(frame_x)[:, 1]
        conditional_demand = np.expm1(regressor.predict(frame_x))
        prediction = probability_positive * conditional_demand
    else:
        prediction = np.expm1(model.predict(frame_x))
    return np.maximum(np.asarray(prediction, dtype=float), 0)


def score_rows(actual: pd.Series | np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    actual_values = np.asarray(actual, dtype=float)
    predicted_values = np.asarray(predicted, dtype=float)
    absolute_error = np.abs(actual_values - predicted_values)
    return {
        "WAPE": float(absolute_error.sum() / max(np.abs(actual_values).sum(), 1)),
        "MAE": float(absolute_error.mean()),
        "RMSE": float(np.sqrt(np.mean((actual_values - predicted_values) ** 2))),
        "R2": float(r2_score(actual_values, predicted_values)),
    }


def make_recursive_features(
    histories: dict[str, list[float]],
    metadata: pd.DataFrame,
    target_date: pd.Timestamp,
    numeric_features: list[str],
) -> pd.DataFrame:
    week_of_year = int(target_date.isocalendar().week)
    rows = []
    for item in metadata.itertuples(index=False):
        history = histories[str(item.product_id)]
        row: dict[str, object] = {
            "product_id": str(item.product_id),
            "category": item.category,
            "week_of_year": week_of_year,
            "month": target_date.month,
            "week_sin": np.sin(2 * np.pi * week_of_year / 52.18),
            "week_cos": np.cos(2 * np.pi * week_of_year / 52.18),
        }
        for lag in LAGS:
            row[f"lag_{lag}"] = history[-lag]
        for window in ROLLING_WINDOWS:
            row[f"rolling_mean_{window}"] = float(np.mean(history[-window:]))
        rows.append(row)
    return pd.DataFrame(rows)[CATEGORICAL_FEATURES + numeric_features]


def recursive_forecast(
    name: str,
    model: Pipeline | CatBoostRegressor | tuple[Pipeline, Pipeline] | None,
    weekly: pd.DataFrame,
    target: str,
    cutoff: pd.Timestamp,
    numeric_features: list[str],
    features: list[str],
    horizon_weeks: int = 2,
    require_actual: bool = True,
) -> tuple[pd.DataFrame, np.ndarray]:
    history_data = weekly.loc[weekly["sale_date"] < cutoff]
    metadata = weekly[["product_id", "category", "product_name"]].drop_duplicates(
        "product_id"
    )
    histories = {
        str(product_id): group.sort_values("sale_date")[target].astype(float).tolist()
        for product_id, group in history_data.groupby("product_id", sort=False)
    }
    dates = [
        cutoff + pd.Timedelta(days=6 + 7 * offset)
        for offset in range(horizon_weeks)
    ]
    forecasts = []
    for forecast_date in dates:
        if name == "Seasonal Naive (lag 1 week)":
            predictions = np.asarray(
                [histories[str(product_id)][-1] for product_id in metadata["product_id"]],
                dtype=float,
            )
        else:
            feature_rows = make_recursive_features(
                histories, metadata, forecast_date, numeric_features
            )
            predictions = predict_model(name, model, feature_rows, features)
        forecasts.append(predictions)
        for product_id, prediction in zip(metadata["product_id"], predictions):
            histories[str(product_id)].append(float(prediction))
    predicted_frame = pd.DataFrame(
        [
            {
                "sale_date": forecast_date,
                "product_id": product_id,
                "prediction": prediction,
            }
            for forecast_date, values in zip(dates, forecasts)
            for product_id, prediction in zip(metadata["product_id"], values)
        ]
    )
    actual = weekly.loc[weekly["sale_date"].isin(dates)]
    actual = actual.merge(
        metadata[["product_id"]], on="product_id", how="inner", validate="many_to_one"
    )
    if not require_actual:
        return predicted_frame, predicted_frame["prediction"].to_numpy()
    actual = actual.sort_values(["sale_date", "product_id"]).reset_index(drop=True)
    actual = actual.merge(
        predicted_frame,
        on=["sale_date", "product_id"],
        how="inner",
        validate="one_to_one",
    )
    if len(actual) != horizon_weeks * metadata["product_id"].nunique():
        raise ValueError("Recursive evaluation window is missing product-week rows.")
    return actual, actual["prediction"].to_numpy()


def build_weekly_panel(daily: pd.DataFrame) -> pd.DataFrame:
    return (
        daily.set_index("sale_date")
        .groupby("product_id")[["quantity_sold", "revenue_gbp"]]
        .resample("W-SUN")
        .sum()
        .reset_index()
        .merge(
            daily[["product_id", "category", "product_name"]].drop_duplicates(
                "product_id"
            ),
            on="product_id",
            how="left",
            validate="many_to_one",
        )
    )


def run_forecast_benchmark() -> None:
    daily_path = DATA_DIR / "haircare_demo_daily_sales.csv"
    if not daily_path.is_file():
        raise FileNotFoundError(f"Missing model input: {daily_path}")
    daily = pd.read_csv(
        daily_path,
        parse_dates=["sale_date"],
        dtype={"product_id": "string"},
    )
    if set(daily["currency"].dropna().unique()) != {"GBP"}:
        raise ValueError("The ML panel must contain GBP revenue only.")
    if daily.duplicated(["sale_date", "product_id"]).any():
        raise ValueError("The daily panel contains duplicate date/product keys.")

    weekly = build_weekly_panel(daily)
    latest_date = daily["sale_date"].max()
    holdout_start = latest_date - pd.Timedelta(days=59)
    weekly_holdout_start = holdout_start - pd.Timedelta(
        days=holdout_start.weekday()
    )
    validation_starts = [
        weekly_holdout_start - pd.Timedelta(weeks=weeks)
        for weeks in [12, 8, 4]
    ]
    validation_windows = [
        (start, start + pd.Timedelta(days=27)) for start in validation_starts
    ]
    candidate_names = [
        "Seasonal Naive (lag 1 week)",
        "Linear Regression",
        "LightGBM",
        "LightGBM tuned",
        "CatBoost",
        "XGBoost",
        "Two-stage LightGBM",
    ]
    results: list[dict[str, object]] = []
    summaries: list[dict[str, object]] = []

    for target in TARGETS:
        frame, numeric_features, features = build_features(weekly, target)
        target_results: list[dict[str, object]] = []
        for fold, (validation_start, validation_end) in enumerate(
            validation_windows, start=1
        ):
            train = frame.loc[frame["sale_date"] < validation_start]
            validation = frame.loc[
                frame["sale_date"].between(validation_start, validation_end)
            ]
            for name in candidate_names:
                if name == "Seasonal Naive (lag 1 week)":
                    one_step_prediction = validation["lag_1"].to_numpy()
                    recursive_actual, recursive_values = recursive_forecast(
                        name,
                        None,
                        weekly,
                        target,
                        validation_start,
                        numeric_features,
                        features,
                    )
                else:
                    model = fit_model(
                        name,
                        build_model(name, numeric_features),
                        train,
                        features,
                        target,
                    )
                    one_step_prediction = predict_model(
                        name, model, validation, features
                    )
                    recursive_actual, recursive_values = recursive_forecast(
                        name,
                        model,
                        weekly,
                        target,
                        validation_start,
                        numeric_features,
                        features,
                    )
                one_step_score = score_rows(
                    validation[target], one_step_prediction
                )
                recursive_score = (
                    score_rows(recursive_actual[target], recursive_values)
                    if recursive_values is not None
                    else {
                        "WAPE": np.nan,
                        "MAE": np.nan,
                        "RMSE": np.nan,
                    }
                )
                row = {
                    "target": target,
                    "model": name,
                    "fold": fold,
                    "validation_weekly_updated_WAPE": one_step_score["WAPE"],
                    "validation_weekly_updated_MAE": one_step_score["MAE"],
                    "validation_weekly_updated_RMSE": one_step_score["RMSE"],
                    "validation_weekly_updated_R2": one_step_score["R2"],
                    "validation_2week_recursive_WAPE": recursive_score["WAPE"],
                    "validation_2week_recursive_MAE": recursive_score["MAE"],
                    "validation_2week_recursive_RMSE": recursive_score["RMSE"],
                    "validation_2week_recursive_R2": recursive_score["R2"],
                }
                results.append(row)
                target_results.append(row)

        validation_summary = pd.DataFrame(target_results).groupby("model").agg(
            cv_weekly_updated_WAPE=("validation_weekly_updated_WAPE", "mean"),
            cv_weekly_updated_MAE=("validation_weekly_updated_MAE", "mean"),
            cv_weekly_updated_RMSE=("validation_weekly_updated_RMSE", "mean"),
            cv_weekly_updated_R2=("validation_weekly_updated_R2", "mean"),
            cv_2week_recursive_WAPE=("validation_2week_recursive_WAPE", "mean"),
            cv_2week_recursive_MAE=("validation_2week_recursive_MAE", "mean"),
            cv_2week_recursive_RMSE=("validation_2week_recursive_RMSE", "mean"),
            cv_2week_recursive_R2=("validation_2week_recursive_R2", "mean"),
        )
        selected_model = str(validation_summary["cv_2week_recursive_MAE"].idxmin())

        holdout_frame = frame.loc[frame["sale_date"] >= weekly_holdout_start]
        holdout_train = frame.loc[frame["sale_date"] < weekly_holdout_start]
        for name in candidate_names:
            if name == "Seasonal Naive (lag 1 week)":
                holdout_prediction = holdout_frame["lag_1"].to_numpy()
                recursive_actual, recursive_values = recursive_forecast(
                    name,
                    None,
                    weekly,
                    target,
                    weekly_holdout_start,
                    numeric_features,
                    features,
                )
                recursive_score = score_rows(
                    recursive_actual[target], recursive_values
                )
            else:
                model = fit_model(
                    name,
                    build_model(name, numeric_features),
                    holdout_train,
                    features,
                    target,
                )
                holdout_prediction = predict_model(
                    name, model, holdout_frame, features
                )
                recursive_actual, recursive_values = recursive_forecast(
                    name,
                    model,
                    weekly,
                    target,
                    weekly_holdout_start,
                    numeric_features,
                    features,
                )
                recursive_score = score_rows(
                    recursive_actual[target], recursive_values
                )
            holdout_score = score_rows(
                holdout_frame[target], holdout_prediction
            )
            results.append(
                {
                    "target": target,
                    "model": name,
                    "fold": "holdout",
                    "validation_weekly_updated_WAPE": holdout_score["WAPE"],
                    "validation_weekly_updated_MAE": holdout_score["MAE"],
                    "validation_weekly_updated_RMSE": holdout_score["RMSE"],
                    "validation_weekly_updated_R2": holdout_score["R2"],
                    "validation_2week_recursive_WAPE": recursive_score["WAPE"],
                    "validation_2week_recursive_MAE": recursive_score["MAE"],
                    "validation_2week_recursive_RMSE": recursive_score["RMSE"],
                    "validation_2week_recursive_R2": recursive_score["R2"],
                    "selected_by_validation": name == selected_model,
                }
            )
            summaries.append(
                {
                    "target": target,
                    "model": name,
                    **validation_summary.loc[name].to_dict(),
                    "holdout_weekly_updated_WAPE": holdout_score["WAPE"],
                    "holdout_weekly_updated_MAE": holdout_score["MAE"],
                    "holdout_weekly_updated_RMSE": holdout_score["RMSE"],
                    "holdout_weekly_updated_R2": holdout_score["R2"],
                    "holdout_2week_recursive_WAPE": recursive_score["WAPE"],
                    "holdout_2week_recursive_MAE": recursive_score["MAE"],
                    "holdout_2week_recursive_RMSE": recursive_score["RMSE"],
                    "holdout_2week_recursive_R2": recursive_score["R2"],
                    "selected_by_validation": name == selected_model,
                }
            )

    detail_path = OUTPUT_DIR / "weekly_model_comparison_folds.csv"
    summary_path = OUTPUT_DIR / "weekly_model_comparison.csv"
    pd.DataFrame(results).to_csv(detail_path, index=False, encoding="utf-8-sig")
    summary = pd.DataFrame(summaries).sort_values(
        ["target", "cv_2week_recursive_MAE", "model"], na_position="last"
    )
    summary.to_csv(summary_path, index=False, encoding="utf-8-sig")
    print(f"Weekly model summary: {summary_path}")
    print(f"Fold-level scores: {detail_path}")
    print(summary.to_string(index=False, formatters={
        column: (lambda value: f"{value:.1%}")
        for column in summary.columns
        if column.endswith("WAPE") or column.endswith("R2")
    }))

    selected_models = summary.loc[
        summary["selected_by_validation"], ["target", "model"]
    ].set_index("target")["model"]
    forecast_cutoff = weekly["sale_date"].max() + pd.Timedelta(days=1)
    future_parts = []
    weekly_demand_std = (
        weekly.sort_values("sale_date")
        .groupby("product_id", sort=False)
        .tail(13)
        .groupby("product_id")["quantity_sold"]
        .agg(
            lambda values: values.astype(float).clip(
                upper=values.quantile(0.99)
            ).std()
        )
        .fillna(0)
        .rename("recent_weekly_quantity_std")
    )
    for target in TARGETS:
        selected_model = str(selected_models[target])
        frame, numeric_features, features = build_features(weekly, target)
        model = None
        if selected_model != "Seasonal Naive (lag 1 week)":
            model = fit_model(
                selected_model,
                build_model(selected_model, numeric_features),
                frame,
                features,
                target,
            )
        forecast, _ = recursive_forecast(
            selected_model,
            model,
            weekly,
            target,
            forecast_cutoff,
            numeric_features,
            features,
            require_actual=False,
        )
        forecast = forecast[
            ["sale_date", "product_id", "prediction"]
        ].rename(columns={"prediction": f"forecast_{target}"})
        future_parts.append(forecast)

    future = future_parts[0].merge(
        future_parts[1],
        on=["sale_date", "product_id"],
        how="inner",
        validate="one_to_one",
    )
    future = future.merge(
        weekly[["product_id", "category", "product_name"]].drop_duplicates(
            "product_id"
        ),
        on="product_id",
        how="left",
        validate="many_to_one",
    )
    future["quantity_model"] = str(selected_models["quantity_sold"])
    future["revenue_model"] = str(selected_models["revenue_gbp"])
    forecast_path = OUTPUT_DIR / "weekly_sales_forecast_experimental.csv"
    future.to_csv(forecast_path, index=False, encoding="utf-8-sig")

    recommendations = future.groupby(
        ["product_id", "product_name", "category"], as_index=False
    ).agg(
        forecast_quantity=("forecast_quantity_sold", "sum"),
        forecast_revenue_gbp=("forecast_revenue_gbp", "sum"),
    ).join(weekly_demand_std, on="product_id")
    lead_time_days = 7
    review_period_days = 7
    current_stock = 50
    safety_stock_z = 1.65
    lead_weeks = int(np.ceil(lead_time_days / 7))
    recommendations["current_stock_demo"] = current_stock
    recommendations["safety_stock_demo"] = np.ceil(
        safety_stock_z
        * recommendations["recent_weekly_quantity_std"]
        * np.sqrt(lead_weeks)
    ).astype(int)
    recommendations["recommended_order_qty_demo"] = np.ceil(
        np.maximum(
            0,
            recommendations["forecast_quantity"]
            + recommendations["safety_stock_demo"]
            - recommendations["current_stock_demo"],
        )
    ).astype(int)
    recommendations["lead_time_days_assumed"] = lead_time_days
    recommendations["review_period_days_assumed"] = review_period_days
    recommendations["quantity_model"] = str(selected_models["quantity_sold"])
    recommendations["revenue_model"] = str(selected_models["revenue_gbp"])
    recommendations["forecast_granularity"] = "2 weekly periods; experimental"
    recommendations = recommendations.sort_values(
        "recommended_order_qty_demo", ascending=False
    )
    recommendation_path = (
        OUTPUT_DIR / "demo_inventory_recommendations_experimental_weekly.csv"
    )
    recommendations.to_csv(
        recommendation_path, index=False, encoding="utf-8-sig"
    )
    print(f"Experimental 2-week forecast: {forecast_path}")
    print(f"Experimental inventory scenario: {recommendation_path}")
    print(
        "Model selection uses 2-week recursive validation MAE. Inventory stock, lead time, "
        "review period, and safety stock are demo assumptions."
    )


def run_high_revenue_audit() -> None:
    transactions_path = DATA_DIR / "retail_transactions_cleaned.csv.gz"
    mapping_path = DATA_DIR / "haircare_demo_product_mapping.csv"
    for path in [transactions_path, mapping_path]:
        if not path.is_file():
            raise FileNotFoundError(f"Missing audit input: {path}")
    transactions = pd.read_csv(
        transactions_path,
        compression="infer",
        parse_dates=["sale_date"],
        dtype={"Invoice": "string", "StockCode": "string"},
    )
    mapping = pd.read_csv(
        mapping_path,
        encoding="utf-8-sig",
        dtype={"StockCode": "string"},
    )
    mapped = transactions.merge(
        mapping[["StockCode"]],
        on="StockCode",
        how="inner",
        validate="many_to_one",
    )
    mapped["revenue_gbp"] = mapped["Quantity"] * mapped["Price"]
    daily = mapped.groupby("sale_date", as_index=False).agg(
        revenue_gbp=("revenue_gbp", "sum"),
        quantity=("Quantity", "sum"),
        invoice_count=("Invoice", "nunique"),
        sku_count=("StockCode", "nunique"),
    )
    invoice_daily = mapped.groupby(
        ["sale_date", "Invoice"], as_index=False
    ).agg(revenue_gbp=("revenue_gbp", "sum"))
    invoice_daily = invoice_daily.sort_values(
        ["sale_date", "revenue_gbp"], ascending=[True, False]
    )
    concentration = invoice_daily.groupby("sale_date", as_index=False).agg(
        top_invoice_revenue_gbp=("revenue_gbp", "first"),
        top_three_invoice_revenue_gbp=(
            "revenue_gbp",
            lambda values: values.nlargest(3).sum(),
        ),
    )
    daily = daily.merge(
        concentration, on="sale_date", how="left", validate="one_to_one"
    )
    daily["top_invoice_share"] = (
        daily["top_invoice_revenue_gbp"] / daily["revenue_gbp"]
    )
    daily["top_three_invoice_share"] = (
        daily["top_three_invoice_revenue_gbp"] / daily["revenue_gbp"]
    )
    top_days = daily.nlargest(20, "revenue_gbp").copy()
    top_days_path = OUTPUT_DIR / "high_revenue_period_audit.csv"
    top_days.to_csv(top_days_path, index=False, encoding="utf-8-sig")

    mapped["year"] = mapped["sale_date"].dt.year
    mapped["month"] = mapped["sale_date"].dt.month
    monthly = mapped.groupby(["year", "month"], as_index=False).agg(
        revenue_gbp=("revenue_gbp", "sum"),
        quantity=("Quantity", "sum"),
        invoice_count=("Invoice", "nunique"),
        sku_count=("StockCode", "nunique"),
    )
    october_november = monthly.loc[monthly["month"].isin([10, 11])]
    wide = october_november.pivot(
        index="year", columns="month", values=["revenue_gbp", "quantity", "invoice_count"]
    )
    for metric in ["revenue_gbp", "quantity", "invoice_count"]:
        wide[(metric, "october_to_november_change")] = (
            wide[(metric, 11)] / wide[(metric, 10)] - 1
        )
    monthly.to_csv(
        DATA_DIR / "mapped_monthly_activity_audit.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print(f"High-revenue dates: {top_days_path}")
    print(f"Monthly mapped activity: {DATA_DIR / 'mapped_monthly_activity_audit.csv'}")
    print(top_days.head(10).to_string(index=False, formatters={
        "revenue_gbp": lambda value: f"GBP {value:,.2f}",
        "top_invoice_share": lambda value: f"{value:.1%}",
        "top_three_invoice_share": lambda value: f"{value:.1%}",
    }))
    print("\nOctober-to-November mapped source changes:")
    print(wide.to_string())


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    run_forecast_benchmark()
    run_high_revenue_audit()


if __name__ == "__main__":
    main()
