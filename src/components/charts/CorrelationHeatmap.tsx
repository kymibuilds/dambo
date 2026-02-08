'use client';

import { useEffect, useState } from 'react';
import { fetchCorrelation, type CorrelationData } from '@/lib/api/visualizations';
import { Loader2 } from 'lucide-react';

interface CorrelationHeatmapProps {
    datasetId: string;
}

// Returns a gradient color based on correlation value
function getHeatmapColor(value: number | null): string {
    if (value === null) return 'bg-gray-200 dark:bg-zinc-700';

    // Strong positive: vibrant green
    if (value >= 0.8) return 'bg-emerald-500';
    if (value >= 0.6) return 'bg-emerald-400';
    if (value >= 0.4) return 'bg-teal-400';
    if (value >= 0.2) return 'bg-teal-300';

    // Neutral: light gray
    if (value >= -0.2) return 'bg-slate-200 dark:bg-zinc-600';

    // Negative: orange to red
    if (value >= -0.4) return 'bg-orange-300';
    if (value >= -0.6) return 'bg-orange-400';
    if (value >= -0.8) return 'bg-red-400';
    return 'bg-red-500';
}

function getTextColor(value: number | null): string {
    if (value === null) return 'text-gray-500';
    if (Math.abs(value) >= 0.4) return 'text-white';
    return 'text-gray-700 dark:text-zinc-200';
}

export function CorrelationHeatmap({ datasetId }: CorrelationHeatmapProps) {
    const [data, setData] = useState<CorrelationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetchCorrelation(datasetId);
                setData(res);
                setError(null);
            } catch (err) {
                console.error(err);
                setError(`Failed to load correlation matrix`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId]);

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Loading matrix...
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-64 flex items-center justify-center text-red-500 bg-white dark:bg-zinc-900 rounded-xl">
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { columns, matrix } = data;

    if (columns.length === 0) {
        return (
            <div className="p-6 text-zinc-500 bg-white dark:bg-zinc-900 rounded-xl text-center">
                No numeric columns found for correlation analysis.
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-4 text-center">
                Correlation Matrix
            </h3>

            <div className="overflow-x-auto">
                <table className="text-xs mx-auto border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="p-1"></th>
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="p-2 text-zinc-600 dark:text-zinc-300 font-medium text-center min-w-[50px] max-w-[80px]"
                                    title={col}
                                >
                                    <span className="block truncate text-[11px]">
                                        {col.length > 10 ? col.substring(0, 10) + '…' : col}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((row, i) => (
                            <tr key={i}>
                                <td
                                    className="p-2 text-zinc-600 dark:text-zinc-300 font-medium text-right min-w-[60px] max-w-[100px]"
                                    title={columns[i]}
                                >
                                    <span className="block truncate text-[11px]">
                                        {columns[i].length > 12 ? columns[i].substring(0, 12) + '…' : columns[i]}
                                    </span>
                                </td>
                                {row.map((val, j) => (
                                    <td key={j} className="p-0.5">
                                        <div
                                            className={`w-11 h-11 rounded-lg flex items-center justify-center ${getHeatmapColor(val)} ${getTextColor(val)} transition-all duration-200 hover:scale-105 hover:shadow-md cursor-default`}
                                            title={`${columns[i]} ↔ ${columns[j]}: ${val !== null ? val.toFixed(3) : 'N/A'}`}
                                        >
                                            <span className="text-[11px] font-semibold">
                                                {val !== null ? val.toFixed(2) : '–'}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex justify-center items-center gap-6 mt-5 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-red-500 rounded shadow-sm"></div>
                        <span>−1</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-orange-400 rounded shadow-sm"></div>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-slate-200 dark:bg-zinc-600 rounded shadow-sm"></div>
                        <span>0</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-teal-400 rounded shadow-sm"></div>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <div className="w-4 h-4 bg-emerald-500 rounded shadow-sm"></div>
                        <span>+1</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
