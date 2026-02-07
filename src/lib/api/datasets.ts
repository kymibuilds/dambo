const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Dataset {
    id: number;
    dataset_id: string;
    project_id: string;
    filename: string;
    file_path: string;
    file_size?: number;
    uploaded_at: string;
}

export interface DatasetProfile {
    shape: {
        row_count: number;
        column_count: number;
    };
    columns: Array<{
        name: string;
        detected_type: string;
        missing_count: number;
        missing_percentage: number;
    }>;
    numeric_stats: Array<{
        column: string;
        mean: number;
        std: number;
        min: number;
        max: number;
        histogram?: Array<{
            bin_start: number;
            bin_end: number;
            count: number;
        }>;
    }>;
    category_stats?: Array<{
        column: string;
        unique_count: number;
        top_values: Array<{
            value: string;
            count: number;
        }>;
    }>;
    samples?: Array<Record<string, unknown>>;
}

/**
 * Upload a CSV file to a project
 */
export async function uploadDataset(projectId: string, file: File): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/projects/${projectId}/datasets`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to upload dataset');
    }

    return res.json();
}

/**
 * List all datasets for a project
 */
export async function listDatasets(projectId: string): Promise<Dataset[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/datasets`);

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error(`Project not found: ${projectId}`);
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to fetch datasets');
    }

    return res.json();
}

/**
 * Get dataset profile (column info, types, stats)
 */
export async function getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/profile`);

    if (!res.ok) {
        if (res.status === 404) {
            throw new Error(`Dataset not found: ${datasetId}`);
        }
        const error = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(error.detail || 'Failed to fetch dataset profile');
    }

    return res.json();
}
