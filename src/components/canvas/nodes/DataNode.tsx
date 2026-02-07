'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { BarChart3, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';


export type DataNodeData = {
    label: string;
    type?: string;
};

export type DataNodeType = Node<DataNodeData, 'dataNode'>;


export const DataNode = memo(({ data, selected }: NodeProps<DataNodeType>) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-zinc-400 border-2 border-white dark:border-zinc-900" />

            <div
                className={`flex flex-col w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm transition-all duration-200 overflow-hidden ${selected
                    ? 'border-2 border-blue-500 ring-4 ring-blue-500/10'
                    : 'border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
            >
                {/* Header / Title Area */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1 rounded-md ${selected ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            <BarChart3 className="size-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 leading-none truncate">{data.label}</span>
                            <span className="text-[9px] text-zinc-400 uppercase tracking-wide font-medium truncate">{data.type || 'Data Source'}</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-6 px-2 text-[10px] gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="size-3" />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye className="size-3" />
                                View
                            </>
                        )}
                    </Button>
                </div>

                {/* Content / Preview Area (Expanded only) */}
                {isExpanded && (
                    <div className="p-4 bg-zinc-50/30 dark:bg-zinc-900/30 flex flex-col items-center justify-center min-h-[100px] border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-xs text-zinc-400 text-center italic mb-2">
                            Interactive visualization coming soon
                        </p>
                        <div className="w-full h-20 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                            <BarChart3 className="size-6 text-zinc-300 dark:text-zinc-600 opacity-50" />
                        </div>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-zinc-400 border-2 border-white dark:border-zinc-900" />
        </>
    );
});

DataNode.displayName = 'DataNode';
