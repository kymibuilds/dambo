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


def get_line_data(df: pd.DataFrame, date_col: str, value_col: str, group_col: str = None) -> dict:
    """
    Compute line chart data for time series.
    Groups by date and optionally by a category column.
    """
    if date_col not in df.columns:
        raise ValueError(f"Column not found: {date_col}")
    if value_col not in df.columns:
        raise ValueError(f"Column not found: {value_col}")

    # Convert to datetime if needed
    df_copy = df.copy()
    df_copy[date_col] = pd.to_datetime(df_copy[date_col], errors='coerce')
    df_copy = df_copy.dropna(subset=[date_col, value_col])

    if group_col and group_col in df.columns:
        # Multiple lines - one per group
        grouped = df_copy.groupby([date_col, group_col])[value_col].sum().reset_index()
        groups = grouped[group_col].unique().tolist()
        
        series = []
        for group in groups:
            group_data = grouped[grouped[group_col] == group]
            series.append({
                "name": str(group),
                "data": [
                    {"date": row[date_col].isoformat(), "value": _make_serializable(row[value_col])}
                    for _, row in group_data.iterrows()
                ]
            })
        return {"date_column": date_col, "value_column": value_col, "series": series}
    else:
        # Single line
        grouped = df_copy.groupby(date_col)[value_col].sum().reset_index()
        data = [
            {"date": row[date_col].isoformat(), "value": _make_serializable(row[value_col])}
            for _, row in grouped.iterrows()
        ]
        return {"date_column": date_col, "value_column": value_col, "data": data}


def get_pie_data(df: pd.DataFrame, column: str, limit: int = 10) -> dict:
    """
    Compute pie/donut chart data for categorical breakdown.
    Returns top N categories with 'Other' for rest.
    """
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")

    value_counts = df[column].value_counts()
    
    # Take top N and group rest as "Other"
    if len(value_counts) > limit:
        top = value_counts.head(limit - 1)
        other_count = value_counts.tail(len(value_counts) - limit + 1).sum()
        categories = [str(cat) for cat in top.index.tolist()] + ["Other"]
        values = [_make_serializable(v) for v in top.values.tolist()] + [_make_serializable(other_count)]
    else:
        categories = [str(cat) for cat in value_counts.index.tolist()]
        values = [_make_serializable(v) for v in value_counts.values.tolist()]

    return {
        "column": column,
        "categories": categories,
        "values": values
    }


def get_area_data(df: pd.DataFrame, date_col: str, value_col: str, stack_col: str) -> dict:
    """
    Compute stacked area chart data.
    Groups by date and stack column for cumulative display.
    """
    if date_col not in df.columns:
        raise ValueError(f"Column not found: {date_col}")
    if value_col not in df.columns:
        raise ValueError(f"Column not found: {value_col}")
    if stack_col not in df.columns:
        raise ValueError(f"Column not found: {stack_col}")

    df_copy = df.copy()
    df_copy[date_col] = pd.to_datetime(df_copy[date_col], errors='coerce')
    df_copy = df_copy.dropna(subset=[date_col, value_col])

    # Pivot: date x stack_col with sum of value_col
    pivot = df_copy.pivot_table(
        index=date_col, 
        columns=stack_col, 
        values=value_col, 
        aggfunc='sum',
        fill_value=0
    ).reset_index()

    dates = [d.isoformat() for d in pivot[date_col].tolist()]
    stacks = [col for col in pivot.columns if col != date_col]

    series = []
    for stack in stacks:
        series.append({
            "name": str(stack),
            "values": [_make_serializable(v) for v in pivot[stack].tolist()]
        })

    return {
        "date_column": date_col,
        "value_column": value_col,
        "stack_column": stack_col,
        "dates": dates,
        "series": series
    }


def get_boxplot(df: pd.DataFrame, column: str) -> dict:
    """
    Compute box plot statistics: min, q1, median, q3, max, and outliers.
    """
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")

    series = df[column].dropna()

    if not pd.api.types.is_numeric_dtype(series):
        raise ValueError(f"Column '{column}' is not numeric")

    if len(series) == 0:
        return {"column": column, "stats": None, "outliers": []}

    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = series[(series < lower_bound) | (series > upper_bound)].tolist()

    return {
        "column": column,
        "stats": {
            "min": _make_serializable(series.min()),
            "q1": _make_serializable(q1),
            "median": _make_serializable(series.median()),
            "q3": _make_serializable(q3),
            "max": _make_serializable(series.max()),
            "mean": _make_serializable(series.mean())
        },
        "outliers": [_make_serializable(o) for o in outliers]
    }


def get_treemap_data(df: pd.DataFrame, group_cols: list, value_col: str) -> dict:
    """
    Compute treemap data for hierarchical visualization.
    Supports multiple grouping levels.
    """
    for col in group_cols:
        if col not in df.columns:
            raise ValueError(f"Column not found: {col}")
    if value_col not in df.columns:
        raise ValueError(f"Column not found: {value_col}")

    # Group by all group_cols and sum value_col
    grouped = df.groupby(group_cols)[value_col].sum().reset_index()

    # Build hierarchical structure
    nodes = []
    for _, row in grouped.iterrows():
        path = [str(row[col]) for col in group_cols]
        nodes.append({
            "path": path,
            "value": _make_serializable(row[value_col])
        })

    return {
        "group_columns": group_cols,
        "value_column": value_col,
        "nodes": nodes
    }


def get_stacked_bar(df: pd.DataFrame, category_col: str, stack_col: str, value_col: str = None) -> dict:
    """
    Compute stacked bar chart data.
    Groups by category and stacks by another dimension.
    """
    if category_col not in df.columns:
        raise ValueError(f"Column not found: {category_col}")
    if stack_col not in df.columns:
        raise ValueError(f"Column not found: {stack_col}")

    if value_col and value_col in df.columns:
        # Sum value_col
        pivot = df.pivot_table(
            index=category_col,
            columns=stack_col,
            values=value_col,
            aggfunc='sum',
            fill_value=0
        )
    else:
        # Count occurrences
        pivot = df.pivot_table(
            index=category_col,
            columns=stack_col,
            aggfunc='size',
            fill_value=0
        )

    categories = [str(cat) for cat in pivot.index.tolist()]
    stacks = [str(s) for s in pivot.columns.tolist()]

    data = []
    for stack in pivot.columns:
        data.append({
            "name": str(stack),
            "values": [_make_serializable(v) for v in pivot[stack].tolist()]
        })

    return {
        "category_column": category_col,
        "stack_column": stack_col,
        "value_column": value_col,
        "categories": categories,
        "stacks": stacks,
        "data": data
    }

