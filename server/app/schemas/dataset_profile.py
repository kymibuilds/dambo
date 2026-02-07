from typing import Optional

from pydantic import BaseModel


class ShapeInfo(BaseModel):
    row_count: int
    column_count: int


class ColumnInfo(BaseModel):
    name: str
    detected_type: str
    missing_count: int
    missing_percentage: float


class NumericStats(BaseModel):
    column: str
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class DatasetProfileResponse(BaseModel):
    shape: ShapeInfo
    columns: list[ColumnInfo]
    numeric_stats: list[NumericStats]
