from datetime import datetime

from pydantic import BaseModel


class DatasetResponse(BaseModel):
    dataset_id: str
    project_id: str
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DatasetListItem(BaseModel):
    dataset_id: str
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
