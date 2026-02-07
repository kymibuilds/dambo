from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models.project import Project
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.id_generator import generate_unique_id

router = APIRouter()


def get_existing_project_ids(db: Session) -> set[str]:
    """Get all existing project_ids from database."""
    results = db.query(Project.project_id).all()
    return {r[0] for r in results}


@router.post("/projects", response_model=ProjectResponse)
def create_project(project_data: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project with a unique 6-char ID."""
    existing_ids = get_existing_project_ids(db)
    project_id = generate_unique_id(existing_ids)

    project = Project(
        project_id=project_id,
        name=project_data.name
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """List all projects ordered by newest first."""
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return projects


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    """Get a single project by project_id."""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
    return project
