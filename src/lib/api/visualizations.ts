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
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/histogram?column=${encodeURIComponent(column)}`);
    if (!res.ok) throw new Error(`Failed to fetch histogram: ${res.statusText}`);
    return res.json();
}

export async function fetchBar(datasetId: string, column: string): Promise<BarData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/bar?column=${encodeURIComponent(column)}`);
    if (!res.ok) throw new Error(`Failed to fetch bar chart: ${res.statusText}`);
    return res.json();
}

export async function fetchScatter(datasetId: string, x: string, y: string): Promise<ScatterData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`);
    if (!res.ok) throw new Error(`Failed to fetch scatter: ${res.statusText}`);
    return res.json();
}

export async function fetchCorrelation(datasetId: string): Promise<CorrelationData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/correlation`);
    if (!res.ok) throw new Error(`Failed to fetch correlation: ${res.statusText}`);
    return res.json();
}
