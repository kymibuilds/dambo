const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Project {
    id: number;
    project_id: string;
    name: string;
    created_at: string;
}

export interface CreateProjectRequest {
    name: string;
}

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to create project');
    }

    return res.json();
}

/**
 * List all projects
 */
export async function listProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to fetch projects');
    }

    return res.json();
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`);

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to fetch project');
    }

    return res.json();
}

/**
 * Rename a project
 */
export async function renameProject(projectId: string, newName: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to rename project');
    }

    return res.json();
}
