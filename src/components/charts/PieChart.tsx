'use client';

import { useEffect, useState } from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Vibrant color palette for pie segments
const PIE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#0ea5e9'];

interface PieChartProps {
    datasetId?: string;
    column?: string;
    limit?: number;
    donut?: boolean;
}

export function PieChart({ datasetId, column, limit = 10, donut = false }: PieChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !column) {
                setError('Missing required parameters');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const res = await fetch(`${API_BASE}/datasets/${datasetId}/pie?column=${encodeURIComponent(column)}&limit=${limit}`);
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
    }, [datasetId, column, limit]);

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

    // Transform data for recharts
    const chartData = data.categories.map((cat: string, i: number) => ({
        name: cat,
        value: data.values[i]
    }));

    const total = chartData.reduce((sum: number, d: any) => sum + d.value, 0);

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
                    labelLine={{ stroke: '#888', strokeWidth: 1 }}
                >
                    {chartData.map((entry: any, index: number) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                    formatter={(value) => [`${value} (${((Number(value) / total) * 100).toFixed(1)}%)`, 'Count']}
                />
                <Legend />
            </RechartsPieChart>
        </ResponsiveContainer>
    );
}
