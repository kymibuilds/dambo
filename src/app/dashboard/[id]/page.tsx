"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Send,
    ArrowLeft,
    Plus,
    X,
    ArrowLeftRight,
    Upload,
    FileJson,
    Trash2,
    FileText,
    Loader2,
    Zap,
    Download,
    AlertTriangle,
    CheckCircle,
    Info
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Node } from '@xyflow/react';
import FlowCanvas, { type FlowCanvasRef, type ChartNodeConfig } from "@/components/canvas/FlowCanvas";
import { type ChartData, type ChartType } from "@/components/canvas/nodes/DataNode";
import { getProject, type Project } from "@/lib/api/projects";
import { listDatasets, uploadDataset, getDatasetProfile, type Dataset, type DatasetProfile } from "@/lib/api/datasets";
import { useTamboThread, TamboThreadProvider, type TamboThreadMessage } from "@tambo-ai/react";
import { extractChartColumnsWithCache, parseChartModification, parseChartGenerationRequest } from "@/lib/gemini/geminiClient";
import { useQuickAnalysis } from "@/lib/hooks/useQuickAnalysis";
import type { QuickAnalysisData } from "@/lib/api/visualizations";
import { loadCanvasState, saveCanvasState, clearCanvasState, loadChats, saveChats, type ChatItem } from "@/lib/api/persistence";
import type { Edge } from '@xyflow/react';
import type { DataNodeType } from "@/components/canvas/nodes/DataNode";
import {
    HistogramChart,
    BarChart,
    ScatterChart,
    CorrelationHeatmap,
    LineChart,
    PieChart,
    AreaChart,
    BoxPlotChart,
    TreemapChart,
    StackedBarChart
} from '@/components/charts';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ProjectFile {
    id: string;
    name: string;
    type: string;
    size: string;
}

// Structured summary data for the Data Quality Report
interface DataQualitySummary {
    datasetName: string;
    chartConfigs?: any[]; // Array of chart configurations
    overview: {
        rowCount: number;
        columnCount: number;
        numericColumns: string[];
        categoricalColumns: string[];
        datetimeColumns: string[];
    };
    qualityScore: {
        score: number;
        level: string;
    };
    missingData: Array<{
        column: string;
        count: number;
        percentage: number;
    }>;
    outliers: Array<{
        column: string;
        count: number;
        percentage: number;
    }>;
    duplicateRows: number;
    issues: Array<{
        type: string;
        severity: 'info' | 'warning' | 'critical';
        message: string;
        affectedColumns: string[];
    }>;
    chartPayloads: {
        histograms: any[];
        bars: any[];
    };
}

function formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function datasetToFile(dataset: Dataset): ProjectFile {
    return {
        id: dataset.dataset_id,
        name: dataset.filename,
        type: dataset.filename.split('.').pop()?.toUpperCase() || 'FILE',
        size: formatFileSize(dataset.file_size || 0),
    };
}

// Helper to extract column name from user message based on available columns
function extractColumnFromText(text: string, availableColumns: string[], chartType: string): {
    column?: string;
    x?: string;
    y?: string;
    dateColumn?: string;
    valueColumn?: string;
    categoryColumn?: string;
    stackColumn?: string;
    groupColumns?: string;
} {
    const textLower = text.toLowerCase();
    const result: {
        column?: string;
        x?: string;
        y?: string;
        dateColumn?: string;
        valueColumn?: string;
        categoryColumn?: string;
        stackColumn?: string;
        groupColumns?: string;
    } = {};

    // Score each column based on how well it matches the text
    // Higher score = better match
    const scoredColumns: { col: string; score: number; position: number }[] = [];

    for (const col of availableColumns) {
        const colLower = col.toLowerCase();
        // Split by underscore to get parts (e.g., "Experience_Years" -> ["experience", "years"])
        const colParts = colLower.split('_');

        // Check for exact match (with word boundaries)
        const exactRegex = new RegExp(`\\b${colLower.replace(/_/g, '[_\\s]?')}\\b`, 'i');
        if (exactRegex.test(text)) {
            const match = text.match(exactRegex);
            scoredColumns.push({ col, score: 100 + col.length, position: match?.index || 0 });
            continue;
        }

        // Check if all parts appear in order (e.g., "experience years" matches "Experience_Years")
        const partsPattern = colParts.map(p => `\\b${p}`).join('.*');
        const partsRegex = new RegExp(partsPattern, 'i');
        if (partsRegex.test(text)) {
            const match = text.match(partsRegex);
            scoredColumns.push({ col, score: 50 + col.length, position: match?.index || 0 });
            continue;
        }

        // Check if any significant part appears (but require minimum length to avoid false positives)
        for (const part of colParts) {
            if (part.length >= 4) { // Only match parts with 4+ chars to avoid "age" matching "usage"
                const partRegex = new RegExp(`\\b${part}\\b`, 'i');
                if (partRegex.test(text)) {
                    const match = text.match(partRegex);
                    scoredColumns.push({ col, score: part.length, position: match?.index || 0 });
                    break;
                }
            }
        }
    }

    // Sort by score (descending), then by position (ascending) for tie-breaking
    scoredColumns.sort((a, b) => b.score - a.score || a.position - b.position);

    console.log('[DEBUG] extractColumnFromText - text:', text, 'scoredColumns:', scoredColumns);

    const uniqueColumns = [...new Set(scoredColumns.map(s => s.col))];

    if (chartType === 'scatter_chart') {
        if (uniqueColumns.length >= 2) {
            // Try to detect which comes first in the text (for x) and which comes second (for y)
            const first = scoredColumns[0];
            const second = scoredColumns.find(s => s.col !== first.col);

            if (first && second) {
                // Heuristic: usually "y vs x" or "y by x", so first mentioned might be y
                // But let's stick to simple position for now: first found is x, second is y
                // actually simpler: just map top 2 matches to x and y
                result.x = uniqueColumns[0];
                result.y = uniqueColumns[1];
            }
        } else if (uniqueColumns.length === 1) {
            result.x = uniqueColumns[0];
        }
    } else if (chartType === 'line_chart' || chartType === 'area_chart') {
        // Look for date column and value column
        // Heuristic: columns containing "date", "time", "year", "month" are date columns
        const dateCol = uniqueColumns.find(c => /date|time|year|month|day/i.test(c));
        const valueCol = uniqueColumns.find(c => c !== dateCol);

        if (dateCol) result.dateColumn = dateCol;
        if (valueCol) result.valueColumn = valueCol;

        // If we only found one column and it looks like a date, use it as dateColumn
        if (uniqueColumns.length === 1 && !result.dateColumn && !result.valueColumn) {
            if (/date|time|year|month|day/i.test(uniqueColumns[0])) {
                result.dateColumn = uniqueColumns[0];
            } else {
                result.valueColumn = uniqueColumns[0];
            }
        }
    } else if (chartType === 'stacked_bar_chart') {
        // Need category and stack
        if (uniqueColumns.length >= 2) {
            result.categoryColumn = uniqueColumns[0];
            result.stackColumn = uniqueColumns[1];
        } else if (uniqueColumns.length === 1) {
            result.categoryColumn = uniqueColumns[0];
        }
    } else {
        // For bar/histogram/pie/boxplot, use the best matched column
        if (scoredColumns.length > 0) {
            result.column = scoredColumns[0].col;
        }
    }

    return result;
}

// Helper to extract chart data from rendered component props
function extractChartData(
    component: React.ReactElement,
    defaultDatasetId?: string,
    userMessage?: string,
    availableColumns?: string[]
): ChartData | null {
    const props = component.props as Record<string, unknown>;
    const type = component.type;

    // Try to determine chart type from component name
    if (!type || typeof type !== 'function') return null;

    const componentName = (type as { displayName?: string }).displayName ||
        (type as { name?: string }).name || '';

    const chartTypeMap: Record<string, ChartType> = {
        'HistogramChart': 'histogram_chart',
        'BarChart': 'bar_chart',
        'ScatterChart': 'scatter_chart',
        'CorrelationHeatmap': 'correlation_heatmap',
        'LineChart': 'line_chart',
        'PieChart': 'pie_chart',
        'AreaChart': 'area_chart',
        'BoxPlotChart': 'boxplot_chart',
        'TreemapChart': 'treemap_chart',
        'StackedBarChart': 'stacked_bar_chart',
    };

    const chartType = chartTypeMap[componentName];
    if (!chartType) return null;

    // Debug: Log what props we received from Tambo
    console.log('[DEBUG] extractChartData - componentName:', componentName, 'props:', JSON.stringify(props));

    // Inject default datasetId if missing
    const enhancedProps = { ...props } as Record<string, any>;
    if (!enhancedProps.datasetId && defaultDatasetId) {
        enhancedProps.datasetId = defaultDatasetId;
        console.log('[DEBUG] Injected default datasetId:', defaultDatasetId);
    }

    // Fallback: If column/x/y are missing, invalid, or not in available columns, try to extract from user message
    if (userMessage && availableColumns && availableColumns.length > 0) {
        const extracted = extractColumnFromText(userMessage, availableColumns, chartType);

        // Helper to check if a column is valid (exists in dataset)
        const isValidColumn = (col: unknown): boolean => {
            if (!col || col === 'undefined' || typeof col !== 'string') return false;
            // Case-insensitive check
            return availableColumns.some(ac => ac.toLowerCase() === (col as string).toLowerCase());
        };

        // Helper to get the correctly-cased column name from the dataset
        const getCorrectCase = (col: string): string => {
            const match = availableColumns.find(ac => ac.toLowerCase() === col.toLowerCase());
            return match || col;
        };

        if (chartType === 'scatter_chart') {
            // Check if x is valid, otherwise use fallback
            if (!isValidColumn(enhancedProps.x)) {
                if (extracted.x) {
                    console.log('[DEBUG] Fallback - Replacing invalid x:', enhancedProps.x, 'with:', extracted.x);
                    enhancedProps.x = extracted.x;
                }
            } else {
                // Ensure correct case
                enhancedProps.x = getCorrectCase(enhancedProps.x as string);
            }

            // Check if y is valid, otherwise use fallback
            if (!isValidColumn(enhancedProps.y)) {
                if (extracted.y) {
                    console.log('[DEBUG] Fallback - Replacing invalid y:', enhancedProps.y, 'with:', extracted.y);
                    enhancedProps.y = extracted.y;
                }
            } else {
                // Ensure correct case
                enhancedProps.y = getCorrectCase(enhancedProps.y as string);
            }
        } else if (chartType === 'line_chart' || chartType === 'area_chart') {
            // Check dateColumn
            if (!isValidColumn(enhancedProps.dateColumn)) {
                if (extracted.dateColumn) {
                    console.log('[DEBUG] Fallback - Replacing invalid dateColumn:', enhancedProps.dateColumn, 'with:', extracted.dateColumn);
                    enhancedProps.dateColumn = extracted.dateColumn;
                }
            } else {
                enhancedProps.dateColumn = getCorrectCase(enhancedProps.dateColumn as string);
            }

            // Check valueColumn
            if (!isValidColumn(enhancedProps.valueColumn)) {
                if (extracted.valueColumn) {
                    console.log('[DEBUG] Fallback - Replacing invalid valueColumn:', enhancedProps.valueColumn, 'with:', extracted.valueColumn);
                    enhancedProps.valueColumn = extracted.valueColumn;
                }
            } else {
                enhancedProps.valueColumn = getCorrectCase(enhancedProps.valueColumn as string);
            }

            // Also check stackColumn for area_chart
            if (chartType === 'area_chart') {
                if (!isValidColumn(enhancedProps.stackColumn)) {
                    if (extracted.stackColumn) {
                        enhancedProps.stackColumn = extracted.stackColumn;
                    } else if (extracted.column) {
                        enhancedProps.stackColumn = extracted.column;
                    }
                } else {
                    enhancedProps.stackColumn = getCorrectCase(enhancedProps.stackColumn as string);
                }
            }
        } else if (chartType === 'stacked_bar_chart') {
            if (!isValidColumn(enhancedProps.categoryColumn)) {
                if (extracted.categoryColumn) enhancedProps.categoryColumn = extracted.categoryColumn;
            } else {
                enhancedProps.categoryColumn = getCorrectCase(enhancedProps.categoryColumn as string);
            }
            if (!isValidColumn(enhancedProps.stackColumn)) {
                if (extracted.stackColumn) enhancedProps.stackColumn = extracted.stackColumn;
            } else {
                enhancedProps.stackColumn = getCorrectCase(enhancedProps.stackColumn as string);
            }
        } else if (chartType === 'treemap_chart') {
            if (!isValidColumn(enhancedProps.valueColumn)) {
                if (extracted.valueColumn) enhancedProps.valueColumn = extracted.valueColumn;
            } else {
                enhancedProps.valueColumn = getCorrectCase(enhancedProps.valueColumn as string);
            }
        } else {
            // For others (bar/histogram/pie/boxplot), use 'column'
            if (!isValidColumn(enhancedProps.column)) {
                if (extracted.column) {
                    console.log('[DEBUG] Fallback - Replacing invalid column:', enhancedProps.column, 'with:', extracted.column);
                    enhancedProps.column = extracted.column;
                }
            } else {
                // Ensure correct case
                enhancedProps.column = getCorrectCase(enhancedProps.column as string);
            }
        }
    }

    return {
        type: chartType,
        props: enhancedProps,
    };
}

