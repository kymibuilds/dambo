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
        return [_make_serializable(v) for v in value.tolist()]
    elif pd.isna(value):
        return None
    return value


def get_histogram(df: pd.DataFrame, column: str, bins: int = 10) -> dict:
    """
    Compute histogram data for a numeric column.
    Returns bins and counts for chart rendering.
    """
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")

    series = df[column].dropna()

    if not pd.api.types.is_numeric_dtype(series):
        raise ValueError(f"Column '{column}' is not numeric")

    if len(series) == 0:
        return {
            "column": column,
            "bins": [],
            "counts": []
        }

    counts, bin_edges = np.histogram(series, bins=bins)

    return {
        "column": column,
        "bins": [_make_serializable(b) for b in bin_edges.tolist()],
        "counts": [_make_serializable(c) for c in counts.tolist()]
    }


def get_bar_counts(df: pd.DataFrame, column: str) -> dict:
    """
    Compute value counts for a categorical column.
    Returns categories and counts for bar chart rendering.
    """
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")

    series = df[column].dropna()
    value_counts = series.value_counts()

    return {
        "column": column,
        "categories": [str(cat) for cat in value_counts.index.tolist()],
        "counts": [_make_serializable(c) for c in value_counts.values.tolist()]
    }


def get_scatter(df: pd.DataFrame, x: str, y: str) -> dict:
    """
    Extract x and y values for scatter plot.
    Both columns must be numeric.
    """
    if x not in df.columns:
        raise ValueError(f"Column not found: {x}")
    if y not in df.columns:
        raise ValueError(f"Column not found: {y}")

    if not pd.api.types.is_numeric_dtype(df[x]):
        raise ValueError(f"Column '{x}' is not numeric")
    if not pd.api.types.is_numeric_dtype(df[y]):
        raise ValueError(f"Column '{y}' is not numeric")

    # Drop rows where either column has NaN
    clean_df = df[[x, y]].dropna()

    return {
        "x_label": x,
        "y_label": y,
        "x": [_make_serializable(v) for v in clean_df[x].tolist()],
        "y": [_make_serializable(v) for v in clean_df[y].tolist()]
    }


def get_correlation(df: pd.DataFrame) -> dict:
    """
    Compute correlation matrix for numeric columns.
    Returns column names and correlation matrix.
    """
    # Select only numeric columns
    numeric_df = df.select_dtypes(include=[np.number])

    if numeric_df.empty or len(numeric_df.columns) < 2:
        return {
            "columns": list(numeric_df.columns) if not numeric_df.empty else [],
            "matrix": []
        }

    corr_matrix = numeric_df.corr()

    # Convert to list of lists, handling NaN values
    matrix = []
    for row in corr_matrix.values:
        matrix.append([_make_serializable(v) for v in row])

    return {
        "columns": list(corr_matrix.columns),
        "matrix": matrix
    }
