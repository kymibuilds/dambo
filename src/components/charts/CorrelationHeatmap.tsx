'use client';

import { useEffect, useState } from 'react';
import { fetchCorrelation, type CorrelationData } from '@/lib/api/visualizations';
import { Loader2 } from 'lucide-react';

interface CorrelationHeatmapProps {
    datasetId: string;
}

function getColor(value: number | null): string {
    if (value === null) return 'bg-zinc-800';
    if (value >= 0.7) return 'bg-emerald-500';
    if (value >= 0.3) return 'bg-emerald-700';
    if (value >= 0.1) return 'bg-emerald-900';
    if (value >= -0.1) return 'bg-zinc-800';
    if (value >= -0.3) return 'bg-rose-900';
    if (value >= -0.7) return 'bg-rose-700';
    return 'bg-rose-500';
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
                setError(`Failed to load correlation matrix (${datasetId || 'missing ID'})`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId]);

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading matrix...</div>;
    if (error) return <div className="h-64 flex items-center justify-center text-red-500">{error}</div>;
    if (!data) return null;

    const { columns, matrix } = data;

    if (columns.length === 0) return <div className="p-4 text-zinc-500">No numeric columns found.</div>;

    return (
        <div className="w-full bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 overflow-x-auto">
            <h3 className="text-sm font-medium text-zinc-300 mb-4 text-center">Correlation Matrix</h3>
            <table className="text-xs mx-auto">
                <thead>
                    <tr>
                        <th className="p-1"></th>
                        {columns.map((col) => (
                            <th key={col} className="p-1 text-zinc-400 font-normal truncate max-w-16" title={col}>
                                {col.length > 8 ? col.substring(0, 8) + '...' : col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.map((row, i) => (
                        <tr key={i}>
                            <td className="p-1 text-zinc-400 truncate max-w-16" title={columns[i]}>
                                {columns[i].length > 8 ? columns[i].substring(0, 8) + '...' : columns[i]}
                            </td>
                            {row.map((val, j) => (
                                <td key={j} className="p-0.5">
                                    <div
                                        className={`w-8 h-8 rounded flex items-center justify-center ${getColor(val)} transition-colors`}
                                        title={`${columns[i]} vs ${columns[j]}: ${val?.toFixed(2)}`}
                                    >
                                        <span className="text-white text-[10px] font-medium opacity-90">
                                            {val !== null ? (Math.abs(val as number) < 0.1 ? '' : (val as number).toFixed(1)) : '-'}
                                        </span>
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded"></div> Negative</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-zinc-800 rounded"></div> Neutral</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded"></div> Positive</span>
            </div>
        </div>
    );
}
