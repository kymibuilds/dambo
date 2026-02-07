'use client';

import { memo, useState, useRef, useCallback, ReactNode } from 'react';
import { Handle, Position, NodeProps, type Node, NodeResizer, useReactFlow } from '@xyflow/react';
import { BarChart3, MoreHorizontal, Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { HistogramChart, BarChart, ScatterChart, CorrelationHeatmap } from '@/components/charts';

// Chart type definitions
export type ChartType = 'histogram_chart' | 'bar_chart' | 'scatter_chart' | 'correlation_heatmap';

export interface ChartData {
    type: ChartType;
    props: Record<string, unknown>;
}

export type DataNodeData = {
    label: string;
    chartData?: ChartData;
};

export type DataNodeType = Node<DataNodeData, 'dataNode'>;

// Render chart based on type
function renderChart(chartData: ChartData): ReactNode {
    const { type, props } = chartData;

    switch (type) {
        case 'histogram_chart':
            return <HistogramChart {...(props as { column: string; bins: number[]; counts: number[] })} />;
        case 'bar_chart':
            return <BarChart {...(props as { column: string; categories: string[]; counts: number[] })} />;
        case 'scatter_chart':
            return <ScatterChart {...(props as { x_label: string; y_label: string; x: number[]; y: number[] })} />;
        case 'correlation_heatmap':
            return <CorrelationHeatmap {...(props as { columns: string[]; matrix: number[][] })} />;
        default:
            return null;
    }
}

export const DataNode = memo(({ id, data, selected }: NodeProps<DataNodeType>) => {
    const [isEditing, setIsEditing] = useState(false);
    const [label, setLabel] = useState(data.label);
    const [showMenu, setShowMenu] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const { deleteElements } = useReactFlow();

    const downloadImage = useCallback((format: 'png' | 'jpeg') => {
        if (nodeRef.current === null) {
            return;
        }

        const method = format === 'png' ? toPng : toJpeg;

        method(nodeRef.current, { cacheBust: true, backgroundColor: '#ffffff' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${label || 'node'}.${format}`;
                link.href = dataUrl;
                link.click();
                setShowMenu(false);
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [label]);

    const hasChart = !!data.chartData;

    return (
        <>
            <NodeResizer
                minWidth={250}
                minHeight={150}
                isVisible={selected}
                lineClassName="border-blue-400"
                handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
            />

            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-400 border-2 border-white dark:border-zinc-900" />

            <div
                ref={nodeRef}
                className={`flex flex-col w-full h-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm transition-all duration-200 ${selected
                    ? 'border-2 border-blue-500 ring-4 ring-blue-500/10'
                    : 'border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
            >
                {/* Header / Title Area */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex flex-col min-w-0 flex-1">
                            {isEditing ? (
                                <input
                                    autoFocus
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    onBlur={() => setIsEditing(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditing(false);
                                        }
                                    }}
                                    className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                                />
                            ) : (
                                <span
                                    onDoubleClick={() => setIsEditing(true)}
                                    className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none truncate cursor-text"
                                >
                                    {label}
                                </span>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <MoreHorizontal className="size-4" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadImage('png');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <ImageIcon className="size-3.5" />
                                        Download PNG
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadImage('jpeg');
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <Download className="size-3.5" />
                                        Download JPG
                                    </button>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteElements({ nodes: [{ id }] });
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Delete Node
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content / Chart Area */}
                <div className="flex-1 p-2 bg-zinc-50/30 dark:bg-zinc-900/30 flex flex-col min-h-0 rounded-b-xl overflow-auto">
                    {hasChart ? (
                        <div className="w-full h-full">
                            {renderChart(data.chartData!)}
                        </div>
                    ) : (
                        <div className="w-full h-full bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                            <BarChart3 className="size-8 text-zinc-300 dark:text-zinc-600 opacity-50" />
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-400 border-2 border-white dark:border-zinc-900" />
        </>
    );
});

DataNode.displayName = 'DataNode';
