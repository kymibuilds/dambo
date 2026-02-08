'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { fetchBar, fetchDatasetProfile } from '@/lib/api/visualizations';

interface SimpleBarChartProps {
    datasetId?: string;
    column?: string;
}

export function BarChart({ datasetId, column: propColumn }: SimpleBarChartProps) {
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
        let mounted = true;

        async function load() {
            if (!datasetId) {
                if (mounted) {
                    setError('Missing dataset ID');
                    setLoading(false);
                }
                return;
            }

            try {
                if (mounted) {
                    setLoading(true);
                    setError(null);
                }

                // Case 1: Column is selected (either via prop or UI)
                if (selectedColumn && selectedColumn !== 'undefined') {
                    const result = await fetchBar(datasetId, selectedColumn);
                    if (mounted) setData(result);
                }
                // Case 2: No column selected - fetch metadata to show selection UI
                else {
                    const profile = await fetchDatasetProfile(datasetId);
                    const cols = profile.columns.map((c: any) => c.name);
                    if (mounted) {
                        setAvailableColumns(cols);
                        setData(null); // No chart data yet
                    }
                }
            } catch (err: any) {
                console.error(err);
                if (mounted) setError(err.message || `Failed to load data (${datasetId})`);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();

        return () => {
            mounted = false;
        };
    }, [datasetId, selectedColumn]);

    // Memoize chart data to prevent unnecessary re-renders
    const chartData = useMemo(() => {
        return data?.categories?.map((cat: string, i: number) => ({
            name: cat,
            value: data.counts[i]
        })) || [];
    }, [data]);

    const BAR_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading...</div>;

    // Show error only if we don't have available columns to show UI
    if (error && availableColumns.length === 0) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;

    // Show selection UI if no column selected
    if (!selectedColumn || selectedColumn === 'undefined' || !data) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-zinc-50 rounded-lg border border-zinc-200 p-6">
                <div className="text-zinc-500 text-sm">Please select a column to visualize:</div>
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

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart layout="vertical" data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {chartData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                    </Bar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}
