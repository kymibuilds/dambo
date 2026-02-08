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

// ===== Quick Analysis Types =====

export interface ColumnMissingInfo {
    column: string;
    missing_count: number;
    missing_percentage: number;
}

export interface MissingDataInsights {
    columns: ColumnMissingInfo[];
    columns_above_30_percent_missing: string[];
}

export interface DatasetOverview {
    row_count: number;
    column_count: number;
    numeric_columns: string[];
    categorical_columns: string[];
    datetime_columns: string[];
    duplicate_rows: number;
}

export interface CorrelationPair {
    column_a: string;
    column_b: string;
    correlation: number | null;
}

export interface OutlierInfo {
    column: string;
    outlier_count: number;
    outlier_percentage: number;
}

export interface MLReadiness {
    readiness_score: number;
    readiness_level: 'Low' | 'Moderate' | 'High';
}

export interface KeyDistributions {
    primary_numeric_histogram: HistogramData | null;
    primary_categorical_bar: BarData | null;
}

export interface ChartPayloads {
    histograms: HistogramData[];
    bars: BarData[];
    correlation_heatmap: CorrelationData | null;
}

// ===== New Smart Quick Analysis Types =====

export interface ScatterRecommendation {
    x: string;
    y: string;
    correlation: number;
    insight: string;  // e.g., "Strong positive correlation"
}

export interface DataQualityIssue {
    type: 'missing_data' | 'duplicates' | 'outliers';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    affected_columns: string[];
}

export interface DataQuality {
    overall_score: number;  // 0-100
    level: 'Good' | 'Fair' | 'Needs Work' | 'Poor';
    issues: DataQualityIssue[];
}

export interface GeminiInsights {
    scatter_plot_recommendations?: Array<{
        x: string;
        y: string;
        reason: string;
    }>;
    feature_importance_hints?: Array<{
        column: string;
        role: 'target' | 'feature' | 'id' | 'drop';
        reason: string;
    }>;
    data_prep_tips?: string[];
    encoding_suggestions?: Array<{
        column: string;
        method: 'one_hot' | 'label' | 'ordinal' | 'target';
        reason: string;
    }>;
    scaling_suggestions?: Array<{
        column: string;
        method: 'standard' | 'minmax' | 'robust' | 'none';
        reason: string;
    }>;
    overall_assessment?: string;
}

export interface QuickAnalysisData {
    dataset_overview: DatasetOverview;
    missing_data_insights: MissingDataInsights;
    key_distributions: KeyDistributions;
    strongest_correlations: CorrelationPair[];
    outlier_detection: OutlierInfo[];
    ml_readiness: MLReadiness;
    chart_payloads: ChartPayloads;
    // New smart analysis fields
    scatter_recommendations: ScatterRecommendation[];
    data_quality: DataQuality;
    gemini_insights: GeminiInsights | null;
}

export async function fetchQuickAnalysis(datasetId: string, useGemini: boolean = true): Promise<QuickAnalysisData> {
    const url = `${API_BASE}/datasets/${datasetId}/quick-analysis?use_gemini=${useGemini}`;
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch quick analysis: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}
