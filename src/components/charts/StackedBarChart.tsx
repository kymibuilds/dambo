'use client';

import { useEffect, useState } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for stacked bars
const STACK_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

interface StackedBarChartProps {
    datasetId?: string;
    categoryColumn?: string;
    stackColumn?: string;
    valueColumn?: string;
}

export function StackedBarChart({ datasetId, categoryColumn, stackColumn, valueColumn }: StackedBarChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !categoryColumn || !stackColumn) {
                setError('Missing required parameters');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/stacked-bar?category_column=${encodeURIComponent(categoryColumn)}&stack_column=${encodeURIComponent(stackColumn)}`;
                if (valueColumn) {
                    url += `&value_column=${encodeURIComponent(valueColumn)}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch stacked bar data');
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
    }, [datasetId, categoryColumn, stackColumn, valueColumn]);

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
    const chartData = data.categories.map((cat: string, i: number) => {
        const point: any = { category: cat };
        data.data.forEach((series: any) => {
            point[series.name] = series.values[i];
        });
        return point;
    });

    const stackNames = data.data.map((d: any) => d.name);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    label={{ value: `${categoryColumn} →`, position: 'insideBottom', offset: -5, fill: '#52525b', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: `${valueColumn || 'Count'} →`, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 12, fontWeight: 500, dy: 30 }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                />
                <Legend />
                {stackNames.map((name: string, i: number) => (
                    <Bar
                        key={name}
                        dataKey={name}
                        stackId="stack"
                        fill={STACK_COLORS[i % STACK_COLORS.length]}
                    />
                ))}
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
