import pandas as pd

from app.services.id_generator import generate_unique_id

# In-memory storage: { project_id: { dataset_id: DataFrame } }
_projects: dict[str, dict[str, pd.DataFrame]] = {}


def create_project() -> str:
    """Create a new project and return its unique 6-char ID."""
    project_id = generate_unique_id(set(_projects.keys()))
    _projects[project_id] = {}
    return project_id


def project_exists(project_id: str) -> bool:
    """Check if a project exists."""
    return project_id in _projects


def save_dataframe(project_id: str, df: pd.DataFrame) -> str:
    """Save a DataFrame under a project and return its unique 6-char dataset_id."""
    if not project_exists(project_id):
        raise KeyError(f"Project not found: {project_id}")
    
    existing_dataset_ids = set(_projects[project_id].keys())
    dataset_id = generate_unique_id(existing_dataset_ids)
    _projects[project_id][dataset_id] = df
    return dataset_id


def get_dataframe(project_id: str, dataset_id: str) -> pd.DataFrame:
    """Retrieve a DataFrame by project_id and dataset_id."""
    if not project_exists(project_id):
        raise KeyError(f"Project not found: {project_id}")
    
    if dataset_id not in _projects[project_id]:
        raise KeyError(f"Dataset not found: {dataset_id}")
    
    return _projects[project_id][dataset_id]
