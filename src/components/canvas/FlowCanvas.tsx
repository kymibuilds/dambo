'use client';

import React, { useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ReactFlowProvider,
    BackgroundVariant,
    useReactFlow,
    type Node,
    type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Zap, Loader2, Trash2 } from 'lucide-react';
import { DataNode, type DataNodeType, type ChartData } from './nodes/DataNode';

const nodeTypes = {
    dataNode: DataNode,
};

const initialNodes: DataNodeType[] = [];
const initialEdges: { id: string; source: string; target: string; animated?: boolean }[] = [];

export interface ChartNodeConfig {
    label: string;
    chartData: ChartData;
}

export interface FlowCanvasRef {
    addChartNode: (label: string, chartData: ChartData) => string;
    addEmptyNode: (label: string) => string;
    addMultipleChartNodes: (configs: ChartNodeConfig[]) => string[];
    addEdgeBetweenNodes: (sourceId: string, targetId: string, animated?: boolean) => void;
    addAnalysisCluster: (datasetName: string, configs: ChartNodeConfig[]) => { parentId: string; childIds: string[] };
    updateNodeChartData: (nodeId: string, label: string, chartData: ChartData) => boolean;
    getNodeCount: () => number;
    getState: () => { nodes: DataNodeType[]; edges: Edge[] };
    clearCanvas: () => void;
    setInitialState: (nodes: DataNodeType[], edges: Edge[]) => void;
}

interface FlowCanvasProps {
    onNodeSelect?: (node: Node | null) => void;
    onQuickAnalysis?: () => void;
    isQuickAnalysisLoading?: boolean;
    isQuickAnalysisDisabled?: boolean;
    onStateChange?: (nodes: DataNodeType[], edges: Edge[]) => void;
    onClearCanvas?: () => void;
}

