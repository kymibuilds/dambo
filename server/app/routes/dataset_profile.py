from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset
from app.db.session import get_db
from app.schemas.dataset_profile import DatasetProfileResponse
from app.services.dataset_loader import load_dataset
from app.services.dataset_profiler import profile_dataframe

router = APIRouter()


@router.get("/datasets/{dataset_id}/profile", response_model=DatasetProfileResponse)
def get_dataset_profile(dataset_id: str, db: Session = Depends(get_db)):
    """Get statistical profile of a dataset."""
    # Validate dataset exists
    dataset = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset not found: {dataset_id}")

    # Load DataFrame
    try:
        df = load_dataset(db, dataset_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Generate profile
    profile = profile_dataframe(df)

    return profile
