"""Quick Analysis Service - ML-ready dataset analysis engine."""

from typing import Any, List, Optional

import numpy as np
import pandas as pd

from app.services.dataset_visualizer import get_histogram, get_bar_counts, get_correlation


def _make_serializable(value: Any) -> Any:
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(value, (np.integer,)):
        return int(value)
    elif isinstance(value, (np.floating,)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)
    elif isinstance(value, np.ndarray):
        return value.tolist()
    elif pd.isna(value):
        return None
    return value


def _detect_column_type(series: pd.Series) -> str:
    """Detect the type of a pandas Series."""
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    elif pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    elif pd.api.types.is_categorical_dtype(series) or pd.api.types.is_object_dtype(series):
        if series.dtype == object:
            try:
                pd.to_datetime(series.dropna().head(100))
                return "datetime"
            except (ValueError, TypeError):
                pass
        return "categorical"
    return "unknown"


def _compute_outliers_iqr(series: pd.Series) -> dict:
    """Compute outliers using IQR method."""
    clean = series.dropna()
    if len(clean) == 0:
        return {"outlier_count": 0, "outlier_percentage": 0.0}
    
    q1 = clean.quantile(0.25)
    q3 = clean.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers = clean[(clean < lower_bound) | (clean > upper_bound)]
    outlier_count = len(outliers)
    outlier_percentage = round((outlier_count / len(clean)) * 100, 2) if len(clean) > 0 else 0.0
    
    return {
        "outlier_count": outlier_count,
        "outlier_percentage": outlier_percentage
    }


def _compute_ml_readiness(
    missing_percentages: List[float],
    duplicate_rows: int,
    total_rows: int,
    outlier_percentages: List[float]
) -> dict:
    """Compute ML readiness score (0-100)."""
    score = 100.0
    
    # Penalize for missing data (avg missing across columns)
    if missing_percentages:
        avg_missing = sum(missing_percentages) / len(missing_percentages)
        score -= min(avg_missing * 0.5, 30)  # Max 30 points penalty
    
    # Penalize for duplicates
    if total_rows > 0:
        dup_percentage = (duplicate_rows / total_rows) * 100
        score -= min(dup_percentage * 0.3, 15)  # Max 15 points penalty
    
    # Penalize for outliers
    if outlier_percentages:
        avg_outliers = sum(outlier_percentages) / len(outlier_percentages)
        score -= min(avg_outliers * 0.2, 10)  # Max 10 points penalty
    
    score = max(0, min(100, round(score)))
    
    if score >= 80:
        level = "High"
    elif score >= 50:
        level = "Moderate"
    else:
        level = "Low"
    
    return {
        "readiness_score": score,
        "readiness_level": level
    }


