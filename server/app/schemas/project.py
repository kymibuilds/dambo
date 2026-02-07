from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    project_id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