// Extract all chart data from a message - handles multiple charts in one response
function extractAllChartData(
    message: TamboThreadMessage,
    defaultDatasetId?: string,
    userMessage?: string,
    availableColumns?: string[]
): ChartNodeConfig[] {
    const component = message.renderedComponent;
    if (!component || typeof component !== 'object') return [];

    const results: ChartNodeConfig[] = [];

    // Helper function to recursively extract charts
    const extractFromElement = (element: React.ReactElement | React.ReactElement[]): void => {
        if (Array.isArray(element)) {
            element.forEach(extractFromElement);
            return;
        }

        if (!element || typeof element !== 'object') return;

        // Check if this element is a chart
        const chartData = extractChartData(element, defaultDatasetId, userMessage, availableColumns);
        if (chartData) {
            const chartLabels: Record<ChartType, string> = {
                'histogram_chart': 'Histogram',
                'bar_chart': 'Bar Chart',
                'scatter_chart': 'Scatter Plot',
                'correlation_heatmap': 'Correlation Heatmap',
                'line_chart': 'Line Chart',
                'pie_chart': 'Pie Chart',
                'area_chart': 'Area Chart',
                'boxplot_chart': 'Box Plot',
                'treemap_chart': 'Treemap',
                'stacked_bar_chart': 'Stacked Bar',
                'comparison_insight': 'Comparison Insight',
            };
            results.push({
                label: chartLabels[chartData.type] || 'Visualization',
                chartData,
            });
            return;
        }

        // Check if this is a Fragment or wrapper with children
        const props = element.props as { children?: React.ReactElement | React.ReactElement[] };
        if (props?.children) {
            if (Array.isArray(props.children)) {
                props.children.forEach(child => {
                    if (child && typeof child === 'object') {
                        extractFromElement(child as React.ReactElement);
                    }
                });
            } else if (typeof props.children === 'object') {
                extractFromElement(props.children);
            }
        }
    };

    extractFromElement(component as React.ReactElement);
    return results;
}


