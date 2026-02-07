from typing import Optional

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
