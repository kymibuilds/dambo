"""Quick Analysis Pydantic Schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ColumnMissingInfo(BaseModel):
    column: str
    missing_count: int
    missing_percentage: float


class MissingDataInsights(BaseModel):
    columns: List[ColumnMissingInfo]
    columns_above_30_percent_missing: List[str]


class DatasetOverview(BaseModel):
    row_count: int
    column_count: int
    numeric_columns: List[str]
    categorical_columns: List[str]
    datetime_columns: List[str]
    duplicate_rows: int


class CorrelationPair(BaseModel):
    column_a: str
    column_b: str
    correlation: Optional[float]


class OutlierInfo(BaseModel):
    column: str
    outlier_count: int
    outlier_percentage: float


class MLReadiness(BaseModel):
    readiness_score: int
    readiness_level: str  # "Low" | "Moderate" | "High"


class HistogramPayload(BaseModel):
    column: str
    bins: List[float]
    counts: List[int]


class BarPayload(BaseModel):
    column: str
    categories: List[str]
    counts: List[int]


class CorrelationPayload(BaseModel):
    columns: List[str]
    matrix: List[List[Optional[float]]]


class KeyDistributions(BaseModel):
    primary_numeric_histogram: Optional[HistogramPayload] = None
    primary_categorical_bar: Optional[BarPayload] = None


class ChartPayloads(BaseModel):
    histograms: List[HistogramPayload] = []
    bars: List[BarPayload] = []
    correlation_heatmap: Optional[CorrelationPayload] = None


# ===== New Smart Quick Analysis Schemas =====

class ScatterRecommendation(BaseModel):
    """A recommended scatter plot based on correlation strength."""
    x: str
    y: str
    correlation: float
    insight: str  # e.g., "Strong positive correlation"


class DataQualityIssue(BaseModel):
    """A data quality issue detected in the dataset."""
    type: str  # "missing_data" | "duplicates" | "outliers"
    severity: str  # "info" | "warning" | "critical"
    message: str
    affected_columns: List[str]


class DataQuality(BaseModel):
    """Overall data quality assessment."""
    overall_score: int  # 0-100
    level: str  # "Good" | "Fair" | "Needs Work" | "Poor"
    issues: List[DataQualityIssue]


class GeminiInsights(BaseModel):
    """AI-powered insights from Gemini."""
    scatter_plot_recommendations: Optional[List[Dict[str, Any]]] = None
    feature_importance_hints: Optional[List[Dict[str, Any]]] = None
    data_prep_tips: Optional[List[str]] = None
    encoding_suggestions: Optional[List[Dict[str, Any]]] = None
    scaling_suggestions: Optional[List[Dict[str, Any]]] = None
    overall_assessment: Optional[str] = None


class QuickAnalysisResponse(BaseModel):
    dataset_overview: DatasetOverview
    missing_data_insights: MissingDataInsights
    key_distributions: KeyDistributions
    strongest_correlations: List[CorrelationPair]
    outlier_detection: List[OutlierInfo]
    ml_readiness: MLReadiness
    chart_payloads: ChartPayloads
    # New smart analysis fields
    scatter_recommendations: List[ScatterRecommendation]
    data_quality: DataQuality
    gemini_insights: Optional[GeminiInsights] = None

