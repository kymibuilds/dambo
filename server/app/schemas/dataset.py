from datetime import datetime

from pydantic import BaseModel


class DatasetResponse(BaseModel):
    dataset_id: str
    project_id: str
    filename: str
    file_size: int | None = None
    uploaded_at: datetime


    class Config:
        from_attributes = True


class DatasetListItem(BaseModel):
    dataset_id: str
    filename: str
    file_size: int | None = None
    uploaded_at: datetime

    class Config:
        from_attributes = True