def quick_analyze_dataframe(df: pd.DataFrame) -> dict:
    """
    Perform comprehensive quick analysis of a DataFrame.
    Returns structured JSON for frontend consumption.
    """
    row_count = len(df)
    column_count = len(df.columns)
    duplicate_rows = int(df.duplicated().sum())
    
    # Classify columns
    numeric_columns = []
    categorical_columns = []
    datetime_columns = []
    
    for col in df.columns:
        col_type = _detect_column_type(df[col])
        if col_type == "numeric":
            numeric_columns.append(str(col))
        elif col_type == "categorical":
            categorical_columns.append(str(col))
        elif col_type == "datetime":
            datetime_columns.append(str(col))
    
    # ===== 1. Dataset Overview =====
    dataset_overview = {
        "row_count": row_count,
        "column_count": column_count,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "datetime_columns": datetime_columns,
        "duplicate_rows": duplicate_rows
    }
    
    # ===== 2. Missing Data Insights =====
    missing_data_insights = {
        "columns": [],
        "columns_above_30_percent_missing": []
    }
    missing_percentages = []
    
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        missing_pct = round((missing_count / row_count) * 100, 2) if row_count > 0 else 0.0
        missing_percentages.append(missing_pct)
        
        missing_data_insights["columns"].append({
            "column": str(col),
            "missing_count": missing_count,
            "missing_percentage": missing_pct
        })
        
        if missing_pct > 30:
            missing_data_insights["columns_above_30_percent_missing"].append(str(col))
    
    # ===== 3. Key Distributions =====
    key_distributions = {}
    
    # Primary numeric column histogram
    if numeric_columns:
        primary_numeric = numeric_columns[0]
        try:
            hist_data = get_histogram(df, primary_numeric, bins=10)
            key_distributions["primary_numeric_histogram"] = hist_data
        except Exception:
            key_distributions["primary_numeric_histogram"] = None
    
    # Primary categorical column bar
    if categorical_columns:
        primary_categorical = categorical_columns[0]
        try:
            bar_data = get_bar_counts(df, primary_categorical)
            key_distributions["primary_categorical_bar"] = bar_data
        except Exception:
            key_distributions["primary_categorical_bar"] = None
    
    # ===== 4. Strongest Correlations =====
    strongest_correlations = []
    all_correlations = []  # Keep all for scatter recommendations
    
    if len(numeric_columns) >= 2:
        try:
            numeric_df = df[numeric_columns]
            corr_matrix = numeric_df.corr()
            
            # Get all correlations (excluding self-correlations)
            for i, col_a in enumerate(corr_matrix.columns):
                for j, col_b in enumerate(corr_matrix.columns):
                    if i < j:  # Only upper triangle
                        corr_val = corr_matrix.iloc[i, j]
                        if not pd.isna(corr_val):
                            all_correlations.append({
                                "column_a": str(col_a),
                                "column_b": str(col_b),
                                "correlation": _make_serializable(round(corr_val, 4))
                            })
            
            # Sort by absolute correlation
            all_correlations.sort(key=lambda x: abs(x["correlation"] or 0), reverse=True)
            strongest_correlations = all_correlations[:5]  # Top 5
        except Exception:
            pass
    
    # ===== 5. Outlier Detection =====
    outlier_detection = []
    outlier_percentages = []
    
    for col in numeric_columns:
        try:
            outlier_info = _compute_outliers_iqr(df[col])
            outlier_detection.append({
                "column": col,
                "outlier_count": outlier_info["outlier_count"],
                "outlier_percentage": outlier_info["outlier_percentage"]
            })
            outlier_percentages.append(outlier_info["outlier_percentage"])
        except Exception:
            pass
    
    # ===== 6. ML Readiness =====
    ml_readiness = _compute_ml_readiness(
        missing_percentages,
        duplicate_rows,
        row_count,
        outlier_percentages
    )
    
    # ===== 7. Chart Payloads =====
    chart_payloads = {
        "histograms": [],
        "bars": [],
        "correlation_heatmap": None
    }
    
    # Histograms for top 3 numeric columns
    for col in numeric_columns[:3]:
        try:
            hist_data = get_histogram(df, col, bins=10)
            if hist_data:
                chart_payloads["histograms"].append(hist_data)
        except Exception:
            pass
    
    # Bar charts for top 3 categorical columns
    for col in categorical_columns[:3]:
        try:
            bar_data = get_bar_counts(df, col)
            if bar_data:
                chart_payloads["bars"].append(bar_data)
        except Exception:
            pass
    
    # Correlation heatmap
    if len(numeric_columns) >= 2:
        try:
            chart_payloads["correlation_heatmap"] = get_correlation(df)
        except Exception:
            pass
    
    # ===== 8. Scatter Plot Recommendations =====
    from app.services.gemini_analyzer import compute_scatter_recommendations
    scatter_recommendations = compute_scatter_recommendations(
        numeric_columns,
        all_correlations
    )
    
    # ===== 9. Data Quality Assessment =====
    from app.services.gemini_analyzer import compute_data_quality_score
    data_quality = compute_data_quality_score(
        missing_data_insights,
        duplicate_rows,
        row_count,
        outlier_detection
    )
    
    return {
        "dataset_overview": dataset_overview,
        "missing_data_insights": missing_data_insights,
        "key_distributions": key_distributions,
        "strongest_correlations": strongest_correlations,
        "outlier_detection": outlier_detection,
        "ml_readiness": ml_readiness,
        "chart_payloads": chart_payloads,
        "scatter_recommendations": scatter_recommendations,
        "data_quality": data_quality,
        "gemini_insights": None  # Populated by route if Gemini enabled
    }

