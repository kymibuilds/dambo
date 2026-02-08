from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, JSON

from app.db.models.project import Base


class CanvasState(Base):
    """Stores React Flow canvas state (nodes and edges) per project."""
    __tablename__ = "canvas_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(6), ForeignKey("projects.project_id"), unique=True, index=True, nullable=False)
    nodes = Column(JSON, default=list)
    edges = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
