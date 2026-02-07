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

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const addNewNode = useCallback((label: string = 'New Visualization') => {
        const id = Math.random().toString(36).substring(7);
        const newNode: DataNodeType = {
            id,
            position: { x: 250, y: 200 },
            data: { label },
            type: 'dataNode',
            selected: true,
            style: { width: 300, height: 400 },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [setNodes]);

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (onNodeSelect) {
            const selectedNode = nodes.length > 0 ? nodes[0] : null;
            onNodeSelect(selectedNode);
        }
    }, [onNodeSelect]);

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-zinc-900 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                fitView
                className="bg-zinc-100 dark:bg-zinc-900"
            >
                <Background color="#71717a" gap={16} size={1} className="opacity-10" />
                <Controls className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 fill-zinc-900 dark:fill-zinc-100" />
            </ReactFlow>

            {/* Top Action Button Overlay */}
            <div className="absolute top-3 left-1/2 -track-x-1/2 z-10 -translate-x-1/2">
                <button
                    onClick={() => addNewNode()}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-full shadow-lg text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="size-4" />
                    New Visualization
                </button>
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
