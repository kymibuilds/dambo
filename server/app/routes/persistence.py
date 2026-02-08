from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models.canvas_state import CanvasState
from app.db.models.chat_message import ChatMessage
from app.db.session import get_db
from app.schemas.persistence import (
    CanvasStateCreate,
    CanvasStateResponse,
    ChatListItem,
    ChatsPayload,
)

router = APIRouter()


# ============ Canvas State Endpoints ============

@router.get("/projects/{project_id}/canvas", response_model=CanvasStateResponse)
def get_canvas_state(project_id: str, db: Session = Depends(get_db)):
    """Get canvas state (nodes/edges) for a project."""
    state = db.query(CanvasState).filter(CanvasState.project_id == project_id).first()
    if not state:
        # Return empty canvas if no state exists
        return CanvasStateResponse(
            project_id=project_id,
            nodes=[],
            edges=[],
            updated_at=None
        )
    return state


@router.put("/projects/{project_id}/canvas", response_model=CanvasStateResponse)
def save_canvas_state(project_id: str, data: CanvasStateCreate, db: Session = Depends(get_db)):
    """Save or update canvas state for a project."""
    state = db.query(CanvasState).filter(CanvasState.project_id == project_id).first()
    
    if state:
        state.nodes = data.nodes
        state.edges = data.edges
        state.updated_at = datetime.utcnow()
    else:
        state = CanvasState(
            project_id=project_id,
            nodes=data.nodes,
            edges=data.edges
        )
        db.add(state)
    
    db.commit()
    db.refresh(state)
    return state


@router.delete("/projects/{project_id}/canvas")
def clear_canvas_state(project_id: str, db: Session = Depends(get_db)):
    """Clear canvas state for a project."""
    state = db.query(CanvasState).filter(CanvasState.project_id == project_id).first()
    if state:
        db.delete(state)
        db.commit()
    return {"status": "cleared"}


# ============ Chat Messages Endpoints ============

@router.get("/projects/{project_id}/chats", response_model=ChatsPayload)
def get_chats(project_id: str, db: Session = Depends(get_db)):
    """Get all chat messages for a project, grouped by chat_id."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.chat_id, ChatMessage.created_at)
        .all()
    )
    
    # Group messages by chat_id
    chats_dict: dict[str, list[dict]] = {}
    for msg in messages:
        if msg.chat_id not in chats_dict:
            chats_dict[msg.chat_id] = []
        chats_dict[msg.chat_id].append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Convert to ChatListItem format
    chats = [
        ChatListItem(
            id=chat_id,
            title="General" if chat_id == "initial" else chat_id,
            messages=msgs
        )
        for chat_id, msgs in chats_dict.items()
    ]
    
    return ChatsPayload(chats=chats)


@router.put("/projects/{project_id}/chats")
def save_chats(project_id: str, data: ChatsPayload, db: Session = Depends(get_db)):
    """Save all chat messages for a project (replaces existing)."""
    # Delete existing messages for this project
    db.query(ChatMessage).filter(ChatMessage.project_id == project_id).delete()
    
    # Insert new messages
    for chat in data.chats:
        for msg in chat.messages:
            db_msg = ChatMessage(
                project_id=project_id,
                chat_id=chat.id,
                role=msg.get("role", "user"),
                content=msg.get("content", "")
            )
            db.add(db_msg)
    
    db.commit()
    return {"status": "saved", "chat_count": len(data.chats)}
