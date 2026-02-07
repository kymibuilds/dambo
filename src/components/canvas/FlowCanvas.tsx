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
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
        style: { width: 300 },
    },
    {
        id: '2',
        position: { x: 600, y: 150 },
        data: { label: 'Revenue Transformation' },
        type: 'dataNode',
        style: { width: 300 },
    },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2', animated: true }];


interface FlowCanvasProps {
    onNodeSelect?: (node: Node | null) => void;
}

export default function FlowCanvas({ onNodeSelect }: FlowCanvasProps) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        if (onNodeSelect) {
            const selectedNode = nodes.length > 0 ? nodes[0] : null;
            onNodeSelect(selectedNode);
        }
    }, [onNodeSelect]);

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-zinc-900">
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
        </div>
    );
}
