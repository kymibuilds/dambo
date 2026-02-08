'use client';

import { useEffect, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';


import { ChartFilter } from '@/lib/api/visualizations';

interface BoxPlotChartProps {
    datasetId?: string;
    column?: string;
    filter?: ChartFilter;
    color?: string;
}

export function BoxPlotChart({ datasetId, column, filter, color }: BoxPlotChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !column) {
                // validation...
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/boxplot?column=${encodeURIComponent(column)}`;

                if (filter) {
                    url += `&filter_column=${encodeURIComponent(filter.column)}`;
                    url += `&filter_operator=${encodeURIComponent(filter.operator)}`;
                    url += `&filter_value=${encodeURIComponent(String(filter.value))}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch boxplot data');
                }

                const result = await res.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId, column, filter]);

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
            </div>
        );
    }

    if (!data?.stats) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-zinc-500">No data available</p>
            </div>
        );
    }

    const { stats, outliers } = data;

    // ...

    return (
        <div className="w-full h-full p-4">
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-700">{column}</h3>
            </div>

            {/* Visual box plot representation */}
            <div className="flex flex-col items-center gap-4">
                {/* Box plot visual */}
                <div className="w-full max-w-md relative h-16">
                    {/* Scale bar */}
                    <div className="absolute top-8 left-0 right-0 h-0.5 bg-zinc-300"></div>

                    {/* Min to Q1 whisker */}
                    <div
                        className="absolute top-8 h-0.5 bg-zinc-500"
                        style={{
                            left: `${((stats.min - stats.min) / (stats.max - stats.min)) * 100}%`,
                            width: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`
                        }}
                    ></div>

                    {/* Box (Q1 to Q3) */}
                    <div
                        className={`absolute top-4 h-8 border-2 rounded ${!color ? 'bg-blue-200 border-blue-500' : ''}`}
                        style={{
                            left: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`,
                            width: `${((stats.q3 - stats.q1) / (stats.max - stats.min)) * 100}%`,
                            backgroundColor: color ? color : undefined,
                            borderColor: color ? color : undefined,
                            opacity: color ? 0.8 : 1
                        }}
                    ></div>

                    {/* Median line */}
                    <div
                        className="absolute top-4 h-8 w-0.5 bg-red-500"
                        style={{
                            left: `${((stats.median - stats.min) / (stats.max - stats.min)) * 100}%`
                        }}
                    ></div>

                    {/* Q3 to Max whisker */}
                    <div
                        className="absolute top-8 h-0.5 bg-zinc-500"
                        style={{
                            left: `${((stats.q3 - stats.min) / (stats.max - stats.min)) * 100}%`,
                            width: `${((stats.max - stats.q3) / (stats.max - stats.min)) * 100}%`
                        }}
                    ></div>
                </div>

                {/* Stats table */}
                <div className="grid grid-cols-3 gap-4 text-center mt-4 w-full max-w-lg">
                    <div className="p-2 bg-zinc-50 rounded">
                        <div className="text-xs text-zinc-500">Min</div>
                        <div className="font-semibold">{stats.min.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded">
                        <div className="text-xs text-zinc-500">Q1</div>
                        <div className="font-semibold">{stats.q1.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs text-blue-600">Median</div>
                        <div className="font-semibold text-blue-700">{stats.median.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded">
                        <div className="text-xs text-zinc-500">Q3</div>
                        <div className="font-semibold">{stats.q3.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-zinc-50 rounded">
                        <div className="text-xs text-zinc-500">Max</div>
                        <div className="font-semibold">{stats.max.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                        <div className="text-xs text-green-600">Mean</div>
                        <div className="font-semibold text-green-700">{stats.mean.toFixed(2)}</div>
                    </div>
                </div>

                {/* Outliers */}
                {outliers.length > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 w-full max-w-lg">
                        <div className="text-sm font-medium text-amber-700 mb-1">
                            ⚠️ {outliers.length} Outlier{outliers.length > 1 ? 's' : ''} Detected
                        </div>
                        <div className="text-xs text-amber-600">
                            Values: {outliers.slice(0, 5).map((o: number) => o.toFixed(2)).join(', ')}
                            {outliers.length > 5 && ` ... and ${outliers.length - 5} more`}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
