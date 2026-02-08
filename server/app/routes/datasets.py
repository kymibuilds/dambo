from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset
from app.db.models.project import Project
from app.db.session import get_db
from app.schemas.dataset import DatasetListItem, DatasetResponse
from app.services.file_storage import save_file
from app.services.id_generator import generate_unique_id

router = APIRouter()


def get_existing_dataset_ids(db: Session, project_id: str) -> set[str]:
    """Get all existing dataset_ids for a project."""
    results = db.query(Dataset.dataset_id).filter(Dataset.project_id == project_id).all()
    return {r[0] for r in results}


@router.post("/projects/{project_id}/datasets", response_model=DatasetResponse)
async def upload_dataset(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CSV file to a project."""
    # Validate project exists
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")

    # Validate file extension
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    # Read file content
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Generate unique dataset_id
    existing_ids = get_existing_dataset_ids(db, project_id)
    dataset_id = generate_unique_id(existing_ids)

    # Save file to disk
    file_path = save_file(project_id, dataset_id, content)

    # Create database record
    dataset = Dataset(
        dataset_id=dataset_id,
        project_id=project_id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(content)
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return dataset


@router.get("/projects/{project_id}/datasets", response_model=list[DatasetListItem])
def list_datasets(project_id: str, db: Session = Depends(get_db)):
    """List all datasets for a project."""
    # Validate project exists
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")

    datasets = (
        db.query(Dataset)
        .filter(Dataset.project_id == project_id)
        .order_by(Dataset.uploaded_at.desc())
        .all()
    )
    return datasets