// Inner component that uses the Tambo hook
function ProjectPageContent() {
    const params = useParams();
    const projectId = params.id as string;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const flowCanvasRef = useRef<FlowCanvasRef>(null);
    // Track processed message IDs to avoid duplicate node creation
    const processedMessageIds = useRef<Set<string>>(new Set());
    const pendingChatIdRef = useRef<string | null>(null);
    // Track message IDs that originated from node-specific chats (not General)
    const nodeMessageIdsRef = useRef<Set<string>>(new Set());
    // Track the last processed message count according to each chat
    const lastSyncedCountRef = useRef<Record<string, number>>({ initial: 0 });

    // Get Tambo thread context
    const {
        thread,
        sendThreadMessage,
        isIdle,
    } = useTamboThread();

    // Project and loading state
    const [project, setProject] = useState<Project | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(true);
    const [projectError, setProjectError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

    const [localChats, setLocalChats] = useState([
        {
            id: 'initial',
            title: 'General',
            messages: [{ role: 'assistant', content: "👋 Welcome to Dambo! I can help you explore and visualize your data. Upload a CSV file to get started, then ask me to create charts, analyze trends, or run a Quick Analysis for instant insights." }]
        }
    ]);
    const [activeChatId, setActiveChatId] = useState('initial');
    const [message, setMessage] = useState("");
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);
    const [datasetProfiles, setDatasetProfiles] = useState<Record<string, DatasetProfile>>({});

    // Quick Analysis hook
    const quickAnalysis = useQuickAnalysis();
    const [showDatasetSelector, setShowDatasetSelector] = useState(false);

    // Visualization buttons dataset selector
    const [showVizDatasetSelector, setShowVizDatasetSelector] = useState<'correlations' | 'distributions' | 'categories' | 'outliers' | null>(null);

    // Summary popup state
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryData, setSummaryData] = useState<DataQualitySummary | null>(null);
    const summaryReportRef = useRef<HTMLDivElement>(null);

    const exportSummaryAsPDF = useCallback(async () => {
        if (!summaryReportRef.current || !summaryData) return;

        try {
            const clone = summaryReportRef.current.cloneNode(true) as HTMLElement;
            const scrollableContainer = clone.querySelector('.overflow-y-auto') as HTMLElement;

            // Position carefully - "visible" but not affecting layout or scroll
            // opacity: 0 and z-index: -9999 ensures it's hidden.
            // fixed positioning at 0,0 ensures it's in viewport so html-to-image can see it.
            clone.style.position = 'fixed';
            clone.style.top = '0';
            clone.style.left = '0';
            // Set a fixed width that fits A4 nicely (approx 800px is good for A4 @ 72dpi, but higher res is better)
            clone.style.width = '1000px';
            clone.style.height = 'auto';
            clone.style.maxHeight = 'none';
            clone.style.overflow = 'visible';
            clone.style.zIndex = '-9999';
            clone.style.opacity = '0';
            clone.style.pointerEvents = 'none';
            clone.style.background = '#ffffff'; // Ensure background is opaque

            if (scrollableContainer) {
                scrollableContainer.style.overflow = 'visible';
                scrollableContainer.style.height = 'auto';
                scrollableContainer.style.flex = 'none';
                scrollableContainer.style.maxHeight = 'none';
            }

            document.body.appendChild(clone);

            // Wait for images/fonts
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(clone, {
                cacheBust: true,
                backgroundColor: '#ffffff',
                pixelRatio: 2, // High quality
            });

            document.body.removeChild(clone);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Load the full captured image
            const img = new Image();
            img.src = dataUrl;
            await new Promise((resolve) => { img.onload = resolve; });

            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const contentHeight = pdfHeight - (margin * 2);

            // Calculate scaler to fit width
            const scale = contentWidth / img.width;
            const scaledImgHeight = img.height * scale;

            let heightLeft = scaledImgHeight;
            let currentSourceY = 0; // Position in source image (pixels)

            // We need to slice the source image effectively. 
            // Since we can't easily instruct addImage to crop, we use a temporary canvas to slice.
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Page height in source image pixels
            // contentHeight (mm) -> pixels? No, we know the scale.
            // contentHeight = N mm. 
            // We placed the image with width = contentWidth (mm).
            // So the 'height' of one page in source pixels is:
            // pageSourceHeight = contentHeight / scale
            const pageSourceHeight = contentHeight / scale;

            canvas.width = img.width;
            canvas.height = pageSourceHeight; // This is the max height matching one page

            let pageParams = {
                sourceY: 0,
                pageNumber: 1
            };

            while (heightLeft > 0) {
                // Clear canvas
                canvas.height = Math.min(pageSourceHeight, heightLeft / scale); // Resize for last chunk
                ctx?.clearRect(0, 0, canvas.width, canvas.height);

                // Draw slice
                // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
                const sourceH = Math.min(pageSourceHeight, heightLeft / scale);
                ctx?.drawImage(img, 0, pageParams.sourceY, img.width, sourceH, 0, 0, img.width, sourceH);

                const sliceData = canvas.toDataURL('image/png');

                if (pageParams.pageNumber > 1) {
                    pdf.addPage();
                }

                // Add slice to PDF
                // The slice is sized to match contentWidth
                // Calculate actual height in PDF units for this slice
                const slicePdfHeight = sourceH * scale;

                pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, slicePdfHeight);

                heightLeft -= slicePdfHeight;
                pageParams.sourceY += sourceH;
                pageParams.pageNumber++;
            }

            pdf.save(`${summaryData.datasetName.replace(/\s+/g, '_')}_Analysis_Report.pdf`);

        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    }, [summaryData]);

    // Editable project name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');

    // Fetch project and datasets on mount
    useEffect(() => {
        async function fetchProjectData() {
            console.log('[DEBUG] Starting fetchProjectData for:', projectId);
            try {
                setIsLoadingProject(true);
                setProjectError(null);

                console.log('[DEBUG] Fetching project and datasets...');
                const [projectData, datasetsData] = await Promise.all([
                    getProject(projectId),
                    listDatasets(projectId)
                ]);
                console.log('[DEBUG] Got project:', projectData);
                console.log('[DEBUG] Got datasets:', datasetsData);

                setProject(projectData);
                setProjectFiles(datasetsData.map(datasetToFile));

                // Fetch profiles for each dataset
                if (datasetsData.length > 0) {
                    console.log('[DEBUG] Fetching dataset profiles...');
                    const profilePromises = datasetsData.map(async (ds) => {
                        try {
                            const profile = await getDatasetProfile(ds.dataset_id);
                            return { id: ds.dataset_id, profile };
                        } catch (err) {
                            console.warn(`Failed to fetch profile for dataset ${ds.dataset_id}:`, err);
                            return null;
                        }
                    });
                    const profileResults = await Promise.all(profilePromises);
                    const profiles: Record<string, DatasetProfile> = {};
                    profileResults.forEach(result => {
                        if (result) {
                            profiles[result.id] = result.profile;
                        }
                    });
                    setDatasetProfiles(profiles);
                    console.log('[DEBUG] Got dataset profiles:', profiles);
                }

                // Update chat title with project name
                setLocalChats(prev => prev.map(c =>
                    c.id === 'initial'
                        ? { ...c, title: projectData.name }
                        : c
                ));
                console.log('[DEBUG] Finished loading project successfully');
            } catch (err) {
                console.error('[DEBUG] Failed to fetch project:', err);
                setProjectError(err instanceof Error ? err.message : 'Failed to load project');
            } finally {
                console.log('[DEBUG] Setting isLoadingProject to false');
                setIsLoadingProject(false);
            }
        }
        fetchProjectData();
    }, [projectId]);

    const handleDeleteFile = (id: string) => {
        setProjectFiles(prev => prev.filter(f => f.id !== id));
    };

    // Resizable chat state
    const [chatWidth, setChatWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 250 && newWidth < 800) {
                setChatWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    const activeChat = localChats.find(c => c.id === activeChatId) || localChats[0];

    // Process Tambo messages to update local chats and add chart nodes
    useEffect(() => {
        if (!thread?.messages) return;

        const tamboMessages = thread.messages;

        // Sync Tambo messages to local chats
        const newMessages = tamboMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }));

        const pendingChatId = pendingChatIdRef.current;

        // Filter out messages that came from node chats when syncing to General
        const generalMessages = newMessages.filter(msg => !nodeMessageIdsRef.current.has(msg.id));

        // Only sync to 'initial' (General) chat when NOT using a specific node chat
        // AND only with messages that originated from General chat
        if (generalMessages.length > 0 && (!pendingChatId || pendingChatId === 'initial')) {
            setLocalChats(prev => prev.map(c =>
                c.id === 'initial'
                    ? {
                        ...c,
                        messages: [
                            { role: 'assistant', content: "👋 Welcome to Dambo! I can help you explore and visualize your data. Upload a CSV file to get started, then ask me to create charts, analyze trends, or run a Quick Analysis for instant insights." },
                            ...generalMessages.map(m => ({ role: m.role, content: m.content }))
                        ]
                    }
                    : c
            ));
        }

        // Handle specific node chat updates (streaming response)
        if (pendingChatId && pendingChatId !== 'initial') {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                setLocalChats(prev => prev.map(c => {
                    if (c.id === pendingChatId) {
                        const msgs = [...c.messages];
                        const lastLocal = msgs[msgs.length - 1];

                        // Check if the last local message is an assistant message (placeholder or streaming update)
                        if (lastLocal?.role === 'assistant') {
                            // Update the existing message (streaming)
                            msgs[msgs.length - 1] = lastMessage;
                        } else {
                            // Append the new response
                            msgs.push(lastMessage);
                        }

                        return { ...c, messages: msgs };
                    }
                    return c;
                }));
            }
        }

        // Check for new rendered components and add them to canvas
        // Using async IIFE since useEffect callback can't be async directly
        (async () => {
            for (const msg of tamboMessages) {
                // Skip if already processed to avoid duplicate nodes
                if (processedMessageIds.current.has(msg.id)) continue;

                if (msg.role === 'assistant' && msg.renderedComponent) {
                    // Extract all charts from the message (supports multiple charts)
                    // Use the first project file as default dataset ID if AI doesn't provide one
                    const defaultDatasetId = projectFiles.length > 0 ? projectFiles[0].id : undefined;

                    // Find the last user message for Gemini column extraction
                    const userMessages = tamboMessages.filter(m => m.role === 'user');
                    const lastUserMessage = userMessages.length > 0
                        ? (typeof userMessages[userMessages.length - 1].content === 'string'
                            ? userMessages[userMessages.length - 1].content
                            : JSON.stringify(userMessages[userMessages.length - 1].content))
                        : undefined;

                    // Get all available column names from dataset profiles
                    const availableColumns: string[] = [];
                    Object.values(datasetProfiles).forEach((profile: any) => {
                        if (profile?.columns) {
                            profile.columns.forEach((col: any) => {
                                if (col.name && !availableColumns.includes(col.name)) {
                                    availableColumns.push(col.name);
                                }
                            });
                        }
                    });

                    console.log('[DEBUG] Processing chart with userMessage:', lastUserMessage, 'availableColumns:', availableColumns);

                    let chartConfigs = extractAllChartData(msg, defaultDatasetId, lastUserMessage as string | undefined, availableColumns);

                    // Use Gemini to enhance column extraction if we have invalid columns
                    if (chartConfigs.length > 0 && lastUserMessage && availableColumns.length > 0) {
                        const enhancedConfigs: ChartNodeConfig[] = [];

                        for (const config of chartConfigs) {
                            const chartType = config.chartData.type;
                            const props = config.chartData.props as Record<string, unknown>;

                            // Check if we need Gemini help (missing or invalid columns)
                            const needsGemini = (
                                (chartType === 'scatter_chart' && (!props.x || !props.y)) ||
                                ((chartType === 'bar_chart' || chartType === 'histogram_chart' || chartType === 'pie_chart' || chartType === 'boxplot_chart') && !props.column) ||
                                ((chartType === 'line_chart' || chartType === 'area_chart') && (!props.dateColumn || !props.valueColumn)) ||
                                (chartType === 'stacked_bar_chart' && (!props.categoryColumn || !props.stackColumn)) ||
                                (chartType === 'treemap_chart' && !props.valueColumn)
                            );

                            if (needsGemini) {
                                console.log('[Gemini] Attempting extraction for:', chartType);
                                try {
                                    const geminiResult = await extractChartColumnsWithCache(
                                        lastUserMessage as string,
                                        availableColumns,
                                        chartType
                                    );

                                    if (geminiResult) {
                                        const enhancedProps = { ...props } as Record<string, any>;

                                        if (chartType === 'scatter_chart') {
                                            if (geminiResult.x && !props.x) enhancedProps.x = geminiResult.x;
                                            if (geminiResult.y && !props.y) enhancedProps.y = geminiResult.y;
                                        } else if (chartType === 'line_chart' || chartType === 'area_chart') {
                                            if (geminiResult.dateColumn && !props.dateColumn) enhancedProps.dateColumn = geminiResult.dateColumn;
                                            if (geminiResult.valueColumn && !props.valueColumn) enhancedProps.valueColumn = geminiResult.valueColumn;
                                            if (chartType === 'area_chart' && geminiResult.stackColumn && !props.stackColumn) {
                                                enhancedProps.stackColumn = geminiResult.stackColumn;
                                            }
                                        } else if (chartType === 'stacked_bar_chart') {
                                            if (geminiResult.categoryColumn && !props.categoryColumn) enhancedProps.categoryColumn = geminiResult.categoryColumn;
                                            if (geminiResult.stackColumn && !props.stackColumn) enhancedProps.stackColumn = geminiResult.stackColumn;
                                        } else if (chartType === 'treemap_chart') {
                                            if (geminiResult.valueColumn && !props.valueColumn) enhancedProps.valueColumn = geminiResult.valueColumn;
                                        } else if (geminiResult.column && !props.column) {
                                            // Fallback for bar/histogram/pie/boxplot
                                            enhancedProps.column = geminiResult.column;
                                        }

                                        enhancedConfigs.push({
                                            ...config,
                                            chartData: {
                                                ...config.chartData,
                                                props: enhancedProps,
                                            },
                                        });
                                        continue;
                                    }
                                } catch (error) {
                                    console.error('[Gemini] Extraction failed:', error);
                                }
                            }

                            // Use original config if Gemini not needed or failed
                            enhancedConfigs.push(config);
                        }

                        chartConfigs = enhancedConfigs;
                    }

                    if (chartConfigs.length > 0 && flowCanvasRef.current) {
                        // Mark message as processed
                        processedMessageIds.current.add(msg.id);

                        // Check if this message came from a node chat using pendingChatIdRef
                        // (nodeMessageIdsRef has timing issues - it's set 500ms after send)
                        const pendingNodeId = pendingChatIdRef.current;
                        const isFromNodeChat = pendingNodeId && pendingNodeId !== 'initial';

                        if (isFromNodeChat && chartConfigs.length === 1) {
                            // Update the existing node instead of adding a new one
                            const success = flowCanvasRef.current.updateNodeChartData(
                                pendingNodeId,
                                chartConfigs[0].label,
                                chartConfigs[0].chartData
                            );
                            if (success) {
                                console.log('[Node Chat] Updated existing node:', pendingNodeId);
                            } else {
                                // Fallback: add as new node if update failed
                                console.log('[Node Chat] Update failed, adding new node');
                                flowCanvasRef.current.addChartNode(
                                    chartConfigs[0].label,
                                    chartConfigs[0].chartData
                                );
                            }
                        } else if (chartConfigs.length === 1) {
                            // Single chart from general chat - use simple addChartNode
                            flowCanvasRef.current.addChartNode(
                                chartConfigs[0].label,
                                chartConfigs[0].chartData
                            );
                        } else {
                            // Multiple charts - use grid layout and connect with edges
                            const nodeIds = flowCanvasRef.current.addMultipleChartNodes(chartConfigs);

                            // Create edges between nodes (chain them together)
                            for (let i = 0; i < nodeIds.length - 1; i++) {
                                flowCanvasRef.current.addEdgeBetweenNodes(nodeIds[i], nodeIds[i + 1], true);
                            }
                        }
                    }
                }
            }
        })();
    }, [thread?.messages, datasetProfiles, projectFiles]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [activeChat.messages, scrollToBottom]);

    const handleSend = async () => {
        if (!message.trim()) return;

        const userMessage = message;
        setMessage("");
        setIsWaitingForResponse(true);

        // Track which chat initiated this request
        pendingChatIdRef.current = activeChatId;

        // Add user message to local chat immediately
        setLocalChats(prev => prev.map(c => {
            if (c.id === activeChatId) {
                return {
                    ...c,
                    messages: [...c.messages, { role: 'user', content: userMessage }]
                };
            }
            return c;
        }));

        // ============ GEMINI-POWERED CHART GENERATION (bypasses Tambo) ============
        // For general chat, try to generate charts directly using Gemini instead of Tambo streaming
        if (activeChatId === 'initial' && flowCanvasRef.current && projectFiles.length > 0) {
            // Find mentioned dataset or use first one
            const mentionedDataset = projectFiles.find(f =>
                userMessage.toLowerCase().includes(f.name.toLowerCase()) ||
                userMessage.includes(`@${f.name}`)
            ) || projectFiles[0];

            if (mentionedDataset) {
                const profile = datasetProfiles[mentionedDataset.id];
                const availableColumns = profile?.columns?.map((c: { name: string }) => c.name) || [];

                if (availableColumns.length > 0) {
                    try {
                        console.log('[Gemini Direct] Parsing chart generation request...');
                        const chartRequest = await parseChartGenerationRequest(
                            userMessage,
                            availableColumns,
                            mentionedDataset.id,
                            mentionedDataset.name
                        );

                        console.log('[Gemini Direct] Parse result:', chartRequest);

                        if (chartRequest.shouldGenerateChart && chartRequest.chartType) {
                            // Build chart props based on chart type
                            const chartProps: Record<string, unknown> = {
                                datasetId: mentionedDataset.id,
                            };

                            if (chartRequest.column) chartProps.column = chartRequest.column;
                            if (chartRequest.x) chartProps.x = chartRequest.x;
                            if (chartRequest.y) chartProps.y = chartRequest.y;
                            if (chartRequest.dateColumn) chartProps.dateColumn = chartRequest.dateColumn;
                            if (chartRequest.valueColumn) chartProps.valueColumn = chartRequest.valueColumn;
                            if (chartRequest.categoryColumn) chartProps.categoryColumn = chartRequest.categoryColumn;
                            if (chartRequest.stackColumn) chartProps.stackColumn = chartRequest.stackColumn;
                            if (chartRequest.groupColumns) chartProps.groupColumns = chartRequest.groupColumns;

                            // Determine chart label
                            const columnName = chartRequest.column || chartRequest.x || chartRequest.valueColumn || 'Data';
                            const chartLabel = `${columnName} (${chartRequest.chartType.replace('_chart', '').replace('_', ' ')})`;

                            // Add chart node directly to canvas
                            flowCanvasRef.current.addChartNode(
                                chartLabel,
                                { type: chartRequest.chartType!, props: chartProps }
                            );

                            // Add success response to chat
                            setLocalChats(prev => prev.map(c => {
                                if (c.id === activeChatId) {
                                    return {
                                        ...c,
                                        messages: [...c.messages, {
                                            role: 'assistant',
                                            content: `✨ Created **${chartRequest.chartType!.replace('_chart', '').replace('_', ' ')}** for **${columnName}**!\n\n${chartRequest.explanation || 'Your chart has been added to the canvas.'}`
                                        }]
                                    };
                                }
                                return c;
                            }));

                            setIsWaitingForResponse(false);
                            return; // Don't proceed to Tambo
                        }
                    } catch (error) {
                        console.error('[Gemini Direct] Chart generation error:', error);
                        // Fall through to Tambo if Gemini fails
                    }
                }
            }
        }

        // ============ GEMINI-POWERED NODE CHAT ============
        // If chatting from a node, use Gemini to parse and execute chart modifications directly
        if (activeChatId !== 'initial' && flowCanvasRef.current) {
            const canvasState = flowCanvasRef.current.getState();
            const currentNode = canvasState.nodes.find(n => n.id === activeChatId);
            const currentChartData = currentNode?.data?.chartData;

            if (currentChartData) {
                const datasetId = (currentChartData.props as Record<string, unknown>).datasetId as string;
                const currentColumn = (currentChartData.props as Record<string, unknown>).column as string | undefined;
                const currentX = (currentChartData.props as Record<string, unknown>).x as string | undefined;

                // Get available columns
                const datasetProfile = datasetProfiles[datasetId];
                const availableColumns = datasetProfile?.columns?.map((c: { name: string }) => c.name) || [];

                if (availableColumns.length > 0) {
                    try {
                        // Use Gemini to understand what the user wants
                        const modification = await parseChartModification(
                            userMessage,
                            currentChartData.type,
                            currentColumn || currentX,
                            availableColumns,
                            datasetId
                        );

                        console.log('[Gemini Node Chat] Parsed modification:', modification);

                        // Handle the modification directly
                        if (modification.action !== 'unknown') {
                            console.log('[Gemini Node Chat] Applied Action:', modification.action);
                            console.log('[Gemini Node Chat] Filter Data:', modification.filter);

                            let newChartData = { ...currentChartData };
                            let newLabel = currentNode?.data?.label || 'Chart';

                            // Apply the modification
                            if (modification.action === 'change_type' && modification.newChartType) {
                                // Check for incompatible chart types
                                const simpleCharts = ['bar_chart', 'pie_chart', 'histogram_chart', 'boxplot_chart'];
                                const complexCharts = ['line_chart', 'area_chart', 'scatter_chart'];

                                const targetType = modification.newChartType;


                                // Validation for complex charts using dataset profile
                                if (complexCharts.includes(targetType)) {
                                    const profile = datasetProfiles[datasetId];

                                    if (profile) {
                                        if (targetType === 'scatter_chart' || targetType === 'bubble_chart') {
                                            const numericCols = profile.columns.filter(c =>
                                                ['numeric', 'integer', 'float', 'number'].includes(c.detected_type.toLowerCase())
                                            );

                                            if (numericCols.length < 2) {
                                                setLocalChats(prev => prev.map(c => {
                                                    if (c.id === activeChatId) {
                                                        return {
                                                            ...c,
                                                            messages: [...c.messages, { role: 'assistant', content: `⚠️ Cannot switch to ${targetType.replace('_chart', '')} plot. This chart type requires at least two numeric columns, but your dataset only has ${numericCols.length}.` }]
                                                        };
                                                    }
                                                    return c;
                                                }));
                                                setIsWaitingForResponse(false);
                                                return;
                                            }

                                            setLocalChats(prev => prev.map(c => {
                                                if (c.id === activeChatId) {
                                                    return {
                                                        ...c,
                                                        messages: [...c.messages, { role: 'assistant', content: `⚠️ Scatter/Bubble plots require two specific numeric columns. Please say something like "scatter of Sales vs Profit" to specify them.` }]
                                                    };
                                                }
                                                return c;
                                            }));
                                            setIsWaitingForResponse(false);
                                            return;
                                        }

                                        if (targetType === 'line_chart' || targetType === 'area_chart') {
                                            const dateCols = profile.columns.filter(c => ['date', 'datetime', 'timestamp', 'time'].includes(c.detected_type.toLowerCase()));

                                            if (dateCols.length === 0) {
                                                setLocalChats(prev => prev.map(c => {
                                                    if (c.id === activeChatId) {
                                                        return {
                                                            ...c,
                                                            messages: [...c.messages, { role: 'assistant', content: `⚠️ Cannot switch to ${targetType.replace('_chart', '')}. No date/time column detected in this dataset.` }]
                                                        };
                                                    }
                                                    return c;
                                                }));
                                                setIsWaitingForResponse(false);
                                                return;
                                            }

                                            setLocalChats(prev => prev.map(c => {
                                                if (c.id === activeChatId) {
                                                    return {
                                                        ...c,
                                                        messages: [...c.messages, { role: 'assistant', content: `⚠️ Line/Area charts require a Date column. Please say something like "line chart of Sales over Date" to specify.` }]
                                                    };
                                                }
                                                return c;
                                            }));
                                            setIsWaitingForResponse(false);
                                            return;
                                        }
                                    } else {
                                        setLocalChats(prev => prev.map(c => {
                                            if (c.id === activeChatId) {
                                                return {
                                                    ...c,
                                                    messages: [...c.messages, { role: 'assistant', content: `⚠️ Cannot convert from simple to complex chart (${targetType.replace('_chart', '')}) without specific columns. Please specify columns.` }]
                                                };
                                            }
                                            return c;
                                        }));
                                        setIsWaitingForResponse(false);
                                        return;
                                    }
                                }

                                newChartData = {
                                    type: targetType as typeof currentChartData.type,
                                    props: {
                                        // Preserve existing props (like filter, color) when changing type
                                        ...(currentChartData.props as Record<string, unknown>),
                                        datasetId,
                                        column: currentColumn || currentX,
                                    }
                                };
                                newLabel = `${currentColumn || currentX} (${targetType.replace('_chart', '')})`;
                            } else if (modification.action === 'change_column' && modification.newColumn) {
                                newChartData = {
                                    type: currentChartData.type,
                                    props: {
                                        ...(currentChartData.props as Record<string, unknown>),
                                        column: modification.newColumn,
                                    }
                                };
                                newLabel = `${modification.newColumn} Distribution`;
                            } else if (modification.action === 'add_filter' && modification.filter) {
                                console.log('[Gemini Node Chat] Applying filter:', modification.filter);
                                newChartData = {
                                    type: currentChartData.type,
                                    props: {
                                        ...(currentChartData.props as Record<string, unknown>),
                                        filter: modification.filter,
                                    }
                                };
                                console.log('[Gemini Node Chat] New props with filter:', newChartData.props);
                                newLabel = `${currentColumn || currentX} (filtered: ${modification.filter.operator} ${modification.filter.value})`;
                            } else if (modification.action === 'change_style' && modification.color) {
                                newChartData = {
                                    type: currentChartData.type,
                                    props: {
                                        ...(currentChartData.props as Record<string, unknown>),
                                        color: modification.color,
                                    }
                                };
                                // Don't change label for style changes
                            } else if (modification.action === 'change_both') {
                                const simpleCharts = ['bar_chart', 'pie_chart', 'histogram_chart', 'boxplot_chart'];
                                const targetType = modification.newChartType || currentChartData.type;

                                if (!simpleCharts.includes(targetType)) {
                                    setLocalChats(prev => prev.map(c => {
                                        if (c.id === activeChatId) {
                                            return {
                                                ...c,
                                                messages: [...c.messages, {
                                                    role: 'assistant',
                                                    content: `⚠️ Cannot convert to ${targetType.replace('_chart', '')} chart from the current data. Try: bar, pie, histogram, or boxplot.`
                                                }]
                                            };
                                        }
                                        return c;
                                    }));
                                    setIsWaitingForResponse(false);
                                    return;
                                }

                                newChartData = {
                                    type: targetType as typeof currentChartData.type,
                                    props: {
                                        datasetId,
                                        column: modification.newColumn || currentColumn,
                                    }
                                };
                                newLabel = `${modification.newColumn || currentColumn} (${targetType.replace('_chart', '')})`;
                            }

                            // Update the node
                            const success = flowCanvasRef.current.updateNodeChartData(
                                activeChatId,
                                newLabel,
                                newChartData
                            );

                            // Add response to chat
                            const responseMessage = success
                                ? `✅ ${modification.explanation || 'Chart updated successfully!'}`
                                : `❌ Failed to update chart. Please try again.`;

                            setLocalChats(prev => prev.map(c => {
                                if (c.id === activeChatId) {
                                    return {
                                        ...c,
                                        messages: [...c.messages, { role: 'assistant', content: responseMessage }]
                                    };
                                }
                                return c;
                            }));

                            setIsWaitingForResponse(false);
                            return; // Don't send to Tambo - we handled it directly
                        } else {
                            // Handle 'unknown' action - likely a style change or unsupported request
                            setLocalChats(prev => prev.map(c => {
                                if (c.id === activeChatId) {
                                    return {
                                        ...c,
                                        messages: [...c.messages, {
                                            role: 'assistant',
                                            content: `💡 I can help you with:\n• **Change chart type**: "show as pie chart", "make it a bar chart"\n• **Change column**: "show Age instead", "change to Department"\n• **Add filter**: "show count > 100", "filter values above 50"\n• **Change style**: "make it red", "change color to blue"`
                                        }]
                                    };
                                }
                                return c;
                            }));
                            setIsWaitingForResponse(false);
                            return;
                        }
                    } catch (error) {
                        console.error('[Gemini Node Chat] Error:', error);
                        // Fall through to Tambo if Gemini fails
                    }
                }
            }
        }

        try {
            // Build lean context with only essential data for Tambo (avoid payload size issues)
            const datasetsContext = projectFiles.map(f => {
                const profile = datasetProfiles[f.id];
                if (profile) {
                    return {
                        datasetId: f.id,
                        filename: f.name,
                        rowCount: profile.shape.row_count,
                        columnCount: profile.shape.column_count,
                        columns: profile.columns.slice(0, 30).map(c => ({
                            name: c.name,
                            type: c.detected_type,
                        })),
                        // Note: Removed numericStats, categoryStats, and samples to reduce payload size
                    };
                }
                return { datasetId: f.id, filename: f.name };
            });

            const context: Record<string, unknown> = {
                projectId,
                projectName: project?.name,
                datasets: datasetsContext,
                instructions: `You are a data visualization assistant. 
                When asked to visualize a column (e.g., "bar chart of city"), you MUST:
                1. Identify the correct column name from the 'columns' list in the dataset context.
                2. Call the appropriate tool (e.g., bar_chart) with BOTH 'datasetId' AND 'column'.
                3. Do NOT omit the 'column' parameter.
                4. If the user's column name is slightly different (e.g., case mismatch), use the exact name from the dataset.
                Available datasets: ${datasetsContext.map((d: any) => `${d.filename} (ID: ${d.datasetId}) - Columns: ${d.columns?.map((c: any) => c.name).join(', ')}`).join('\n')}`
            };

            // Add node context if chatting from a specific node
            if (activeChatId !== 'initial') {
                const activeNodeChat = localChats.find(c => c.id === activeChatId);
                if (activeNodeChat) {
                    // Get current chart data from the canvas
                    const canvasState = flowCanvasRef.current?.getState();
                    const currentNode = canvasState?.nodes.find(n => n.id === activeChatId);
                    const currentChartData = currentNode?.data?.chartData;

                    // Get available columns from dataset profiles for this dataset
                    const datasetId = (currentChartData?.props as Record<string, unknown>)?.datasetId as string | undefined;
                    const datasetProfile = datasetId ? datasetProfiles[datasetId] : null;
                    const availableColumns = datasetProfile?.columns?.map((c: { name: string }) => c.name) || [];

                    // Truncate available columns for system instruction to avoid context limit errors
                    const truncatedColumns = availableColumns.slice(0, 50); // Limit to 50 columns
                    const visibleColumnsStr = truncatedColumns.join(', ') + (availableColumns.length > 50 ? `... and ${availableColumns.length - 50} more` : '');

                    context.activeNode = {
                        id: activeChatId,
                        label: activeNodeChat.title,
                        isSpecificContext: true,
                        currentChart: currentChartData ? {
                            type: currentChartData.type,
                            props: currentChartData.props,
                        } : null,
                    };

                    // Get current column being displayed
                    const currentColumn = (currentChartData?.props as Record<string, unknown>)?.column as string | undefined;
                    const currentX = (currentChartData?.props as Record<string, unknown>)?.x as string | undefined;
                    const currentY = (currentChartData?.props as Record<string, unknown>)?.y as string | undefined;

                    // Add instruction for chart modification with available columns
                    context.systemInstruction = `You are modifying a specific chart node.

CURRENT CHART: ${currentChartData?.type || 'None'}
CURRENT COLUMN(S): ${currentColumn || currentX || 'Unknown'} ${currentY ? `vs ${currentY}` : ''}
DATASET ID: ${datasetId || 'Unknown'}
AVAILABLE COLUMNS: ${datasetId ? visibleColumnsStr : 'Unknown'}

INSTRUCTIONS:
1. When user asks to change chart type (e.g., "show as pie chart"), keep the SAME column (${currentColumn || currentX || 'the current one'}) and datasetId.
2. When user asks to filter (e.g., "show count > 100"), add filter prop: { column: "${currentColumn || 'column_name'}", operator: ">", value: 100 }
3. ALWAYS use exact column names from AVAILABLE COLUMNS list above - never guess!
4. Always include the datasetId: "${datasetId}"

Current props: ${JSON.stringify(currentChartData?.props || {})}`;

                    console.log('[DEBUG] Added node context with chart:', context.activeNode);
                    console.log('[DEBUG] Available columns:', availableColumns);
                }
            }

            console.log('[DEBUG] Sending to Tambo with context:', JSON.stringify(context, null, 2));

            // Track thread length before sending from node chat
            // Any new messages after this point belong to this node chat
            const threadLengthBefore = thread?.messages?.length || 0;
            const isNodeChat = activeChatId !== 'initial';

            try {
                console.log('[Dashboard] Sending message to Tambo...', { contextSize: JSON.stringify(context).length });
                await sendThreadMessage(userMessage, {
                    additionalContext: context,
                });
            } catch (err) {
                console.error('[Dashboard] Primary sendThreadMessage failed:', err);

                try {
                    console.log('[Dashboard] Retrying with empty context...');
                    // Fallback: Absolutley no context to rule out payload issues
                    await sendThreadMessage(userMessage);
                } catch (retryErr) {
                    console.error('[Dashboard] Retry failed:', retryErr);
                    // Add a visible error message to the chat
                    setLocalChats(prev => prev.map(c => {
                        if (c.id === activeChatId) {
                            return {
                                ...c,
                                messages: [...c.messages, {
                                    role: 'assistant',
                                    content: `❌ Connection Error: ${(retryErr as Error).message || 'Failed to send message'}. Please try refreshing the page.`
                                }]
                            };
                        }
                        return c;
                    }));
                }
            }

            // If this was from a node chat, mark any new messages as node-originated
            // We do this in the sync effect by checking the message indices
            if (isNodeChat) {
                // Store the starting index for this node chat's messages
                // Any Tambo messages with index >= threadLengthBefore belong to this node
                setTimeout(() => {
                    const currentMessages = thread?.messages || [];
                    for (let i = threadLengthBefore; i < currentMessages.length; i++) {
                        nodeMessageIdsRef.current.add(currentMessages[i].id);
                    }
                }, 500);
            }

            // Add a placeholder response while waiting
            setLocalChats(prev => prev.map(c => {
                if (c.id === activeChatId) {
                    return {
                        ...c,
                        messages: [...c.messages, { role: 'assistant', content: "Processing your request..." }]
                    };
                }
                return c;
            }));
        } catch (err) {
            console.error('Failed to send message:', err);
            setLocalChats(prev => prev.map(c => {
                if (c.id === activeChatId) {
                    return {
                        ...c,
                        messages: [...c.messages, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed to process request'}` }]
                    };
                }
                return c;
            }));
        } finally {
            setIsWaitingForResponse(false);
        }
    };

    const handleNodeSelect = (node: Node | null) => {
        if (!node) {
            setActiveChatId('initial');
            return;
        }

        const chatId = node.id;
        const existingChat = localChats.find(c => c.id === chatId);

        if (existingChat) {
            setActiveChatId(chatId);
        } else {
            const label = (node.data?.label as string) || `Node ${node.id}`;
            const newChat = {
                id: chatId,
                title: label,
                messages: [{ role: 'assistant', content: `📊 **Active Node:** ${label}` }]
            };
            setLocalChats(prev => [...prev, newChat]);
        }
    };

    // ============ Persistence: Debounced Auto-Save (5 seconds) ============

    const canvasSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const chatSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasLoadedPersistedState = useRef(false);

    // Load persisted canvas and chats on mount
    useEffect(() => {
        async function loadPersistedState() {
            if (hasLoadedPersistedState.current) return;
            hasLoadedPersistedState.current = true;

            try {
                // Load canvas state
                const canvasState = await loadCanvasState(projectId);
                if (canvasState.nodes.length > 0 && flowCanvasRef.current) {
                    console.log('[Persistence] Loading saved canvas state:', canvasState.nodes.length, 'nodes');
                    flowCanvasRef.current.setInitialState(
                        canvasState.nodes as DataNodeType[],
                        canvasState.edges as Edge[]
                    );
                }

                // Load chats
                const chatsData = await loadChats(projectId);
                if (chatsData.chats.length > 0) {
                    console.log('[Persistence] Loading saved chats:', chatsData.chats.length, 'chats');
                    setLocalChats(chatsData.chats.map(c => ({
                        id: c.id,
                        title: c.title,
                        messages: c.messages.map(m => ({ role: m.role, content: m.content }))
                    })));
                }
            } catch (err) {
                console.warn('[Persistence] Failed to load persisted state:', err);
            }
        }

        // Small delay to ensure components are mounted
        setTimeout(loadPersistedState, 500);
    }, [projectId]);

    // Debounced canvas state save (5 seconds)
    const handleCanvasStateChange = useCallback((nodes: DataNodeType[], edges: Edge[]) => {
        if (canvasSaveTimeoutRef.current) {
            clearTimeout(canvasSaveTimeoutRef.current);
        }

        canvasSaveTimeoutRef.current = setTimeout(async () => {
            try {
                console.log('[Persistence] Saving canvas state:', nodes.length, 'nodes');
                await saveCanvasState(projectId, nodes, edges);
            } catch (err) {
                console.error('[Persistence] Failed to save canvas state:', err);
            }
        }, 5000); // 5 second debounce
    }, [projectId]);

    // Debounced chat save (5 seconds)
    useEffect(() => {
        // Skip initial render and empty chats
        if (!hasLoadedPersistedState.current || localChats.length === 0) return;

        if (chatSaveTimeoutRef.current) {
            clearTimeout(chatSaveTimeoutRef.current);
        }

        chatSaveTimeoutRef.current = setTimeout(async () => {
            try {
                console.log('[Persistence] Saving chats:', localChats.length, 'chats');
                const chatsToSave: ChatItem[] = localChats.map(c => ({
                    id: c.id,
                    title: c.title,
                    messages: c.messages.map(m => ({ role: m.role, content: m.content }))
                }));
                await saveChats(projectId, chatsToSave);
            } catch (err) {
                console.error('[Persistence] Failed to save chats:', err);
            }
        }, 5000); // 5 second debounce

        return () => {
            if (chatSaveTimeoutRef.current) {
                clearTimeout(chatSaveTimeoutRef.current);
            }
        };
    }, [localChats, projectId]);

    // Clear canvas handler
    const handleClearCanvas = useCallback(async () => {
        try {
            console.log('[Persistence] Clearing canvas state');
            await clearCanvasState(projectId);
        } catch (err) {
            console.error('[Persistence] Failed to clear canvas state:', err);
        }
    }, [projectId]);

    // Quick Analysis handler - calls backend and triggers Tambo summary + adds chart nodes
    const handleQuickAnalysis = () => {
        if (projectFiles.length === 0) {
            setLocalChats(prev => prev.map(c =>
                c.id === 'initial'
                    ? { ...c, messages: [...c.messages, { role: 'assistant', content: 'Please upload a dataset first before running Quick Analysis.' }] }
                    : c
            ));
            return;
        }

        // If only one dataset, run directly. Otherwise, show selector.
        if (projectFiles.length === 1) {
            runQuickAnalysisForDataset(projectFiles[0].id, projectFiles[0].name);
        } else {
            setShowDatasetSelector(true);
        }
    };

    // Run quick analysis for a specific dataset
    const runQuickAnalysisForDataset = async (datasetId: string, datasetName: string) => {
        setShowDatasetSelector(false);

        // Add a processing message to chat
        setLocalChats(prev => prev.map(c =>
            c.id === 'initial'
                ? { ...c, messages: [...c.messages, { role: 'assistant', content: `⚡ Running Smart Quick Analysis on "${datasetName}"...` }] }
                : c
        ));

        const analysisResult = await quickAnalysis.runAnalysis(datasetId);

        if (analysisResult && flowCanvasRef.current) {
            // Build chart configs
            const chartConfigs: ChartNodeConfig[] = [];

            if (analysisResult.chart_payloads.histograms && analysisResult.chart_payloads.histograms.length > 0) {
                analysisResult.chart_payloads.histograms.forEach(hist => {
                    chartConfigs.push({
                        label: `Distribution: ${hist.column}`,
                        chartData: {
                            type: 'histogram_chart',
                            props: { datasetId, column: hist.column },
                        },
                    });
                });
            }

            if (analysisResult.chart_payloads.bars && analysisResult.chart_payloads.bars.length > 0) {
                analysisResult.chart_payloads.bars.forEach(bar => {
                    chartConfigs.push({
                        label: `Categories: ${bar.column}`,
                        chartData: {
                            type: 'bar_chart',
                            props: { datasetId, column: bar.column },
                        },
                    });
                });
            }

            if (analysisResult.chart_payloads.correlation_heatmap &&
                analysisResult.chart_payloads.correlation_heatmap.columns.length > 0) {
                chartConfigs.push({
                    label: 'Correlation Heatmap',
                    chartData: {
                        type: 'correlation_heatmap',
                        props: { datasetId },
                    },
                });
            }

            // ===== NEW: Add recommended scatter plots =====
            if (analysisResult.scatter_recommendations && analysisResult.scatter_recommendations.length > 0) {
                // Add top 2 scatter plots
                const topScatters = analysisResult.scatter_recommendations.slice(0, 2);
                for (const rec of topScatters) {
                    chartConfigs.push({
                        label: `${rec.x} vs ${rec.y}`,
                        chartData: {
                            type: 'scatter_chart',
                            props: { datasetId, x: rec.x, y: rec.y },
                        },
                    });
                }
            }

            // Add analysis cluster: parent node with dataset name + child chart nodes
            if (chartConfigs.length > 0) {
                flowCanvasRef.current.addAnalysisCluster(datasetName, chartConfigs);
            }

            // Store structured summary data for the report modal
            const summary = buildDataQualitySummary(analysisResult, datasetName, chartConfigs);
            setSummaryData(summary);

            // Add a brief notification message with View Summary trigger
            const notificationMessage = {
                role: 'assistant',
                content: `Quick analysis complete for **${datasetName}**! Charts have been added to the canvas. Click "View Summary" below to see detailed insights.`,
                hasSummary: true,
            };
            setLocalChats(prev => prev.map(c =>
                c.id === activeChatId
                    ? { ...c, messages: [...c.messages, notificationMessage] }
                    : c
            ));
        }
    };

    // Visualization handlers for each button type
    const runVisualization = async (type: 'correlations' | 'distributions' | 'categories' | 'outliers', datasetId: string) => {
        setShowVizDatasetSelector(null);
        if (!flowCanvasRef.current) return;

        // Get dataset name for labeling
        const datasetFile = projectFiles.find(f => f.id === datasetId);
        const datasetName = datasetFile?.name || 'Dataset';

        try {
            const profile = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/datasets/${datasetId}/profile`).then(r => r.json());

            if (type === 'correlations') {
                const numericCols = profile.columns?.filter((c: any) => c.detected_type === 'numeric') || [];
                if (numericCols.length >= 2) {
                    flowCanvasRef.current.addChartNode(`${datasetName} - Feature Correlations`, {
                        type: 'correlation_heatmap',
                        props: { datasetId }
                    });
                } else if (numericCols.length === 1) {
                    flowCanvasRef.current.addChartNode(`${datasetName} - ${numericCols[0].name} Distribution`, {
                        type: 'histogram_chart',
                        props: { datasetId, column: numericCols[0].name }
                    });
                } else {
                    const catCol = profile.columns?.find((c: any) => c.detected_type === 'categorical');
                    if (catCol) {
                        flowCanvasRef.current.addChartNode(`${datasetName} - ${catCol.name} Counts`, {
                            type: 'bar_chart',
                            props: { datasetId, column: catCol.name }
                        });
                    }
                }
            } else if (type === 'distributions') {
                const numericCols = (profile.columns || [])
                    .filter((c: any) => c.detected_type === 'numeric')
                    .filter((c: any) => {
                        const name = c.name.toLowerCase();
                        return !name.includes('id') && !name.includes('index') && name !== 'id';
                    });
                if (numericCols.length > 0) {
                    const chartConfigs = numericCols.slice(0, 2).map((col: any) => ({
                        label: `${datasetName} - ${col.name} Distribution`,
                        chartData: { type: 'histogram_chart' as const, props: { datasetId, column: col.name } }
                    }));
                    flowCanvasRef.current?.addMultipleChartNodes(chartConfigs);
                } else {
                    const catCols = (profile.columns || []).filter((c: any) => c.detected_type === 'categorical').slice(0, 2);
                    const chartConfigs = catCols.map((col: any) => ({
                        label: `${datasetName} - ${col.name} Counts`,
                        chartData: { type: 'bar_chart' as const, props: { datasetId, column: col.name } }
                    }));
                    flowCanvasRef.current?.addMultipleChartNodes(chartConfigs);
                }
            } else if (type === 'categories') {
                const getCategoryUniqueCount = (colName: string) => {
                    const catStat = profile.category_stats?.find((s: any) => s.column === colName);
                    return catStat?.unique_count || 0;
                };
                const catCols = (profile.columns || [])
                    .filter((c: any) => c.detected_type === 'categorical')
                    .filter((c: any) => {
                        const name = c.name.toLowerCase();
                        const uniqueCount = getCategoryUniqueCount(c.name);
                        return !name.includes('id') && !name.endsWith('_id') && name !== 'id' && uniqueCount >= 2 && uniqueCount <= 25;
                    });
                if (catCols.length > 0) {
                    const chartConfigs = catCols.slice(0, 2).map((col: any) => ({
                        label: `${datasetName} - ${col.name} Breakdown`,
                        chartData: { type: 'pie_chart' as const, props: { datasetId, column: col.name } }
                    }));
                    flowCanvasRef.current?.addMultipleChartNodes(chartConfigs);
                } else {
                    const anyCat = (profile.columns || []).find((c: any) => c.detected_type === 'categorical');
                    if (anyCat) {
                        flowCanvasRef.current.addChartNode(`${datasetName} - ${anyCat.name} Breakdown`, {
                            type: 'bar_chart',
                            props: { datasetId, column: anyCat.name }
                        });
                    } else {
                        const numCol = (profile.columns || []).find((c: any) => c.detected_type === 'numeric');
                        if (numCol) {
                            flowCanvasRef.current.addChartNode(`${datasetName} - ${numCol.name} Distribution`, {
                                type: 'histogram_chart',
                                props: { datasetId, column: numCol.name }
                            });
                        }
                    }
                }
            } else if (type === 'outliers') {
                const numericCols = (profile.columns || [])
                    .filter((c: any) => c.detected_type === 'numeric')
                    .filter((c: any) => {
                        const name = c.name.toLowerCase();
                        return !name.includes('id') && !name.includes('index') && name !== 'id';
                    });
                if (numericCols.length > 0) {
                    flowCanvasRef.current.addChartNode(`${datasetName} - ${numericCols[0].name} Outliers`, {
                        type: 'boxplot_chart',
                        props: { datasetId, column: numericCols[0].name }
                    });
                } else {
                    const anyNum = (profile.columns || []).find((c: any) => c.detected_type === 'numeric');
                    if (anyNum) {
                        flowCanvasRef.current.addChartNode(`${datasetName} - ${anyNum.name} Outliers`, {
                            type: 'boxplot_chart',
                            props: { datasetId, column: anyNum.name }
                        });
                    } else {
                        const catCol = (profile.columns || []).find((c: any) => c.detected_type === 'categorical');
                        if (catCol) {
                            flowCanvasRef.current.addChartNode(`${datasetName} - ${catCol.name} Counts`, {
                                type: 'bar_chart',
                                props: { datasetId, column: catCol.name }
                            });
                        }
                    }
                }
            }
        } catch (e) { console.error(e); }
    };

    // Handle visualization button click - show selector if multiple datasets, otherwise run directly
    const handleVizButtonClick = (type: 'correlations' | 'distributions' | 'categories' | 'outliers') => {
        if (projectFiles.length === 0) return;
        if (projectFiles.length === 1) {
            runVisualization(type, projectFiles[0].id);
        } else {
            setShowVizDatasetSelector(type);
        }
    };

    // Build structured data quality summary for the report modal
    function buildDataQualitySummary(data: QuickAnalysisData, datasetName: string, chartConfigs: any[] = []): DataQualitySummary {
        const { dataset_overview, missing_data_insights, outlier_detection, data_quality, chart_payloads } = data;

        return {
            datasetName,
            chartConfigs, // Store chart configurations for visualization
            overview: {
                rowCount: dataset_overview.row_count,
                columnCount: dataset_overview.column_count,
                numericColumns: dataset_overview.numeric_columns,
                categoricalColumns: dataset_overview.categorical_columns,
                datetimeColumns: dataset_overview.datetime_columns || [],
            },
            qualityScore: {
                score: data_quality?.overall_score ?? 0,
                level: data_quality?.level ?? 'Unknown',
            },
            missingData: missing_data_insights.columns
                .filter(c => c.missing_percentage > 0)
                .sort((a, b) => b.missing_percentage - a.missing_percentage)
                .map(c => ({
                    column: c.column,
                    count: c.missing_count,
                    percentage: c.missing_percentage,
                })),
            outliers: outlier_detection
                .filter(o => o.outlier_percentage > 0)
                .sort((a, b) => b.outlier_percentage - a.outlier_percentage)
                .map(o => ({
                    column: o.column,
                    count: o.outlier_count,
                    percentage: o.outlier_percentage,
                })),
            duplicateRows: dataset_overview.duplicate_rows,
            issues: data_quality?.issues?.map(issue => ({
                type: issue.type,
                severity: issue.severity,
                message: issue.message,
                affectedColumns: issue.affected_columns,
            })) || [],
            chartPayloads: {
                histograms: chart_payloads?.histograms || [],
                bars: chart_payloads?.bars || [],
            },
        };
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);

            // Upload to backend
            const dataset = await uploadDataset(projectId, file);
            const newFile = datasetToFile(dataset);
            setProjectFiles(prev => [...prev, newFile]);

            // Add a notification message to the chat
            const assistantMsg = {
                role: 'assistant',
                content: `I've added "${file.name}" to your project collection. You can now mention it using "@" in our chat to start analyzing its contents.`
            };
            setLocalChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c));

        } catch (err) {
            console.error('Failed to upload file:', err);
            const errorMsg = {
                role: 'assistant',
                content: `Failed to upload "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
            };
            setLocalChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, errorMsg] } : c));
        } finally {
            setIsUploading(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleMessageChange = (val: string) => {
        setMessage(val);

        const lastAtPos = val.lastIndexOf('@');
        if (lastAtPos !== -1 && (lastAtPos === 0 || val[lastAtPos - 1] === ' ')) {
            const searchStr = val.substring(lastAtPos + 1);
            if (!searchStr.includes(' ')) {
                setMentionSearch(searchStr);
                setShowMentions(true);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const selectMention = (fileName: string) => {
        const lastAtPos = message.lastIndexOf('@');
        const newMessage = message.substring(0, lastAtPos) + `@${fileName} ` + message.substring(message.indexOf(' ', lastAtPos) !== -1 ? message.indexOf(' ', lastAtPos) : message.length);
        setMessage(newMessage);
        setShowMentions(false);
    };

    const filteredFiles = projectFiles.filter(f =>
        f.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    // Debug: log state values
    console.log('[DEBUG] Render state:', { isLoadingProject, isWaitingForResponse });

    if (isLoadingProject) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-500">Loading project...</p>
                </div>
            </div>
        );
    }

    if (projectError) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-red-500">{projectError}</p>
                    <Link href="/dashboard">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Left: Canvas Area */}
            <div className="flex-1 flex flex-col relative group overflow-hidden">
                {/* Back Button */}
                {/* Top Right Actions: Expanding Upload Panel */}
                <div
                    className={`absolute top-3 right-3 z-30 transition-all duration-300 ease-in-out bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm overflow-hidden flex flex-col ${isUploadExpanded ? 'w-72 max-h-96' : 'w-24 max-h-[28px]'
                        }`}
                >
                    <div
                        onClick={() => !isUploadExpanded && setIsUploadExpanded(true)}
                        className={`flex items-center justify-between px-3 h-7 shrink-0 transition-colors ${!isUploadExpanded ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50' : 'border-b border-zinc-200 dark:border-zinc-800'}`}
                    >
                        {!isUploadExpanded ? (
                            <div className="flex items-center gap-2">
                                {isUploading ? (
                                    <Loader2 className="size-3.5 text-zinc-600 dark:text-zinc-400 animate-spin" />
                                ) : (
                                    <Upload className="size-3.5 text-zinc-600 dark:text-zinc-400" />
                                )}
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </span>
                            </div>
                        ) : (
                            <>
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Files</span>
                                <div className="flex items-center gap-1 -mr-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                        title="Upload New"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                            <Plus className="size-3.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsUploadExpanded(false); }}
                                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={`flex-1 overflow-y-auto p-1 scrollbar-none transition-opacity duration-200 ${isUploadExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {projectFiles.length > 0 ? (
                            <div className="space-y-0.5">
                                {projectFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group/file flex items-center justify-between p-2 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {file.type === 'JSON' ? (
                                                <FileJson className="size-3.5 text-amber-500 shrink-0" />
                                            ) : (
                                                <FileText className="size-3.5 text-blue-500 shrink-0" />
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {file.size} • {file.type}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFile(file.id)}
                                            className="opacity-0 group-hover/file:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
                                <Upload className="size-6 opacity-20" />
                                <span className="text-[10px] font-medium">No files uploaded</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".csv,.json"
                    />
                </div>

                <div className="absolute top-3 left-3 z-20">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md bg-white/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all backdrop-blur-sm shadow-sm"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="size-3.5" />
                        </Button>
                    </Link>
                </div>

                {/* React Flow Canvas */}
                <div className="h-full w-full">
                    <FlowCanvas
                        ref={flowCanvasRef}
                        onNodeSelect={handleNodeSelect}
                        onQuickAnalysis={handleQuickAnalysis}
                        isQuickAnalysisLoading={quickAnalysis.isLoading}
                        isQuickAnalysisDisabled={projectFiles.length === 0}
                        onStateChange={handleCanvasStateChange}
                        onClearCanvas={handleClearCanvas}
                    />

                    {/* Quick Analysis Buttons - Bottom Center */}
                    {projectFiles.length > 0 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
                            <button
                                onClick={() => handleVizButtonClick('correlations')}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-600 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5"
                                title="Show correlations between numeric features"
                            >
                                <span className="text-violet-500">🔗</span>
                                Correlations
                            </button>
                            <button
                                onClick={() => handleVizButtonClick('distributions')}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5"
                                title="Show distributions of key features"
                            >
                                <span className="text-blue-500">📊</span>
                                Distributions
                            </button>
                            <button
                                onClick={() => handleVizButtonClick('categories')}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-600 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5"
                                title="Show category breakdowns"
                            >
                                <span className="text-green-500">🥧</span>
                                Categories
                            </button>
                            <button
                                onClick={() => handleVizButtonClick('outliers')}
                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5"
                                title="Show outliers and statistical distribution"
                            >
                                <span className="text-amber-500">📦</span>
                                Outliers
                            </button>
                        </div>
                    )}

                    {/* Visualization Dataset Selector Dropdown */}
                    {showVizDatasetSelector && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[240px]">
                                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                        Select Dataset for {showVizDatasetSelector.charAt(0).toUpperCase() + showVizDatasetSelector.slice(1)}
                                    </span>
                                    <button
                                        onClick={() => setShowVizDatasetSelector(null)}
                                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {projectFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => runVisualization(showVizDatasetSelector, file.id)}
                                            className="w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                        >
                                            <span className="text-sm">📊</span>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dataset Selector Dropdown */}
                    {showDatasetSelector && (
                        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[240px]">
                                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Select Dataset</span>
                                    <button
                                        onClick={() => setShowDatasetSelector(false)}
                                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {projectFiles.map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => runQuickAnalysisForDataset(file.id, file.name)}
                                            className="w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                        >
                                            <Zap className="w-3.5 h-3.5 text-violet-500" />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Chat Interface */}
            <div className="relative flex pointer-events-none z-30 h-full">
                {/* Resize Handle */}
                <div
                    className="w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-40 h-full pointer-events-auto"
                    onMouseDown={startResizing}
                />

                <div
                    style={{ width: `${chatWidth}px` }}
                    className="flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm pointer-events-auto h-full"
                >
                    {/* Chat Header */}
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {isEditingName ? (
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onBlur={() => {
                                            if (editedName.trim() && project) {
                                                setProject({ ...project, name: editedName.trim() });
                                            }
                                            setIsEditingName(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (editedName.trim() && project) {
                                                    setProject({ ...project, name: editedName.trim() });
                                                }
                                                setIsEditingName(false);
                                            } else if (e.key === 'Escape') {
                                                setEditedName(project?.name || activeChat.title);
                                                setIsEditingName(false);
                                            }
                                        }}
                                        autoFocus
                                        className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-violet-400 max-w-[180px]"
                                    />
                                ) : (
                                    <h3
                                        className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                        onClick={() => {
                                            setEditedName(project?.name || activeChat.title);
                                            setIsEditingName(true);
                                        }}
                                        title="Click to rename project"
                                    >
                                        {project?.name || activeChat.title}
                                    </h3>
                                )}
                                {isWaitingForResponse && (
                                    <Loader2 className="size-3.5 animate-spin text-blue-500" />
                                )}
                            </div>
                            {activeChatId !== 'initial' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveChatId('initial')}
                                    className="h-6 px-2 rounded-md text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Global Chat
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-none scroll-smooth">
                        {activeChat.messages.map((msg: { role: string, content: string, hasSummary?: boolean }, i: number) => {
                            // Helper to parse potential JSON content from the AI
                            const getContent = (content: string) => {
                                try {
                                    if (content.trim().startsWith('[')) {
                                        const parsed = JSON.parse(content);
                                        if (Array.isArray(parsed)) {
                                            return parsed.map(item => item.text || '').join('');
                                        }
                                    }
                                } catch (e) {
                                    // Not JSON or failed to parse, use original
                                }
                                return content;
                            };

                            const displayContent = getContent(msg.content);

                            return (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] text-[12px] leading-relaxed break-words whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-2xl rounded-tr-sm shadow-sm font-medium'
                                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-2xl rounded-tl-sm border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            displayContent
                                        ) : (
                                            <div className="prose dark:prose-invert prose-xs max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {displayContent}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                    {/* View Summary Button */}
                                    {msg.hasSummary && summaryData && (
                                        <button
                                            onClick={() => setShowSummaryModal(true)}
                                            className="mt-1.5 px-3 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors flex items-center gap-1.5"
                                        >
                                            <FileText className="size-3" />
                                            View Summary
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-2">
                            {activeChatId !== 'initial' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setActiveChatId('initial')}
                                    className="h-8 w-8 shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    title="Switch to Global Chat"
                                >
                                    <ArrowLeftRight className="size-4" />
                                </Button>
                            )}
                            <div className="relative flex-1 flex items-end">
                                {showMentions && filteredFiles.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-1 duration-100">
                                        <div className="py-1 max-h-48 overflow-y-auto scrollbar-minimal">
                                            {filteredFiles.map((file, idx) => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => selectMention(file.name)}
                                                    onMouseEnter={() => setMentionIndex(idx)}
                                                    className={`w-full px-3 py-1.5 text-left transition-colors ${mentionIndex === idx ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                                        }`}
                                                >
                                                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate block">{file.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <textarea
                                    value={message}
                                    onChange={(e) => {
                                        handleMessageChange(e.target.value);
                                        // Auto-resize height
                                        e.target.style.height = '32px';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                    }}
                                    onKeyDown={(e) => {
                                        if (showMentions && filteredFiles.length > 0) {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setMentionIndex(prev => (prev + 1) % filteredFiles.length);
                                                return;
                                            }
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
                                                return;
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                selectMention(filteredFiles[mentionIndex].name);
                                                return;
                                            }
                                            if (e.key === 'Escape') {
                                                setShowMentions(false);
                                                return;
                                            }
                                        }

                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                            // Reset height
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = '32px';
                                        }
                                    }}
                                    placeholder={`Message "${project?.name || activeChat.title}"...`}
                                    className="w-full min-h-[32px] max-h-[200px] py-[7px] pl-3 pr-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400 text-[11px] resize-none overflow-y-auto scrollbar-minimal outline-none"
                                    rows={1}
                                    disabled={isWaitingForResponse}
                                />
                                <button
                                    onClick={() => {
                                        handleSend();
                                        // Reset height of the textarea if we can find it
                                        const textarea = document.querySelector('textarea');
                                        if (textarea) textarea.style.height = '32px';
                                    }}
                                    disabled={isWaitingForResponse}
                                    className="absolute right-2 bottom-1.5 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
                                >
                                    <Send className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Modal - Full Page Overlay */}
            {showSummaryModal && summaryData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div
                        ref={summaryReportRef}
                        className="bg-white dark:bg-zinc-950 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[85%] h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-950">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                                    <FileText className="size-5 text-zinc-900 dark:text-zinc-100" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
                                        Data Analysis Report
                                    </h3>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {summaryData.datasetName} • Generated on {new Date().toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={exportSummaryAsPDF}
                                    className="gap-2"
                                >
                                    <Download className="size-4" />
                                    Export PDF
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowSummaryModal(false)}
                                >
                                    <X className="size-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
                            <div className="max-w-5xl mx-auto space-y-8">

                                {/* 1. Dataset Overview */}
                                <section>
                                    <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Dataset Overview</h4>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <div className="text-zinc-500 text-xs mb-1">Total Rows</div>
                                            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                                                {summaryData.overview.rowCount.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <div className="text-zinc-500 text-xs mb-1">Total Columns</div>
                                            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                                                {summaryData.overview.columnCount}
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <div className="text-zinc-500 text-xs mb-1">Duplicate Rows</div>
                                            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                                                {summaryData.duplicateRows.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-zinc-400 mt-1">
                                                {((summaryData.duplicateRows / summaryData.overview.rowCount) * 100).toFixed(1)}% of total
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <div className="text-zinc-500 text-xs mb-1">Column Types</div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-500">Numeric</span>
                                                    <span className="font-medium">{summaryData.overview.numericColumns.length}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-500">Categorical</span>
                                                    <span className="font-medium">{summaryData.overview.categoricalColumns.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. Visual Analysis (Charts) */}
                                {summaryData.chartConfigs && summaryData.chartConfigs.length > 0 && (
                                    <section>
                                        <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Visual Analysis</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {summaryData.chartConfigs.map((config, idx) => (
                                                <div key={idx} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                                                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                                        <h5 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                            {config.label}
                                                        </h5>
                                                    </div>
                                                    <div className="p-4 h-[300px]">
                                                        {(() => {
                                                            const { type, props } = config.chartData;
                                                            switch (type) {
                                                                case 'histogram_chart': return <HistogramChart {...(props as any)} />;
                                                                case 'bar_chart': return <BarChart {...(props as any)} />;
                                                                case 'scatter_chart': return <ScatterChart {...(props as any)} />;
                                                                case 'correlation_heatmap': return <CorrelationHeatmap {...(props as any)} />;
                                                                case 'line_chart': return <LineChart {...(props as any)} />;
                                                                case 'pie_chart': return <PieChart {...(props as any)} />;
                                                                case 'area_chart': return <AreaChart {...(props as any)} />;
                                                                case 'boxplot_chart': return <BoxPlotChart {...(props as any)} />;
                                                                case 'treemap_chart': return <TreemapChart {...(props as any)} />;
                                                                case 'stacked_bar_chart': return <StackedBarChart {...(props as any)} />;
                                                                default: return <div className="flex items-center justify-center h-full text-zinc-400">Chart type not supported</div>;
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-2 gap-8">
                                    {/* 3. Missing Data */}
                                    <section>
                                        <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Missing Data</h4>
                                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                            {summaryData.missingData.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                                            <th className="px-4 py-2 text-left font-medium text-zinc-500">Column</th>
                                                            <th className="px-4 py-2 text-right font-medium text-zinc-500">Missing</th>
                                                            <th className="px-4 py-2 text-right font-medium text-zinc-500">%</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                        {summaryData.missingData.slice(0, 5).map((item, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">{item.column}</td>
                                                                <td className="px-4 py-2 text-right text-zinc-500">{item.count}</td>
                                                                <td className="px-4 py-2 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <span className={`font-medium ${item.percentage > 30 ? 'text-red-500' :
                                                                            item.percentage > 5 ? 'text-amber-500' : 'text-zinc-500'
                                                                            }`}>
                                                                            {item.percentage.toFixed(1)}%
                                                                        </span>
                                                                        <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full ${item.percentage > 30 ? 'bg-red-500' :
                                                                                    item.percentage > 5 ? 'bg-amber-500' : 'bg-green-500'
                                                                                    }`}
                                                                                style={{ width: `${item.percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-zinc-500">
                                                    <CheckCircle className="size-8 mx-auto mb-2 text-green-500/50" />
                                                    <p>No missing data detected</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* 4. Outliers */}
                                    <section>
                                        <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Outliers Detected</h4>
                                        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                            {summaryData.outliers.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                                            <th className="px-4 py-2 text-left font-medium text-zinc-500">Column</th>
                                                            <th className="px-4 py-2 text-right font-medium text-zinc-500">Count</th>
                                                            <th className="px-4 py-2 text-right font-medium text-zinc-500">%</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                        {summaryData.outliers.slice(0, 5).map((item, i) => (
                                                            <tr key={i}>
                                                                <td className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">{item.column}</td>
                                                                <td className="px-4 py-2 text-right text-zinc-500">{item.count}</td>
                                                                <td className="px-4 py-2 text-right text-zinc-500">
                                                                    {item.percentage.toFixed(1)}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-8 text-center text-zinc-500">
                                                    <CheckCircle className="size-8 mx-auto mb-2 text-green-500/50" />
                                                    <p>No significant outliers detected</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

// Main export that wraps with TamboThreadProvider
export default function ProjectPage() {
    return (
        <TamboThreadProvider streaming={true}>
            <ProjectPageContent />
        </TamboThreadProvider>
    );
}
