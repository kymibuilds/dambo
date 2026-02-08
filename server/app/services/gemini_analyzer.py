"""Gemini Analyzer Service - AI-powered intelligent dataset analysis."""

import os
import json
import logging
from typing import Any, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


def _configure_gemini():
    """Configure Gemini client with API key."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. AI-powered insights will be disabled.")
        return None
    
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.3,
        }
    )


# Initialize model (lazy)
_model = None


def _get_model():
    """Get or initialize the Gemini model."""
    global _model
    if _model is None:
        _model = _configure_gemini()
    return _model


async def analyze_with_gemini(analysis_data: dict) -> Optional[dict]:
    """
    Send dataset analysis summary to Gemini for intelligent insights.
    
    Args:
        analysis_data: The structured analysis from quick_analyzer
        
    Returns:
        GeminiInsights dict with recommendations, or None if Gemini unavailable
    """
    model = _get_model()
    if not model:
        return None
    
    try:
        # Build a concise summary for Gemini (avoid sending raw data)
        summary = _build_analysis_summary(analysis_data)
        
        prompt = f"""You are an expert ML data scientist. Analyze this dataset summary and provide actionable insights for data preparation.

Dataset Summary:
{json.dumps(summary, indent=2)}

Provide a JSON response with the following structure:
{{
    "scatter_plot_recommendations": [
        {{
            "x": "column_x",
            "y": "column_y", 
            "reason": "Brief explanation of why this relationship is interesting"
        }}
    ],
    "feature_importance_hints": [
        {{
            "column": "column_name",
            "role": "target|feature|id|drop",
            "reason": "Brief explanation"
        }}
    ],
    "data_prep_tips": [
        "Specific, actionable tip 1",
        "Specific, actionable tip 2"
    ],
    "encoding_suggestions": [
        {{
            "column": "column_name",
            "method": "one_hot|label|ordinal|target",
            "reason": "Brief explanation"
        }}
    ],
    "scaling_suggestions": [
        {{
            "column": "column_name",
            "method": "standard|minmax|robust|none",
            "reason": "Brief explanation"
        }}
    ],
    "overall_assessment": "2-3 sentence summary of data quality and ML readiness"
}}

Focus on:
1. Most interesting column relationships for scatter plots (pick top 2-3)
2. Which columns are likely targets vs features vs IDs to drop
3. Practical data cleaning steps based on missing data and outliers
4. Specific encoding recommendations for categorical columns
5. Scaling recommendations for numeric columns

