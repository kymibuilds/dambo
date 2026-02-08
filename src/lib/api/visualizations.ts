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


export interface ChartFilter {
    column: string;
    operator: string;
    value: string | number;
}

function appendFilterParams(url: string, filter?: ChartFilter): string {
    if (!filter) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}filter_column=${encodeURIComponent(filter.column)}&filter_operator=${encodeURIComponent(filter.operator)}&filter_value=${encodeURIComponent(String(filter.value))}`;
}

export async function fetchHistogram(datasetId: string, column: string, filter?: ChartFilter): Promise<HistogramData> {
    let url = `${API_BASE}/datasets/${datasetId}/histogram?column=${encodeURIComponent(column)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch histogram: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchBar(datasetId: string, column: string, filter?: ChartFilter): Promise<BarData> {
    let url = `${API_BASE}/datasets/${datasetId}/bar?column=${encodeURIComponent(column)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch bar chart: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchScatter(datasetId: string, x: string, y: string, filter?: ChartFilter): Promise<ScatterData> {
    let url = `${API_BASE}/datasets/${datasetId}/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`;
    url = appendFilterParams(url, filter);
    console.log('[DEBUG] fetchScatter URL:', url);
    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text();
        console.error('[DEBUG] fetchScatter error response:', errorText);
        throw new Error(`Failed to fetch scatter: ${res.statusText} - ${errorText}`);
    }
    return res.json();
}

export async function fetchCorrelation(datasetId: string, filter?: ChartFilter): Promise<CorrelationData> {
    let url = `${API_BASE}/datasets/${datasetId}/correlation`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch correlation: ${res.statusText}`);
    return res.json();
}

export async function fetchDatasetProfile(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/profile`);
    if (!res.ok) throw new Error(`Failed to fetch profile: ${res.statusText}`);
    return res.json();
}

// ... (Rest of the file remains unchanged, but need to check if new charts need updates too)

// New Chart Fetchers
// I need to add filter support to these too, viewing the file showed they exist but are not in the replace block above if I cut it off.
// Let me verify the file content again or just assume they are there and I should replace them too.
// The previous view_file showed lines 1-190.
// I'll replace the whole file content related to fetchers.

export async function fetchLineChart(datasetId: string, dateColumn: string, valueColumn: string, groupColumn?: string, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/line?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}`;
    if (groupColumn) url += `&group_column=${encodeURIComponent(groupColumn)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch line chart: ${res.statusText}`);
    return res.json();
}

export async function fetchPieChart(datasetId: string, column: string, limit: number = 10, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/pie?column=${encodeURIComponent(column)}&limit=${limit}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch pie chart: ${res.statusText}`);
    return res.json();
}

export async function fetchAreaChart(datasetId: string, dateColumn: string, valueColumn: string, stackColumn: string, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/area?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}&stack_column=${encodeURIComponent(stackColumn)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch area chart: ${res.statusText}`);
    return res.json();
}

export async function fetchBoxPlot(datasetId: string, column: string, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/boxplot?column=${encodeURIComponent(column)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch boxplot: ${res.statusText}`);
    return res.json();
}

export async function fetchTreemap(datasetId: string, groupColumns: string, valueColumn: string, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/treemap?group_columns=${encodeURIComponent(groupColumns)}&value_column=${encodeURIComponent(valueColumn)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch treemap: ${res.statusText}`);
    return res.json();
}

export async function fetchStackedBar(datasetId: string, categoryColumn: string, stackColumn: string, valueColumn?: string, filter?: ChartFilter): Promise<any> {
    let url = `${API_BASE}/datasets/${datasetId}/stacked-bar?category_column=${encodeURIComponent(categoryColumn)}&stack_column=${encodeURIComponent(stackColumn)}`;
    if (valueColumn) url += `&value_column=${encodeURIComponent(valueColumn)}`;
    url = appendFilterParams(url, filter);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch stacked bar: ${res.statusText}`);
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
