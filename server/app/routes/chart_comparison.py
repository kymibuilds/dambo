"""Chart Comparison API Routes."""

import logging
from fastapi import APIRouter, HTTPException, Body, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.chart_comparison import compare_charts
from app.services.dataset_loader import load_dataset
from app.services.dataset_profiler import profile_dataframe

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/charts", tags=["chart-comparison"])


class ChartConfig(BaseModel):
    """Chart configuration for comparison."""
    type: str
    props: dict


class CompareRequest(BaseModel):
    """Request body for chart comparison."""
    chart1: ChartConfig
    chart2: ChartConfig
    datasetId: Optional[str] = None


class ComparisonInsight(BaseModel):
    """A single comparison insight."""
    comparison_title: str
    relationship_type: str
    key_insights: list[str]
    statistical_notes: str
    recommendation: str
    visualization_suggestion: Optional[dict] = None


class CompareResponse(BaseModel):
    """Response from chart comparison."""
    success: bool
    comparison: ComparisonInsight
    charts: dict


@router.post("/compare", response_model=CompareResponse)
async def compare_charts_endpoint(
    request: CompareRequest,
    db: Session = Depends(get_db)
):
    """
    Compare two chart configurations and generate insights.
    
    Uses Gemini AI to analyze the relationship between charts
    and provide actionable insights.
    """
    try:
        # Get dataset profile if available
        profile = None
        if request.datasetId:
            try:
                # Load dataset and generate profile
                df = load_dataset(db, request.datasetId)
                profile = profile_dataframe(df)
            except Exception as e:
                logger.warning(f"Failed to get profile for comparison: {e}")
        
        result = await compare_charts(
            chart1=request.chart1.model_dump(),
            chart2=request.chart2.model_dump(),
            dataset_profile=profile
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Chart comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