Be concise and actionable. Only include relevant suggestions."""

        response = model.generate_content(prompt)
        result = json.loads(response.text)
        
        logger.info("Gemini analysis completed successfully")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        return None


def _build_analysis_summary(data: dict) -> dict:
    """Build a concise summary for Gemini, avoiding raw data transfer."""
    overview = data.get("dataset_overview", {})
    missing = data.get("missing_data_insights", {})
    correlations = data.get("strongest_correlations", [])
    outliers = data.get("outlier_detection", [])
    ml_readiness = data.get("ml_readiness", {})
    
    return {
        "shape": {
            "rows": overview.get("row_count", 0),
            "columns": overview.get("column_count", 0)
        },
        "column_types": {
            "numeric": overview.get("numeric_columns", []),
            "categorical": overview.get("categorical_columns", []),
            "datetime": overview.get("datetime_columns", [])
        },
        "data_quality": {
            "duplicate_rows": overview.get("duplicate_rows", 0),
            "columns_with_high_missing": missing.get("columns_above_30_percent_missing", []),
            "missing_summary": [
                {"column": c["column"], "pct": c["missing_percentage"]}
                for c in missing.get("columns", [])
                if c["missing_percentage"] > 5
            ]
        },
        "correlations": [
            {
                "columns": [c["column_a"], c["column_b"]],
                "value": c["correlation"]
            }
            for c in correlations[:5]  # Top 5
        ],
        "outliers": [
            {"column": o["column"], "pct": o["outlier_percentage"]}
            for o in outliers
            if o["outlier_percentage"] > 3
        ],
        "ml_readiness": {
            "score": ml_readiness.get("readiness_score", 0),
            "level": ml_readiness.get("readiness_level", "Unknown")
        }
    }


def compute_scatter_recommendations(
    numeric_columns: list[str],
    correlations: list[dict]
) -> list[dict]:
    """
    Compute scatter plot recommendations based on correlation strength.
    
    Returns pairs sorted by correlation strength. If no correlations exist
    but there are 2+ numeric columns, returns column pairs anyway.
    """
    recommendations = []
    
    # First, try to use correlations
    for corr in correlations:
        corr_value = corr.get("correlation")
        if corr_value is None:
            continue
        
        # Lowered threshold to 0.1 to include weaker correlations
        if abs(corr_value) >= 0.1:
            if corr_value > 0.7:
                relationship = "Strong positive correlation"
            elif corr_value > 0.3:
                relationship = "Moderate positive correlation"
            elif corr_value > 0.1:
                relationship = "Weak positive correlation"
            elif corr_value < -0.7:
                relationship = "Strong negative correlation"
            elif corr_value < -0.3:
                relationship = "Moderate negative correlation"
            else:
                relationship = "Weak negative correlation"
                
            recommendations.append({
                "x": corr["column_a"],
                "y": corr["column_b"],
                "correlation": round(corr_value, 4),
                "insight": relationship
            })
    
    # Sort by absolute correlation value
    recommendations.sort(key=lambda r: abs(r["correlation"]), reverse=True)
    
    # Fallback: if no correlation-based recommendations but 2+ numeric columns exist,
    # create recommendations for the first few pairs
    if len(recommendations) == 0 and len(numeric_columns) >= 2:
        from itertools import combinations
        for col_a, col_b in list(combinations(numeric_columns[:4], 2))[:5]:
            recommendations.append({
                "x": col_a,
                "y": col_b,
                "correlation": 0.0,
                "insight": "Explore relationship"
            })
    
    return recommendations[:5]  # Top 5


def compute_data_quality_score(
    missing_data: dict,
    duplicate_rows: int,
    total_rows: int,
    outlier_detection: list[dict]
) -> dict:
    """
    Compute a detailed data quality assessment.
    
    Returns structured quality metrics with severity levels.
    """
    issues = []
    score = 100.0
    
    # Check for high missing data
    high_missing_cols = missing_data.get("columns_above_30_percent_missing", [])
    if high_missing_cols:
        severity = "critical" if len(high_missing_cols) > 2 else "warning"
        issues.append({
            "type": "missing_data",
            "severity": severity,
            "message": f"{len(high_missing_cols)} column(s) have >30% missing values",
            "affected_columns": high_missing_cols
        })
        score -= min(len(high_missing_cols) * 10, 30)
    
    # Check moderate missing data
    moderate_missing = [
        c["column"] for c in missing_data.get("columns", [])
        if 10 < c["missing_percentage"] <= 30
    ]
    if moderate_missing:
        issues.append({
            "type": "missing_data",
            "severity": "info",
            "message": f"{len(moderate_missing)} column(s) have 10-30% missing values",
            "affected_columns": moderate_missing
        })
        score -= min(len(moderate_missing) * 3, 15)
    
    # Check duplicates
    if total_rows > 0:
        dup_pct = (duplicate_rows / total_rows) * 100
        if dup_pct > 5:
            severity = "warning" if dup_pct <= 20 else "critical"
            issues.append({
                "type": "duplicates",
                "severity": severity,
                "message": f"{duplicate_rows} duplicate rows ({dup_pct:.1f}%)",
                "affected_columns": []
            })
            score -= min(dup_pct, 20)
    
    # Check outliers
    high_outlier_cols = [
        o["column"] for o in outlier_detection
        if o["outlier_percentage"] > 5
    ]
    if high_outlier_cols:
        issues.append({
            "type": "outliers",
            "severity": "info",
            "message": f"{len(high_outlier_cols)} column(s) have >5% outliers",
            "affected_columns": high_outlier_cols
        })
        score -= min(len(high_outlier_cols) * 2, 10)
    
    # Determine overall level
    score = max(0, min(100, round(score)))
    if score >= 80:
        level = "Good"
    elif score >= 60:
        level = "Fair"
    elif score >= 40:
        level = "Needs Work"
    else:
        level = "Poor"
    
    return {
        "overall_score": score,
        "level": level,
        "issues": issues
    }
