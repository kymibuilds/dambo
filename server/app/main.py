from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import test_connection
from app.routes.dataset_profile import router as dataset_profile_router
from app.routes.dataset_visualization import router as dataset_viz_router
from app.routes.datasets import router as datasets_router
from app.routes.projects import router as projects_router
from app.routes.upload import router as upload_router
from app.routes.quick_analysis import router as quick_analysis_router
from app.routes.persistence import router as persistence_router
from app.routes.chart_comparison import router as chart_comparison_router


def init_db():
    """Initialize database tables if DB is available."""
    try:
        from app.db.models.project import Base
        from app.db.models.dataset import Dataset  # Import to register model
        from app.db.models.canvas_state import CanvasState  # Import to register model
        from app.db.models.chat_message import ChatMessage  # Import to register model
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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://dambo-ai.vercel.app",
    ],
    allow_origin_regex=r"https://dambo.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects_router)
app.include_router(datasets_router)
app.include_router(dataset_profile_router)
app.include_router(dataset_viz_router)
app.include_router(upload_router)
app.include_router(quick_analysis_router)
app.include_router(persistence_router)
app.include_router(chart_comparison_router)


@app.get("/")
async def root():
    return {"message": "Dataset Copilot Backend Running"}


@app.get("/db-health")
async def db_health():
    """Check database connectivity."""
    if test_connection():
        return {"database": "connected"}
    raise HTTPException(status_code=503, detail="Database connection failed")
