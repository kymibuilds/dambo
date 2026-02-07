import os
from pathlib import Path

# Base storage directory
STORAGE_DIR = Path("storage")


def get_storage_path(project_id: str, dataset_id: str) -> Path:
    """Get the full path for storing a dataset file."""
    return STORAGE_DIR / project_id / f"{dataset_id}.csv"


def save_file(project_id: str, dataset_id: str, content: bytes) -> str:
    """
    Save file content to disk.
    Returns the file path as string.
    """
    file_path = get_storage_path(project_id, dataset_id)
    
    # Create directories if they don't exist
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write file
    with open(file_path, "wb") as f:
        f.write(content)
    
    return str(file_path)


def file_exists(project_id: str, dataset_id: str) -> bool:
    """Check if a dataset file exists."""
    return get_storage_path(project_id, dataset_id).exists()
