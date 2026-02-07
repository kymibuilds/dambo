from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.db.session import test_connection
from app.routes.projects import router as projects_router
from app.routes.upload import router as upload_router


def init_db():
    """Initialize database tables if DB is available."""
    try:
        from app.db.models.project import Base
        from app.db.session import engine
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Warning: Could not create database tables: {e}")
        print("Server will run but database features may not work")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Try to create tables
    init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(title="Dataset Copilot Backend", lifespan=lifespan)

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