const FlowMain = forwardRef<FlowCanvasRef, FlowCanvasProps>(({ onNodeSelect, onQuickAnalysis, isQuickAnalysisLoading, isQuickAnalysisDisabled, onStateChange, onClearCanvas }, ref) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<DataNodeType>(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { setCenter } = useReactFlow();

    // Notify parent of state changes for persistence
    useEffect(() => {
        if (onStateChange && (nodes.length > 0 || edges.length > 0)) {
            onStateChange(nodes as DataNodeType[], edges);
        }
    }, [nodes, edges, onStateChange]);

    const onConnect = useCallback(
        async (params: Connection) => {
            // Add the edge first
            setEdges((eds) => addEdge(params, eds));

            // Check if both source and target are chart nodes
            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);

            if (sourceNode?.data?.chartData && targetNode?.data?.chartData) {
                // Both nodes have charts - create comparison
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/charts/compare`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chart1: sourceNode.data.chartData,
                            chart2: targetNode.data.chartData,
                            datasetId: sourceNode.data.chartData.props?.datasetId
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();

                        // Create comparison node between the two connected nodes
                        const midX = ((sourceNode.position?.x || 0) + (targetNode.position?.x || 0)) / 2;
                        const maxY = Math.max(sourceNode.position?.y || 0, targetNode.position?.y || 0);

                        const comparisonId = Math.random().toString(36).substring(7);
                        const comparisonNode: DataNodeType = {
                            id: comparisonId,
                            position: { x: midX, y: maxY + 650 },
                            data: {
                                label: result.comparison?.comparison_title || 'Comparison',
                                chartData: {
                                    type: 'comparison_insight' as any,
                                    props: {
                                        insights: result.comparison?.key_insights || [],
                                        relationship: result.comparison?.relationship_type || 'mixed',
                                        recommendation: result.comparison?.recommendation || '',
                                        statistical_notes: result.comparison?.statistical_notes || '',
                                        visualization_suggestion: result.comparison?.visualization_suggestion,
                                        chart1Label: sourceNode.data.label,
                                        chart2Label: targetNode.data.label
                                    }
                                }
                            },
                            type: 'dataNode',
                            style: { width: 500, height: 350 },
                        };

                        setNodes((nds) => [...nds, comparisonNode]);

                        // Connect both charts to the comparison node
                        setEdges((eds) => [
                            ...eds,
                            { id: `${params.source}-${comparisonId}`, source: params.source!, target: comparisonId, animated: true },
                            { id: `${params.target}-${comparisonId}`, source: params.target!, target: comparisonId, animated: true }
                        ]);
                    }
                } catch (e) {
                    console.error('Failed to generate comparison:', e);
                }
            } else if (sourceNode?.data?.chartData && targetNode && !targetNode.data.chartData) {
                // Connecting a chart to an empty node
                // Check if this empty node now has 2 valid chart sources (including this current connection)
                const existingIncomingEdges = edges.filter(e => e.target === params.target);
                const chartSources = existingIncomingEdges
                    .map(e => nodes.find(n => n.id === e.source))
                    .filter(n => n?.data?.chartData);

                // Add the current source
                if (sourceNode) chartSources.push(sourceNode);

                if (chartSources.length === 2) {
                    // We have exactly 2 charts feeding into this empty node -> Trigger Comparison!
                    const chart1 = chartSources[0]!;
                    const chart2 = chartSources[1]!;

                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/charts/compare`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chart1: chart1.data.chartData,
                                chart2: chart2.data.chartData,
                                datasetId: chart1.data.chartData?.props?.datasetId
                            })
                        });

                        if (response.ok) {
                            const result = await response.json();

                            // Update the TARGET node with comparison data
                            setNodes((nds) => nds.map(n => {
                                if (n.id === params.target) {
                                    return {
                                        ...n,
                                        data: {
                                            ...n.data,
                                            label: result.comparison?.comparison_title || 'Comparison Insight',
                                            chartData: {
                                                type: 'comparison_insight' as any,
                                                props: {
                                                    insights: result.comparison?.key_insights || [],
                                                    relationship: result.comparison?.relationship_type || 'mixed',
                                                    recommendation: result.comparison?.recommendation || '',
                                                    statistical_notes: result.comparison?.statistical_notes || '',
                                                    visualization_suggestion: result.comparison?.visualization_suggestion,
                                                    chart1Label: chart1.data.label,
                                                    chart2Label: chart2.data.label
                                                }
                                            }
                                        },
                                        style: { ...n.style, width: 500, height: 350 }
                                    };
                                }
                                return n;
                            }));
                        }
                    } catch (e) {
                        console.error('Failed to generate comparison for target node:', e);
                    }
                }
            }
        },
        [setEdges, nodes, setNodes, edges],
    );

    // Constants for node dimensions
    const DEFAULT_NODE_WIDTH = 900;
    const DEFAULT_NODE_HEIGHT = 600;
    const GAP = 50; // Gap between nodes

    // Check if a position overlaps with any existing node
    const doesOverlap = useCallback((x: number, y: number, width: number, height: number, existingNodes: DataNodeType[]): boolean => {
        for (const node of existingNodes) {
            const nodeWidth = (node.style?.width as number) || DEFAULT_NODE_WIDTH;
            const nodeHeight = (node.style?.height as number) || DEFAULT_NODE_HEIGHT;

            const nodeLeft = node.position.x;
            const nodeRight = node.position.x + nodeWidth;
            const nodeTop = node.position.y;
            const nodeBottom = node.position.y + nodeHeight;

            const newLeft = x;
            const newRight = x + width;
            const newTop = y;
            const newBottom = y + height;

            // Check for overlap (with GAP margin)
            if (!(newRight + GAP <= nodeLeft ||
                newLeft >= nodeRight + GAP ||
                newBottom + GAP <= nodeTop ||
                newTop >= nodeBottom + GAP)) {
                return true;
            }
        }
        return false;
    }, []);

    // Calculate position for new nodes based on existing ones - avoids overlap
    const getNewNodePosition = useCallback((width: number = DEFAULT_NODE_WIDTH, height: number = DEFAULT_NODE_HEIGHT) => {
        if (nodes.length === 0) {
            return { x: 100, y: 100 };
        }

        // Find the bounding box of all existing nodes
        let maxX = 0;
        let minY = Infinity;

        for (const node of nodes) {
            const nodeWidth = (node.style?.width as number) || DEFAULT_NODE_WIDTH;
            maxX = Math.max(maxX, node.position.x + nodeWidth);
            minY = Math.min(minY, node.position.y);
        }

        // Try positions: first to the right of existing nodes
        let candidateX = maxX + GAP;
        let candidateY = minY;

        // If that position would overlap, try grid-based positions
        if (doesOverlap(candidateX, candidateY, width, height, nodes)) {
            // Try a grid-based approach
            const COLS = 3;
            const startX = 100;
            const startY = 100;

            for (let row = 0; row < 100; row++) { // Limit iterations
                for (let col = 0; col < COLS; col++) {
                    const testX = startX + col * (DEFAULT_NODE_WIDTH + GAP);
                    const testY = startY + row * (DEFAULT_NODE_HEIGHT + GAP);

                    if (!doesOverlap(testX, testY, width, height, nodes)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }

        return { x: candidateX, y: candidateY };
    }, [nodes, doesOverlap]);

    const addChartNode = useCallback((label: string, chartData: ChartData): string => {
        const id = Math.random().toString(36).substring(7);
        const position = getNewNodePosition();
        const nodeWidth = 900;
        const nodeHeight = 600;
        const newNode: DataNodeType = {
            id,
            position,
            data: { label, chartData },
            type: 'dataNode',
            style: { width: nodeWidth, height: nodeHeight },
        };
        setNodes((nds) => [...nds, newNode]);

        // Auto-pan to center on the new node
        setTimeout(() => {
            setCenter(position.x + nodeWidth / 2, position.y + nodeHeight / 2, { zoom: 0.6, duration: 500 });
        }, 100);

        return id;
    }, [setNodes, getNewNodePosition, setCenter]);

    const addEmptyNode = useCallback((label: string = 'New Visualization'): string => {
        const id = Math.random().toString(36).substring(7);
        const position = getNewNodePosition();
        const newNode: DataNodeType = {
            id,
            position,
            data: { label },
            type: 'dataNode',
            style: { width: 600, height: 500 },
        };
        setNodes((nds) => [...nds, newNode]);
        return id;
    }, [setNodes, getNewNodePosition]);

    // Add multiple chart nodes in a grid layout - row-major (2-3 per row), moving vertically
    const addMultipleChartNodes = useCallback((configs: ChartNodeConfig[]): string[] => {
        if (configs.length === 0) return [];

        const NODE_WIDTH = DEFAULT_NODE_WIDTH;
        const NODE_HEIGHT = DEFAULT_NODE_HEIGHT;
        const COLS = 2; // 2-3 charts per row, then next row

        // Find the bounding box of all existing nodes
        let maxY = 0;
        let minX = 100;

        if (nodes.length > 0) {
            for (const node of nodes) {
                const nodeHeight = (node.style?.height as number) || DEFAULT_NODE_HEIGHT;
                maxY = Math.max(maxY, node.position.y + nodeHeight);
                minX = Math.min(minX, node.position.x);
            }
        }

        const startX = minX;
        const startY = nodes.length === 0 ? 100 : maxY + GAP;

        const newNodes: DataNodeType[] = configs.map((config, index) => {
            // Row-major: fill columns first, then move to next row
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            const id = Math.random().toString(36).substring(7);

            return {
                id,
                position: {
                    x: startX + col * (NODE_WIDTH + GAP),
                    y: startY + row * (NODE_HEIGHT + GAP),
                },
                data: { label: config.label, chartData: config.chartData },
                type: 'dataNode',
                style: { width: NODE_WIDTH, height: NODE_HEIGHT },
            };
        });

        setNodes((nds) => [...nds, ...newNodes]);

        // Auto-pan to show the first new node
        if (newNodes.length > 0) {
            const firstNode = newNodes[0];
            setTimeout(() => {
                setCenter(
                    firstNode.position.x + NODE_WIDTH / 2,
                    firstNode.position.y + NODE_HEIGHT / 2,
                    { zoom: 0.5, duration: 500 }
                );
            }, 100);
        }

        return newNodes.map(n => n.id);
    }, [nodes, setNodes, setCenter]);

    // Add an edge between two nodes
    const addEdgeBetweenNodes = useCallback((sourceId: string, targetId: string, animated: boolean = false): void => {
        const edgeId = `e-${sourceId}-${targetId}`;
        setEdges((eds) => [
            ...eds,
            { id: edgeId, source: sourceId, target: targetId, animated },
        ]);
    }, [setEdges]);

    // Get current node count
    const getNodeCount = useCallback((): number => {
        return nodes.length;
    }, [nodes]);

    // Get current state for persistence
    const getState = useCallback(() => {
        return { nodes: nodes as DataNodeType[], edges };
    }, [nodes, edges]);

    // Clear all nodes and edges
    const clearCanvas = useCallback(() => {
        setNodes([]);
        setEdges([]);
        if (onClearCanvas) {
            onClearCanvas();
        }
    }, [setNodes, setEdges, onClearCanvas]);

    // Set initial state from persistence
    const setInitialState = useCallback((initialNodes: DataNodeType[], initialEdges: Edge[]) => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges]);

    // Add analysis cluster: center parent node with chart nodes in grid below
    const addAnalysisCluster = useCallback((datasetName: string, configs: ChartNodeConfig[]): { parentId: string; childIds: string[] } => {
        const CHART_NODE_WIDTH = DEFAULT_NODE_WIDTH;
        const CHART_NODE_HEIGHT = DEFAULT_NODE_HEIGHT;
        const PARENT_WIDTH = 300;
        const PARENT_HEIGHT = 80;
        const COLUMNS = 2;

        // Find the bounding box of all existing nodes
        let maxX = 0;
        let minY = 100;

        if (nodes.length > 0) {
            for (const node of nodes) {
                const nodeWidth = (node.style?.width as number) || DEFAULT_NODE_WIDTH;
                maxX = Math.max(maxX, node.position.x + nodeWidth);
                minY = Math.min(minY, node.position.y);
            }
        }

        // Place parent node
        const parentX = nodes.length === 0 ? 100 : maxX + GAP;
        const parentY = minY;

        // Create parent node (dataset name)
        const parentId = Math.random().toString(36).substring(7);
        const parentNode: DataNodeType = {
            id: parentId,
            position: { x: parentX, y: parentY },
            data: { label: `📊 ${datasetName}` },
            type: 'dataNode',
            style: { width: PARENT_WIDTH, height: PARENT_HEIGHT },
        };

        // Create chart nodes in a grid layout below and to the right of parent
        const chartsStartX = parentX;
        const chartsStartY = parentY + PARENT_HEIGHT + GAP;

        const childNodes: DataNodeType[] = configs.map((config, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;
            const childId = Math.random().toString(36).substring(7);
            return {
                id: childId,
                position: {
                    x: chartsStartX + col * (CHART_NODE_WIDTH + GAP),
                    y: chartsStartY + row * (CHART_NODE_HEIGHT + GAP),
                },
                data: { label: config.label, chartData: config.chartData },
                type: 'dataNode',
                style: { width: CHART_NODE_WIDTH, height: CHART_NODE_HEIGHT },
            };
        });

        // Add all nodes
        setNodes((nds) => [...nds, parentNode, ...childNodes]);

        // Create edges from parent to each child
        const newEdges = childNodes.map(child => ({
            id: `e-${parentId}-${child.id}`,
            source: parentId,
            target: child.id,
            animated: true,
        }));
        setEdges((eds) => [...eds, ...newEdges]);

        return { parentId, childIds: childNodes.map(n => n.id) };
    }, [nodes, setNodes, setEdges]);

    // Update an existing node's chart data (for smart node chat)
    const updateNodeChartData = useCallback((nodeId: string, label: string, chartData: ChartData): boolean => {
        const existingNode = nodes.find(n => n.id === nodeId);
        if (!existingNode) return false;

        setNodes((nds) => nds.map(n => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    data: { ...n.data, label, chartData }
                };
            }
            return n;
        }));

        // Auto-pan to the updated node
        const nodeWidth = (existingNode.style?.width as number) || DEFAULT_NODE_WIDTH;
        const nodeHeight = (existingNode.style?.height as number) || DEFAULT_NODE_HEIGHT;
        setTimeout(() => {
            setCenter(
                existingNode.position.x + nodeWidth / 2,
                existingNode.position.y + nodeHeight / 2,
                { zoom: 0.6, duration: 500 }
            );
        }, 100);

        return true;
    }, [nodes, setNodes, setCenter]);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        addChartNode,
        addEmptyNode,
        addMultipleChartNodes,
        addEdgeBetweenNodes,
        addAnalysisCluster,
        updateNodeChartData,
        getNodeCount,
        getState,
        clearCanvas,
        setInitialState,
    }), [addChartNode, addEmptyNode, addMultipleChartNodes, addEdgeBetweenNodes, addAnalysisCluster, updateNodeChartData, getNodeCount, getState, clearCanvas, setInitialState]);

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (onNodeSelect) {
            const selectedNode = nodes.length > 0 ? nodes[0] : null;
            onNodeSelect(selectedNode);
        }
    }, [onNodeSelect]);

    return (
        <div className="h-full w-full bg-zinc-50 dark:bg-[#09090b] relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                fitView
                className="bg-transparent"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="currentColor"
                    className="text-zinc-300 dark:text-zinc-800"
                />
                <Controls className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 fill-zinc-900 dark:fill-zinc-100" />
            </ReactFlow>

            {/* Top Action Button Overlay */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                <button
                    onClick={() => addEmptyNode()}
                    className="h-7 flex items-center gap-2 px-3 rounded-md bg-white/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all backdrop-blur-sm shadow-sm"
                >
                    <Plus className="size-3.5" />
                    <span className="text-xs font-medium">New Visualization</span>
                </button>
                {onQuickAnalysis && (
                    <button
                        onClick={onQuickAnalysis}
                        disabled={isQuickAnalysisLoading || isQuickAnalysisDisabled}
                        className="h-7 flex items-center gap-2 px-3 rounded-md bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-700 dark:border-zinc-600 text-white transition-all backdrop-blur-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isQuickAnalysisLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Zap className="size-3.5" />
                        )}
                        <span className="text-xs font-medium">Quick Analysis</span>
                    </button>
                )}
                {nodes.length > 0 && (
                    <button
                        onClick={clearCanvas}
                        className="h-7 flex items-center gap-2 px-3 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 transition-all backdrop-blur-sm shadow-sm"
                        title="Clear Canvas"
                    >
                        <span className="text-sm">🧹</span>
                    </button>
                )}
            </div>
        </div>
    );
});

FlowMain.displayName = 'FlowMain';

const FlowCanvas = forwardRef<FlowCanvasRef, FlowCanvasProps>((props, ref) => {
    return (
        <ReactFlowProvider>
            <FlowMain {...props} ref={ref} />
        </ReactFlowProvider>
    );
});

FlowCanvas.displayName = 'FlowCanvas';

export default FlowCanvas;
