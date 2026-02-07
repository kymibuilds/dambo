from typing import Any

import numpy as np
import pandas as pd


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
        # Check if it looks like a datetime string
        if series.dtype == object:
            try:
                pd.to_datetime(series.dropna().head(100))
                return "datetime"
            except (ValueError, TypeError):
                pass
        return "categorical"
    return "unknown"


def profile_dataframe(df: pd.DataFrame) -> dict:
    """
    Generate a statistical profile of a pandas DataFrame.
    Returns a JSON-serializable dictionary.
    """
    row_count = len(df)
    column_count = len(df.columns)

    columns = []
    numeric_stats = []
    category_stats = []

    for col_name in df.columns:
        series = df[col_name]
        col_type = _detect_column_type(series)
        missing_count = int(series.isna().sum())
        missing_percentage = round((missing_count / row_count) * 100, 2) if row_count > 0 else 0.0

        column_info = {
            "name": str(col_name),
            "detected_type": col_type,
            "missing_count": missing_count,
            "missing_percentage": missing_percentage
        }
        columns.append(column_info)

        # Compute numeric statistics
        if col_type == "numeric":
            # Calculate histogram
            try:
                hist, bin_edges = np.histogram(series.dropna(), bins=10)
                histogram = []
                for i in range(len(hist)):
                    histogram.append({
                        "bin_start": _make_serializable(bin_edges[i]),
                        "bin_end": _make_serializable(bin_edges[i+1]),
                        "count": int(hist[i])
                    })
            except Exception:
                histogram = []

            stats = {
                "column": str(col_name),
                "mean": _make_serializable(series.mean()),
                "std": _make_serializable(series.std()),
                "min": _make_serializable(series.min()),
                "max": _make_serializable(series.max()),
                "histogram": histogram
            }
            numeric_stats.append(stats)
            
        elif col_type == "categorical":
            # Calculate top values
            try:
                value_counts = series.value_counts().head(10)
                top_values = []
                for val, count in value_counts.items():
                    top_values.append({
                        "value": str(val),
                        "count": int(count)
                    })
                
                cat_stats = {
                    "column": str(col_name),
                    "unique_count": int(series.nunique()),
                    "top_values": top_values
                }
                category_stats.append(cat_stats)
            except Exception:
                pass

    # Get first 5 rows as samples
    samples = []
    try:
        sample_df = df.head(5).replace({np.nan: None})
        samples = sample_df.to_dict(orient="records")
    except Exception:
        pass

    return {
        "shape": {
            "row_count": row_count,
            "column_count": column_count
        },
        "columns": columns,
        "numeric_stats": numeric_stats,
        "category_stats": category_stats,
        "samples": samples
    }
