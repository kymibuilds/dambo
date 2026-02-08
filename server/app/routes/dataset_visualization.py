from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset
from app.db.session import get_db
from app.schemas.dataset_visualization import (
    AreaChartResponse,
    BarChartResponse,
    BoxPlotResponse,
    CorrelationResponse,
    HistogramResponse,
    LineChartResponse,
    PieChartResponse,
    ScatterResponse,
    StackedBarResponse,
    TreemapResponse,
)
from app.services.dataset_loader import load_dataset
from app.services.dataset_visualizer import (
    get_area_data,
    get_bar_counts,
    get_boxplot,
    get_correlation,
    get_histogram,
    get_line_data,
    get_pie_data,
    get_scatter,
    get_stacked_bar,
    get_treemap_data,
)

router = APIRouter()


def validate_dataset(dataset_id: str, db: Session) -> Dataset:
    """Validate dataset exists and return it."""
    dataset = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")
    return dataset



@router.get("/datasets/{dataset_id}/histogram", response_model=HistogramResponse)
def get_histogram_data(
    dataset_id: str,
    column: str = Query(..., description="Column name for histogram"),
    bins: int = Query(10, ge=1, le=100, description="Number of bins"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator (>, <, ==, etc.)"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get histogram data for a numeric column."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_histogram(df, column, bins, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/bar", response_model=BarChartResponse)
def get_bar_data(
    dataset_id: str,
    column: str = Query(..., description="Column name for bar chart"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator (>, <, ==, etc.)"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get bar chart data for a categorical column."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_bar_counts(df, column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/scatter", response_model=ScatterResponse)
def get_scatter_data(
    dataset_id: str,
    x: str = Query(..., description="X-axis column"),
    y: str = Query(..., description="Y-axis column"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator (>, <, ==, etc.)"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get scatter plot data for two numeric columns."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_scatter(df, x, y, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/correlation", response_model=CorrelationResponse)
def get_correlation_data(
    dataset_id: str,
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get correlation matrix for all numeric columns."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    result = get_correlation(df, filter_column, filter_operator, filter_value)
    return result


# ============ New Chart Endpoints ============

@router.get("/datasets/{dataset_id}/line", response_model=LineChartResponse)
def get_line_chart_data(
    dataset_id: str,
    date_column: str = Query(..., description="Date/time column"),
    value_column: str = Query(..., description="Value column to plot"),
    group_column: Optional[str] = Query(None, description="Optional grouping column for multiple lines"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get line chart data for time series visualization."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_line_data(df, date_column, value_column, group_column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/pie", response_model=PieChartResponse)
def get_pie_chart_data(
    dataset_id: str,
    column: str = Query(..., description="Categorical column for pie chart"),
    limit: int = Query(10, ge=1, le=20, description="Max number of slices"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get pie/donut chart data for categorical breakdown."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_pie_data(df, column, limit, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/area", response_model=AreaChartResponse)
def get_area_chart_data(
    dataset_id: str,
    date_column: str = Query(..., description="Date/time column"),
    value_column: str = Query(..., description="Value column to stack"),
    stack_column: str = Query(..., description="Column to stack by"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get stacked area chart data."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_area_data(df, date_column, value_column, stack_column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/boxplot", response_model=BoxPlotResponse)
def get_boxplot_data(
    dataset_id: str,
    column: str = Query(..., description="Numeric column for box plot"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get box plot statistics (quartiles, outliers)."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_boxplot(df, column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/treemap", response_model=TreemapResponse)
def get_treemap_chart_data(
    dataset_id: str,
    group_columns: str = Query(..., description="Comma-separated grouping columns"),
    value_column: str = Query(..., description="Value column for sizing"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get treemap data for hierarchical visualization."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        group_cols = [col.strip() for col in group_columns.split(",")]
        result = get_treemap_data(df, group_cols, value_column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/stacked-bar", response_model=StackedBarResponse)
def get_stacked_bar_data(
    dataset_id: str,
    category_column: str = Query(..., description="Category axis column"),
    stack_column: str = Query(..., description="Column to stack by"),
    value_column: Optional[str] = Query(None, description="Value column (optional, counts if omitted)"),
    filter_column: Optional[str] = Query(None, description="Column to filter by"),
    filter_operator: Optional[str] = Query(None, description="Filter operator"),
    filter_value: Optional[str] = Query(None, description="Filter value"),
    db: Session = Depends(get_db)
):
    """Get stacked bar chart data."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_stacked_bar(df, category_column, stack_column, value_column, filter_column, filter_operator, filter_value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result

