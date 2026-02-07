from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset
from app.db.session import get_db
from app.schemas.dataset_visualization import (
    BarChartResponse,
    CorrelationResponse,
    HistogramResponse,
    ScatterResponse,
)
from app.services.dataset_loader import load_dataset
from app.services.dataset_visualizer import (
    get_bar_counts,
    get_correlation,
    get_histogram,
    get_scatter,
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
    db: Session = Depends(get_db)
):
    """Get histogram data for a numeric column."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_histogram(df, column, bins)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/bar", response_model=BarChartResponse)
def get_bar_data(
    dataset_id: str,
    column: str = Query(..., description="Column name for bar chart"),
    db: Session = Depends(get_db)
):
    """Get bar chart data for a categorical column."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_bar_counts(df, column)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/scatter", response_model=ScatterResponse)
def get_scatter_data(
    dataset_id: str,
    x: str = Query(..., description="X-axis column"),
    y: str = Query(..., description="Y-axis column"),
    db: Session = Depends(get_db)
):
    """Get scatter plot data for two numeric columns."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        result = get_scatter(df, x, y)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/datasets/{dataset_id}/correlation", response_model=CorrelationResponse)
def get_correlation_data(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    """Get correlation matrix for all numeric columns."""
    validate_dataset(dataset_id, db)

    try:
        df = load_dataset(db, dataset_id)
    except (FileNotFoundError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    result = get_correlation(df)
    return result
