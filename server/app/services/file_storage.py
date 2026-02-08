"""
Cloudinary storage service for persisting CSV datasets.
Fallback to local storage if Cloudinary is not configured.
"""
import os
import cloudinary
import cloudinary.uploader
from pathlib import Path
from io import BytesIO

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# Local storage fallback
STORAGE_DIR = Path("storage")


def is_cloudinary_configured() -> bool:
    """Check if Cloudinary credentials are set."""
    return all([
        os.getenv("CLOUDINARY_CLOUD_NAME"),
        os.getenv("CLOUDINARY_API_KEY"),
        os.getenv("CLOUDINARY_API_SECRET")
    ])


def get_cloudinary_public_id(project_id: str, dataset_id: str) -> str:
    """Generate a unique public ID for the file in Cloudinary."""
    return f"dambo/datasets/{project_id}/{dataset_id}"


def get_local_storage_path(project_id: str, dataset_id: str) -> Path:
    """Get the full path for storing a dataset file locally."""
    return STORAGE_DIR / project_id / f"{dataset_id}.csv"


def save_file(project_id: str, dataset_id: str, content: bytes) -> str:
    """
    Save file content to Cloudinary (or local disk as fallback).
    Returns the file path/URL as string.
    """
    if is_cloudinary_configured():
        # Upload to Cloudinary as raw file
        public_id = get_cloudinary_public_id(project_id, dataset_id)
        result = cloudinary.uploader.upload(
            BytesIO(content),
            resource_type="raw",
            public_id=public_id,
            overwrite=True,
            invalidate=True
        )
        return result["secure_url"]
    else:
        # Fallback to local storage
        file_path = get_local_storage_path(project_id, dataset_id)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
        return str(file_path)


def load_file(project_id: str, dataset_id: str) -> bytes | None:
    """
    Load file content from Cloudinary (or local disk as fallback).
    Returns file content as bytes or None if not found.
    """
    if is_cloudinary_configured():
        try:
            import requests
            public_id = get_cloudinary_public_id(project_id, dataset_id)
            # Get the URL for the raw file
            url = cloudinary.CloudinaryResource(
                public_id, 
                resource_type="raw"
            ).build_url()
            response = requests.get(url)
            if response.status_code == 200:
                return response.content
            return None
        except Exception:
            return None
    else:
        # Fallback to local storage
        file_path = get_local_storage_path(project_id, dataset_id)
        if file_path.exists():
            with open(file_path, "rb") as f:
                return f.read()
        return None


def file_exists(project_id: str, dataset_id: str) -> bool:
    """Check if a dataset file exists."""
    if is_cloudinary_configured():
        try:
            public_id = get_cloudinary_public_id(project_id, dataset_id)
            result = cloudinary.api.resource(public_id, resource_type="raw")
            return result is not None
        except Exception:
            return False
    else:
        return get_local_storage_path(project_id, dataset_id).exists()


def delete_file(project_id: str, dataset_id: str) -> bool:
    """Delete a dataset file."""
    if is_cloudinary_configured():
        try:
            public_id = get_cloudinary_public_id(project_id, dataset_id)
            cloudinary.uploader.destroy(public_id, resource_type="raw")
            return True
        except Exception:
            return False
    else:
        file_path = get_local_storage_path(project_id, dataset_id)
        if file_path.exists():
            file_path.unlink()
            return True
        return False
