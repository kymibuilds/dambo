from fastapi import FastAPI, HTTPException

from app.db.session import test_connection
from app.routes.projects import router as projects_router
from app.routes.upload import router as upload_router

app = FastAPI(title="Dataset Copilot Backend")

# Include routers
app.include_router(projects_router)
app.include_router(upload_router)


@app.get("/")
async def root():
    return {"message": "Dataset Copilot Backend Running"}


@app.get("/db-health")
async def db_health():
    """Check database connectivity."""
    if test_connection():
        return {"database": "connected"}
    raise HTTPException(status_code=503, detail="Database connection failed")
