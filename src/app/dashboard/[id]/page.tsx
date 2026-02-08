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
    Zap
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
import { extractChartColumnsWithCache } from "@/lib/gemini/geminiClient";
import { useQuickAnalysis } from "@/lib/hooks/useQuickAnalysis";
import type { QuickAnalysisData } from "@/lib/api/visualizations";

interface ProjectFile {
    id: string;
    name: string;
    type: string;
    size: string;
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
function extractColumnFromText(text: string, availableColumns: string[], chartType: string): { column?: string; x?: string; y?: string } {
    const textLower = text.toLowerCase();
    const result: { column?: string; x?: string; y?: string } = {};

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

    if (chartType === 'scatter_chart') {
        // For scatter, we need two columns - look for patterns like "x vs y", "x and y"
        // Get unique columns, maintaining order by score
        const uniqueColumns = [...new Set(scoredColumns.map(s => s.col))];

        if (uniqueColumns.length >= 2) {
            // Try to detect which comes first in the text (for x) and which comes second (for y)
            const first = scoredColumns[0];
            const second = scoredColumns.find(s => s.col !== first.col);
            if (first && second) {
                if (first.position <= second.position) {
                    result.x = first.col;
                    result.y = second.col;
                } else {
                    result.x = second.col;
                    result.y = first.col;
                }
            }
        } else if (uniqueColumns.length === 1) {
            result.x = uniqueColumns[0];
        }
    } else {
        // For bar/histogram, use the best matched column
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
    };

    const chartType = chartTypeMap[componentName];
    if (!chartType) return null;

    // Debug: Log what props we received from Tambo
    console.log('[DEBUG] extractChartData - componentName:', componentName, 'props:', JSON.stringify(props));

    // Inject default datasetId if missing
    const enhancedProps = { ...props };
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
        } else if (chartType === 'bar_chart' || chartType === 'histogram_chart') {
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
            messages: [{ role: 'assistant', content: "Hello! I've analyzed your dataset. You can ask me to visualize trends, filter data, or generate a custom UI component based on your performance metrics." }]
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
                            { role: 'assistant', content: "Hello! I've analyzed your dataset. You can ask me to visualize trends, filter data, or generate a custom UI component based on your performance metrics." },
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
                                ((chartType === 'bar_chart' || chartType === 'histogram_chart') && !props.column)
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
                                        const enhancedProps = { ...props };

                                        if (chartType === 'scatter_chart') {
                                            if (geminiResult.x && !props.x) {
                                                enhancedProps.x = geminiResult.x;
                                                console.log('[Gemini] Injected x:', geminiResult.x);
                                            }
                                            if (geminiResult.y && !props.y) {
                                                enhancedProps.y = geminiResult.y;
                                                console.log('[Gemini] Injected y:', geminiResult.y);
                                            }
                                        } else if (geminiResult.column && !props.column) {
                                            enhancedProps.column = geminiResult.column;
                                            console.log('[Gemini] Injected column:', geminiResult.column);
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

                        if (chartConfigs.length === 1) {
                            // Single chart - use simple addChartNode
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

        try {
            // Build rich context with dataset profiles for the AI
            const datasetsContext = projectFiles.map(f => {
                const profile = datasetProfiles[f.id];
                if (profile) {
                    return {
                        datasetId: f.id,
                        filename: f.name,
                        rowCount: profile.shape.row_count,
                        columnCount: profile.shape.column_count,
                        columns: profile.columns.map(c => ({
                            name: c.name,
                            type: c.detected_type,
                            missingPercentage: c.missing_percentage
                        })),
                        numericStats: profile.numeric_stats,
                        categoryStats: profile.category_stats,
                        samples: profile.samples
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
                    context.activeNode = {
                        id: activeChatId,
                        label: activeNodeChat.title,
                        isSpecificContext: true
                    };
                    console.log('[DEBUG] Added node context:', context.activeNode);
                }
            }

            console.log('[DEBUG] Sending to Tambo with context:', JSON.stringify(context, null, 2));

            // Track thread length before sending from node chat
            // Any new messages after this point belong to this node chat
            const threadLengthBefore = thread?.messages?.length || 0;
            const isNodeChat = activeChatId !== 'initial';

            await sendThreadMessage(userMessage, {
                additionalContext: context,
            });

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
                messages: [{ role: 'assistant', content: `Chatting with ${label}. How can I help?` }]
            };
            setLocalChats(prev => [...prev, newChat]);
        }
    };

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

            // Create enhanced summary context for Tambo with Gemini insights
            const summaryPrompt = buildSmartAnalysisSummaryPrompt(analysisResult);

            try {
                await sendThreadMessage(summaryPrompt, {
                    additionalContext: {
                        isQuickAnalysis: true,
                        analysisData: analysisResult,
                        instructions: `You are a senior data scientist providing a comprehensive quick analysis summary for ML engineers. Based on the provided structured analysis data, write a professional summary (6-10 sentences) covering:
                        
                        1. **Dataset Overview**: Size, structure, column types
                        2. **Data Quality**: Missing data issues, duplicates, outlier concerns (reference the data_quality score)
                        3. **Key Relationships**: Most interesting correlations and what scatter plots reveal
                        4. **ML Readiness**: Assessment and what needs attention
                        5. **Data Preparation Tips**: If gemini_insights is available, include specific actionable tips for:
                           - Feature engineering suggestions
                           - Encoding recommendations for categorical columns
                           - Scaling recommendations for numeric columns
                           - Columns to potentially drop (IDs, high-cardinality, etc.)
                        
                        Tone: professional, analytical, actionable. Use markdown formatting (bold for emphasis, bullet points for lists).
                        
                        You MAY use the 'data_prep_card' and 'feature_insights_card' components to display structured insights if they add value.
                        Do NOT render standard charts (histogram, bar, scatter) in this summary response - they are already displayed on the canvas.`
                    }
                });
            } catch (err) {
                console.error('[Quick Analysis] Failed to get Tambo summary:', err);
            }
        }
    };

    // Build an enhanced prompt for Tambo to summarize the analysis
    function buildSmartAnalysisSummaryPrompt(data: QuickAnalysisData): string {
        const { dataset_overview, strongest_correlations, ml_readiness, outlier_detection, missing_data_insights, scatter_recommendations, data_quality, gemini_insights } = data;
        const topCorr = strongest_correlations[0];
        const highMissing = missing_data_insights.columns_above_30_percent_missing;
        const totalOutlierPct = outlier_detection.length > 0
            ? (outlier_detection.reduce((sum, o) => sum + o.outlier_percentage, 0) / outlier_detection.length).toFixed(1)
            : '0';

        let prompt = `Provide a comprehensive analysis summary for ML data preparation:

**Dataset Overview:**
- Size: ${dataset_overview.row_count} rows × ${dataset_overview.column_count} columns
- Numeric columns (${dataset_overview.numeric_columns.length}): ${dataset_overview.numeric_columns.slice(0, 5).join(', ')}${dataset_overview.numeric_columns.length > 5 ? '...' : ''}
- Categorical columns (${dataset_overview.categorical_columns.length}): ${dataset_overview.categorical_columns.slice(0, 5).join(', ')}${dataset_overview.categorical_columns.length > 5 ? '...' : ''}
- Duplicates: ${dataset_overview.duplicate_rows} rows

**Data Quality:**
- Score: ${data_quality?.overall_score ?? 'N/A'}/100 (${data_quality?.level ?? 'Unknown'})
- Columns with >30% missing: ${highMissing.length > 0 ? highMissing.join(', ') : 'None'}
- Average outlier %: ${totalOutlierPct}%

**Key Relationships:**
- Strongest correlation: ${topCorr ? `${topCorr.column_a} ↔ ${topCorr.column_b} (${topCorr.correlation?.toFixed(3)})` : 'N/A'}
- Recommended scatter plots: ${scatter_recommendations?.slice(0, 2).map(r => `${r.x} vs ${r.y} (${r.insight})`).join('; ') || 'None'}

**ML Readiness:**
- Score: ${ml_readiness.readiness_score}/100 (${ml_readiness.readiness_level})`;

        // Add Gemini insights if available
        if (gemini_insights) {
            prompt += `

**AI-Powered Data Preparation Tips:**`;

            if (gemini_insights.data_prep_tips && gemini_insights.data_prep_tips.length > 0) {
                prompt += `
- ${gemini_insights.data_prep_tips.slice(0, 3).join('\n- ')}`;
            }

            if (gemini_insights.encoding_suggestions && gemini_insights.encoding_suggestions.length > 0) {
                const encodings = gemini_insights.encoding_suggestions.slice(0, 2);
                prompt += `

**Encoding Suggestions:** ${encodings.map(e => `${e.column} → ${e.method}`).join(', ')}`;
            }

            if (gemini_insights.feature_importance_hints && gemini_insights.feature_importance_hints.length > 0) {
                const targets = gemini_insights.feature_importance_hints.filter(h => h.role === 'target');
                const drops = gemini_insights.feature_importance_hints.filter(h => h.role === 'drop' || h.role === 'id');
                if (targets.length > 0) {
                    prompt += `
**Likely target columns:** ${targets.map(t => t.column).join(', ')}`;
                }
                if (drops.length > 0) {
                    prompt += `
**Consider dropping:** ${drops.map(d => d.column).join(', ')}`;
                }
            }

            if (gemini_insights.overall_assessment) {
                prompt += `

**Overall Assessment:** ${gemini_insights.overall_assessment}`;
            }
        }

        prompt += `

Summarize the above into a professional 6-10 sentence paragraph for a data scientist preparing this data for ML.`;

        return prompt;
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
                    />

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
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                    {project?.name || activeChat.title}
                                </h3>
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
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none scroll-smooth">
                        {activeChat.messages.map((msg: { role: string, content: string }, i: number) => {
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
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-sm font-medium'
                                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm'
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
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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
        </div>
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
