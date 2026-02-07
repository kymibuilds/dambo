from fastapi import APIRouter

from app.services.dataframe_store import create_project

router = APIRouter()


@router.post("/projects")
async def create_new_project():
    """Create a new project and return its unique 6-char ID."""
    project_id = create_project()
    return {"project_id": project_id}
