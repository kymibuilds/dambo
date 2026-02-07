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

    # Check if file exists
    file_path = Path(dataset.file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    # Read CSV
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        raise RuntimeError(f"Failed to read dataset file: {e}")
