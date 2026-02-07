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
            stats = {
                "column": str(col_name),
                "mean": _make_serializable(series.mean()),
                "std": _make_serializable(series.std()),
                "min": _make_serializable(series.min()),
                "max": _make_serializable(series.max())
            }
            numeric_stats.append(stats)

    return {
        "shape": {
            "row_count": row_count,
            "column_count": column_count
        },
        "columns": columns,
        "numeric_stats": numeric_stats
    }
