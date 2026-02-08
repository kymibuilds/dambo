"""Chart Comparison Service - Compare two chart visualizations using Gemini."""

import os
import json
import logging
from typing import Optional, Any

import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Reuse model configuration
_model = None


def _get_model():
    """Get or initialize the Gemini model."""
    global _model
    if _model is None:
        if not GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set.")
            return None
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.3,
            }
        )
    return _model


async def compare_charts(
    chart1: dict,
    chart2: dict,
    dataset_profile: Optional[dict] = None
) -> dict:
    """
    Compare two chart configurations and generate insights using Gemini.
    
    Args:
        chart1: First chart config {type, props: {datasetId, column, ...}}
        chart2: Second chart config {type, props: {datasetId, column, ...}}
        dataset_profile: Optional dataset profile for context
        
    Returns:
        Comparison insights dict
    """
    model = _get_model()
    
    # Build comparison context
    context = _build_comparison_context(chart1, chart2, dataset_profile)
    
    if not model:
        # Fallback: return basic comparison without Gemini
        return _generate_basic_comparison(chart1, chart2)
    
    try:
        prompt = f"""You are an expert data analyst. Analyze these two chart configurations and provide comparison insights.

Chart 1:
{json.dumps(context['chart1'], indent=2)}

Chart 2:
{json.dumps(context['chart2'], indent=2)}

{f"Dataset Profile: {json.dumps(context['profile'], indent=2)}" if context.get('profile') else ""}

Provide a JSON response with:
{{
    "comparison_title": "Brief title summarizing the comparison (max 6 words)",
    "relationship_type": "correlation|distribution|trend|categorical|mixed",
    "key_insights": [
        "Insight 1 - specific observation about the relationship",
        "Insight 2 - actionable finding"
    ],
    "statistical_notes": "One sentence about statistical relationship if applicable",
    "recommendation": "What to explore next based on this comparison",
    "visualization_suggestion": {{
        "type": "scatter_chart|line_chart|bar_chart|none",
        "reason": "Why this visualization would help"
    }}
}}

Be concise and specific. Focus on actionable insights."""

        response = model.generate_content(prompt)
        result = json.loads(response.text)
        
        logger.info("Chart comparison completed successfully")
        return {
            "success": True,
            "comparison": result,
            "charts": {
                "chart1": chart1,
                "chart2": chart2
            }
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        return _generate_basic_comparison(chart1, chart2)
    except Exception as e:
        logger.error(f"Chart comparison failed: {e}")
        return _generate_basic_comparison(chart1, chart2)


def _build_comparison_context(chart1: dict, chart2: dict, profile: Optional[dict]) -> dict:
    """Build context for comparison prompt."""
    def extract_chart_info(chart: dict) -> dict:
        chart_type = chart.get("type", "unknown")
        props = chart.get("props", {})
        
        info = {
            "type": chart_type,
            "column": props.get("column") or props.get("valueColumn") or props.get("categoryColumn"),
        }
        
        # Add type-specific info
        if chart_type == "scatter_chart":
            info["x_column"] = props.get("x")
            info["y_column"] = props.get("y")
        elif chart_type in ["line_chart", "area_chart"]:
            info["date_column"] = props.get("dateColumn")
            info["value_column"] = props.get("valueColumn")
        elif chart_type == "stacked_bar_chart":
            info["category_column"] = props.get("categoryColumn")
            info["stack_column"] = props.get("stackColumn")
            
        return info
    
    context = {
        "chart1": extract_chart_info(chart1),
        "chart2": extract_chart_info(chart2),
    }
    
    if profile:
        context["profile"] = {
            "columns": [
                {
                    "name": c.get("name"), 
                    "type": c.get("type") or c.get("detected_type")
                }
                for c in profile.get("columns", [])[:10]
            ]
        }
    
    return context


def _generate_basic_comparison(chart1: dict, chart2: dict) -> dict:
    """Generate basic comparison without Gemini."""
    type1 = chart1.get("type", "chart")
    type2 = chart2.get("type", "chart")
    
    col1 = chart1.get("props", {}).get("column", "data")
    col2 = chart2.get("props", {}).get("column", "data")
    
    return {
        "success": True,
        "comparison": {
            "comparison_title": f"{col1} vs {col2}",
            "relationship_type": "mixed",
            "key_insights": [
                f"Comparing {type1.replace('_', ' ')} of {col1}",
                f"With {type2.replace('_', ' ')} of {col2}"
            ],
            "statistical_notes": "Connect charts to explore relationships",
            "recommendation": "Consider creating a scatter plot to visualize the relationship",
            "visualization_suggestion": {
                "type": "scatter_chart" if col1 != col2 else "none",
                "reason": "Scatter plots reveal correlations between variables"
            }
        },
        "charts": {
            "chart1": chart1,
            "chart2": chart2
        }
    }
