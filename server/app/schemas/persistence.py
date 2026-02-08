from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class CanvasStateBase(BaseModel):
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []


class CanvasStateCreate(CanvasStateBase):
    pass


class CanvasStateResponse(CanvasStateBase):
    project_id: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatMessageBase(BaseModel):
    chat_id: str
    role: str
    content: str


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageResponse(ChatMessageBase):
    id: int
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatListItem(BaseModel):
    """Represents a complete chat (all messages for a chat_id)."""
    id: str  # chat_id
    title: str
    messages: list[dict[str, str]]  # [{role, content}, ...]


class ChatsPayload(BaseModel):
    """Full chat state for a project."""
    chats: list[ChatListItem]
