'use client';

import { useEffect, useState } from 'react';
import { fetchHistogram, fetchDatasetProfile } from '@/lib/api/visualizations';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';

interface HistogramChartProps {
    datasetId?: string;
    column?: string;
    bins?: number;
}

export function HistogramChart({ datasetId, column: propColumn, bins = 10 }: HistogramChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string | undefined>(propColumn);

    // Update selected column when prop changes
    useEffect(() => {
        if (propColumn) setSelectedColumn(propColumn);
    }, [propColumn]);

    useEffect(() => {
        async function load() {
            if (!datasetId) {
                setError('Missing dataset ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Case 1: Column is selected
                if (selectedColumn && selectedColumn !== 'undefined') {
                    // Note: fetchHistogram currently ignores bins in visualizations.ts, 
                    // should be updated to pass bins. For now ensuring basic load.
                    const result = await fetchHistogram(datasetId, selectedColumn);
                    setData(result);
                }
                // Case 2: No column selected
                else {
                    const profile = await fetchDatasetProfile(datasetId);
                    const cols = profile.columns.map((c: any) => c.name);
                    setAvailableColumns(cols);
                    setData(null);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || `Failed to load data (${datasetId})`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId, selectedColumn, bins]);

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading...</div>;

    // Show error only if we don't have available columns to show UI
    if (error && availableColumns.length === 0) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;

    // Show selection UI if no column selected
    if (!selectedColumn || selectedColumn === 'undefined' || !data) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-zinc-50 rounded-lg border border-zinc-200 p-6">
                <div className="text-zinc-500 text-sm">Please select a column for histogram:</div>
                <select
                    className="p-2 border rounded-md shadow-sm bg-white text-sm min-w-[200px]"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    defaultValue=""
                >
                    <option value="" disabled>Select a column...</option>
                    {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                    ))}
                </select>
                {error && <div className="text-red-500 text-xs">{error}</div>}
            </div>
        );
    }

    // Transform data for Recharts
    const chartData = data.bins.slice(0, -1).map((bin: number, i: number) => ({
        bin: bin.toFixed(1), // format bin range
        count: data.counts[i],
        range: `${bin.toFixed(1)} - ${data.bins[i + 1]?.toFixed(1)}`
    }));

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="bin"
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                        formatter={(value: any) => [value, 'Count']}
                        labelFormatter={(label, payload) => payload[0]?.payload.range || label}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${60 + (index % 5) * 5}%)`} />
                        ))}
                    </Bar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}
