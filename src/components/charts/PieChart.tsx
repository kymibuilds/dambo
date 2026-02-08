'use client';

import { useEffect, useState, useMemo } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartFilter } from '@/lib/api/visualizations';
import { generatePalette } from '@/lib/utils/colors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Vibrant color palette for pie segments
const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#0ea5e9'];

interface PieChartProps {
    datasetId?: string;
    column?: string;
    limit?: number;
    donut?: boolean;
    filter?: ChartFilter;
    color?: string;
}

export function PieChart({ datasetId, column, limit = 10, donut = false, filter, color }: PieChartProps) {
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

                let url = `${API_BASE}/datasets/${datasetId}/pie?column=${encodeURIComponent(column)}&limit=${limit}`;

                if (filter) {
                    url += `&filter_column=${encodeURIComponent(filter.column)}`;
                    url += `&filter_operator=${encodeURIComponent(filter.operator)}`;
                    url += `&filter_value=${encodeURIComponent(String(filter.value))}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch pie data');
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
    }, [datasetId, column, limit, filter]);

    const chartColors = useMemo(() => {
        if (color && data?.categories) {
            return generatePalette(color, data.categories.length);
        }
        return PIE_COLORS;
    }, [color, data]);

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

    if (!data) return null;

    // Transform data for recharts
    // Backend returns { categories: string[], values: number[] }
    const chartData = data.categories.map((label: string, i: number) => ({
        name: label,
        value: data.values[i]
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={donut ? "40%" : 0}
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                    {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                </Pie>
                <Tooltip />
            </RechartsPieChart>
        </ResponsiveContainer>
    );
}
