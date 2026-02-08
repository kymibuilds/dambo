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
            }
        },
        [setEdges, nodes, setNodes],
    );

    // Calculate position for new nodes based on existing ones
    const getNewNodePosition = useCallback(() => {
        if (nodes.length === 0) {
            return { x: 100, y: 100 };
        }
        // Place new node to the right of the last node
        const lastNode = nodes[nodes.length - 1];
        return {
            x: (lastNode.position?.x || 100) + 350,
            y: lastNode.position?.y || 100,
        };
    }, [nodes]);

    const addChartNode = useCallback((label: string, chartData: ChartData): string => {
        const id = Math.random().toString(36).substring(7);
        const position = getNewNodePosition();
        const newNode: DataNodeType = {
            id,
            position,
            data: { label, chartData },
            type: 'dataNode',
            style: { width: 900, height: 600 },
        };
        setNodes((nds) => [...nds, newNode]);
        return id;
    }, [setNodes, getNewNodePosition]);

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

    // Add multiple chart nodes in a grid layout
    const addMultipleChartNodes = useCallback((configs: ChartNodeConfig[]): string[] => {
        if (configs.length === 0) return [];

        const NODE_WIDTH = 900;
        const NODE_HEIGHT = 600;
        const HORIZONTAL_GAP = 50;
        const VERTICAL_GAP = 50;
        const COLUMNS = 2;

        // Find the starting position based on existing nodes
        const startX = nodes.length === 0 ? 100 : Math.max(...nodes.map(n => n.position.x)) + NODE_WIDTH + HORIZONTAL_GAP;
        const startY = nodes.length === 0 ? 100 : Math.min(...nodes.map(n => n.position.y));

        const newNodes: DataNodeType[] = configs.map((config, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;
            const id = Math.random().toString(36).substring(7);

            return {
                id,
                position: {
                    x: startX + col * (NODE_WIDTH + HORIZONTAL_GAP),
                    y: startY + row * (NODE_HEIGHT + VERTICAL_GAP),
                },
                data: { label: config.label, chartData: config.chartData },
                type: 'dataNode',
                style: { width: NODE_WIDTH, height: NODE_HEIGHT },
            };
        });

        setNodes((nds) => [...nds, ...newNodes]);
        return newNodes.map(n => n.id);
    }, [nodes, setNodes]);

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

    // Add analysis cluster: center parent node with chart nodes radiating outward
    const addAnalysisCluster = useCallback((datasetName: string, configs: ChartNodeConfig[]): { parentId: string; childIds: string[] } => {
        const CHART_NODE_WIDTH = 900;
        const CHART_NODE_HEIGHT = 600;
        const PARENT_WIDTH = 250;
        const PARENT_HEIGHT = 100;
        const RADIUS = 800; // Distance from parent to child nodes (increased for larger nodes)

        // Calculate center position based on existing nodes
        const centerX = nodes.length === 0 ? 600 : Math.max(...nodes.map(n => n.position.x)) + 700;
        const centerY = nodes.length === 0 ? 400 : 400;

        // Create parent node (dataset name)
        const parentId = Math.random().toString(36).substring(7);
        const parentNode: DataNodeType = {
            id: parentId,
            position: { x: centerX - PARENT_WIDTH / 2, y: centerY - PARENT_HEIGHT / 2 },
            data: { label: `📊 ${datasetName}` },
            type: 'dataNode',
            style: { width: PARENT_WIDTH, height: PARENT_HEIGHT },
        };

        // Create chart nodes in a radial layout around the parent
        const childNodes: DataNodeType[] = configs.map((config, index) => {
            const angle = (2 * Math.PI * index) / configs.length - Math.PI / 2; // Start from top
            const childId = Math.random().toString(36).substring(7);
            return {
                id: childId,
                position: {
                    x: centerX + RADIUS * Math.cos(angle) - CHART_NODE_WIDTH / 2,
                    y: centerY + RADIUS * Math.sin(angle) - CHART_NODE_HEIGHT / 2,
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

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        addChartNode,
        addEmptyNode,
        addMultipleChartNodes,
        addEdgeBetweenNodes,
        addAnalysisCluster,
        getNodeCount,
        getState,
        clearCanvas,
        setInitialState,
    }), [addChartNode, addEmptyNode, addMultipleChartNodes, addEdgeBetweenNodes, addAnalysisCluster, getNodeCount, getState, clearCanvas, setInitialState]);

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
