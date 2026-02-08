from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.models.project import Base


class ChatMessage(Base):
    """Stores chat messages for each project, organized by chat_id."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(6), ForeignKey("projects.project_id"), index=True, nullable=False)
    chat_id = Column(String(50), index=True, nullable=False)  # 'initial' for General chat, or node ID
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
