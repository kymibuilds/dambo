from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models.dataset import Dataset


def load_dataset(db: Session, dataset_id: str) -> pd.DataFrame:
    """
    Load a dataset from disk given its dataset_id.
    Fetches metadata from DB and reads CSV from file_path.
    """
    # Fetch dataset record from database
    dataset = db.query(Dataset).filter(Dataset.dataset_id == dataset_id).first()
    if not dataset:
        raise ValueError(f"Dataset not found: {dataset_id}")

    # Check if file exists (only for local files)
    file_path_str = dataset.file_path
    if file_path_str.startswith("http://") or file_path_str.startswith("https://"):
        # Cloudinary URL - read directly
        try:
            df = pd.read_csv(file_path_str)
            return df
        except Exception as e:
            raise RuntimeError(f"Failed to read dataset from URL: {e}")
    
    # Local file path
    file_path = Path(file_path_str)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    # Read CSV from local disk
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        raise RuntimeError(f"Failed to read dataset file: {e}")
