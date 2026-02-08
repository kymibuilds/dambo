const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HistogramData {
    column: string;
    bins: number[];
    counts: number[];
}

export interface BarData {
    column: string;
    categories: string[];
    counts: number[];
}

export interface ScatterData {
    x_label: string;
    y_label: string;
    x: number[];
    y: number[];
}

export interface CorrelationData {
    columns: string[];
    matrix: (number | null)[][];
}

export async function fetchHistogram(datasetId: string, column: string): Promise<HistogramData> {
    const url = `${API_BASE}/datasets/${datasetId}/histogram?column=${encodeURIComponent(column)}`;
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch histogram: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchBar(datasetId: string, column: string): Promise<BarData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/bar?column=${encodeURIComponent(column)}`);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch bar chart: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchScatter(datasetId: string, x: string, y: string): Promise<ScatterData> {
    const url = `${API_BASE}/datasets/${datasetId}/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`;
    console.log('[DEBUG] fetchScatter URL:', url);
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        console.error('[DEBUG] fetchScatter error response:', errorText);
        throw new Error(`Failed to fetch scatter: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchCorrelation(datasetId: string): Promise<CorrelationData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/correlation`);
    if (!res.ok) throw new Error(`Failed to fetch correlation: ${res.statusText}`);
    return res.json();
}

export async function fetchDatasetProfile(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/profile`);
    if (!res.ok) throw new Error(`Failed to fetch profile: ${res.statusText}`);
    return res.json();
}
