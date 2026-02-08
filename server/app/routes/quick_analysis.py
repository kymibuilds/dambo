"""Quick Analysis Route - One-click dataset analysis endpoint."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset
from app.db.session import get_db
from app.schemas.quick_analysis import QuickAnalysisResponse
from app.services.dataset_loader import load_dataset
from app.services.quick_analyzer import quick_analyze_dataframe
from app.services.gemini_analyzer import analyze_with_gemini

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/datasets/{dataset_id}/quick-analysis", response_model=QuickAnalysisResponse)
async def get_quick_analysis(
    dataset_id: str,
    use_gemini: bool = Query(default=True, description="Enable Gemini AI insights"),
    db: Session = Depends(get_db)
):
    """Get comprehensive quick analysis of a dataset with optional AI insights."""
    # Validate dataset exists
    dataset = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")

    # Load DataFrame
    try:
        df = load_dataset(db, dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Generate quick analysis
    analysis = quick_analyze_dataframe(df)

    # Optionally enhance with Gemini AI insights
    if use_gemini:
        try:
            gemini_insights = await analyze_with_gemini(analysis)
            analysis["gemini_insights"] = gemini_insights
            logger.info(f"Gemini insights added for dataset {dataset_id}")
        except Exception as e:
            logger.warning(f"Gemini analysis failed for {dataset_id}: {e}")
            # Keep gemini_insights as None, don't fail the request

    return analysis

