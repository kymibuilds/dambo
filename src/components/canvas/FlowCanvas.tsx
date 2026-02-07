'use client';

import React, { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    useReactFlow,
    ReactFlowProvider,
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';
import { DataNode, type DataNodeType } from './nodes/DataNode';

const nodeTypes = {
    dataNode: DataNode,
};

const initialNodes: DataNodeType[] = [
    {
        id: '1',
        position: { x: 100, y: 100 },
        data: { label: 'User Traffic Source' },
        type: 'dataNode',
        style: { width: 300, height: 400 },
    },
    {
        id: '2',
        position: { x: 600, y: 150 },
        data: { label: 'Revenue Transformation' },
        type: 'dataNode',
        style: { width: 300, height: 400 },
    },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2', animated: true }];


interface FlowCanvasProps {
    onNodeSelect?: (node: Node | null) => void;
}

function FlowMain({ onNodeSelect }: FlowCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { screenToFlowPosition } = useReactFlow();

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const addNewNode = useCallback((position?: { x: number, y: number }, label: string = 'New Visualization') => {
        const id = Math.random().toString(36).substring(7);
        const newNode: DataNodeType = {
            id,
            position: position || { x: 100, y: 100 },
            data: { label },
            type: 'dataNode',
            selected: true,
            style: { width: 300, height: 400 },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes]);

    const onPaneDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            addNewNode(position);
        },
        [screenToFlowPosition, addNewNode]
    );

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (onNodeSelect) {
            const selectedNode = nodes.length > 0 ? nodes[0] : null;
            onNodeSelect(selectedNode);
        }
    }, [onNodeSelect]);

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-zinc-900 relative group/flow">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                // @ts-ignore - onPaneDoubleClick exists in @xyflow/react v12 but linting is failing here
                onPaneDoubleClick={onPaneDoubleClick}
                zoomOnDoubleClick={false}
                paneClickable={true}
                fitView
                className="bg-zinc-100 dark:bg-zinc-900"
            >
                <Background color="#71717a" gap={16} size={1} className="opacity-10" />
                <Controls className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 fill-zinc-900 dark:fill-zinc-100" />
            </ReactFlow>

            {/* Quick Actions Overlay */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover/flow:opacity-100 transition-opacity">
                <button
                    onClick={() => addNewNode()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all hover:shadow-md"
                >
                    <Plus className="size-3.5" />
                    New Node
                </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg text-[10px] text-zinc-400 font-medium pointer-events-none opacity-0 group-hover/flow:opacity-100 transition-opacity">
                Double click anywhere to add a node
            </div>
        </div>
    );
}

export default function FlowCanvas(props: FlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <FlowMain {...props} />
        </ReactFlowProvider>
    );
}
