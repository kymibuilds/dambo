from io import StringIO

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.dataframe_store import project_exists, save_dataframe

router = APIRouter()


@router.post("/upload")
async def upload_csv(
    project_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload a CSV file to a project.
    Returns the project_id and dataset_id.
    """
    # Validate project exists
    if not project_exists(project_id):
        raise HTTPException(
            status_code=404,
            detail=f"Project not found: {project_id}"
        )

    # Validate file extension
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are accepted."
        )

    # Read file content
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")
        
        # Decode and parse CSV
        decoded = contents.decode("utf-8")
        df = pd.read_csv(StringIO(decoded))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file contains no data.")
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding error. Please use UTF-8.")
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty or malformed.")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Failed to parse CSV file.")

    # Store DataFrame and return IDs
    dataset_id = save_dataframe(project_id, df)
    
    return {
        "project_id": project_id,
        "dataset_id": dataset_id
    }
