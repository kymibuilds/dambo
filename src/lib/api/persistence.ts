const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ Canvas State ============

export interface CanvasState {
    project_id: string;
    nodes: any[];
    edges: any[];
    updated_at: string | null;
}

export async function loadCanvasState(projectId: string): Promise<CanvasState> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/canvas`);
    if (!res.ok) {
        throw new Error('Failed to load canvas state');
    }
    return res.json();
}

export async function saveCanvasState(
    projectId: string,
    nodes: any[],
    edges: any[]
): Promise<CanvasState> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/canvas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
    });
    if (!res.ok) {
        throw new Error('Failed to save canvas state');
    }
    return res.json();
}

export async function clearCanvasState(projectId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/canvas`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        throw new Error('Failed to clear canvas state');
    }
}

// ============ Chat Messages ============

export interface ChatMessage {
    role: string;
    content: string;
}

export interface ChatItem {
    id: string;
    title: string;
    messages: ChatMessage[];
}

export interface ChatsPayload {
    chats: ChatItem[];
}

export async function loadChats(projectId: string): Promise<ChatsPayload> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chats`);
    if (!res.ok) {
        throw new Error('Failed to load chats');
    }
    return res.json();
}

export async function saveChats(projectId: string, chats: ChatItem[]): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/chats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats })
    });
    if (!res.ok) {
        throw new Error('Failed to save chats');
    }
}
