from typing import Any, Optional

from pydantic import BaseModel


class HistogramResponse(BaseModel):
    column: str
    bins: list[float]
    counts: list[int]


class BarChartResponse(BaseModel):
    column: str
    categories: list[str]
    counts: list[int]


class ScatterResponse(BaseModel):
    x_label: str
    y_label: str
    x: list[float]
    y: list[float]


class CorrelationResponse(BaseModel):
    columns: list[str]
    matrix: list[list[Optional[float]]]


# ============ New Chart Types ============

class LineDataPoint(BaseModel):
    date: str
    value: float


class LineSeriesItem(BaseModel):
    name: str
    data: list[LineDataPoint]


class LineChartResponse(BaseModel):
    date_column: str
    value_column: str
    data: Optional[list[LineDataPoint]] = None  # Single line
    series: Optional[list[LineSeriesItem]] = None  # Multiple lines


class PieChartResponse(BaseModel):
    column: str
    categories: list[str]
    values: list[float]


class AreaSeriesItem(BaseModel):
    name: str
    values: list[float]


class AreaChartResponse(BaseModel):
    date_column: str
    value_column: str
    stack_column: str
    dates: list[str]
    series: list[AreaSeriesItem]


class BoxPlotStats(BaseModel):
    min: float
    q1: float
    median: float
    q3: float
    max: float
    mean: float


class BoxPlotResponse(BaseModel):
    column: str
    stats: Optional[BoxPlotStats] = None
    outliers: list[float]


class TreemapNode(BaseModel):
    path: list[str]
    value: float


class TreemapResponse(BaseModel):
    group_columns: list[str]
    value_column: str
    nodes: list[TreemapNode]


class StackedBarSeriesItem(BaseModel):
    name: str
    values: list[float]


class StackedBarResponse(BaseModel):
    category_column: str
    stack_column: str
    value_column: Optional[str] = None
    categories: list[str]
    stacks: list[str]
    data: list[StackedBarSeriesItem]

