'use client';

import { useEffect, useState } from 'react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for stacked areas
const AREA_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

interface AreaChartProps {
    datasetId?: string;
    dateColumn?: string;
    valueColumn?: string;
    stackColumn?: string;
}

export function AreaChart({ datasetId, dateColumn, valueColumn, stackColumn }: AreaChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !dateColumn || !valueColumn || !stackColumn) {
                setError('Missing required parameters');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const url = `${API_BASE}/datasets/${datasetId}/area?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}&stack_column=${encodeURIComponent(stackColumn)}`;

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch area data');
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
    }, [datasetId, dateColumn, valueColumn, stackColumn]);

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
    const chartData = data.dates.map((date: string, i: number) => {
        const point: any = { date };
        data.series.forEach((s: any) => {
            point[s.name] = s.values[i];
        });
        return point;
    });

    const seriesNames = data.series.map((s: any) => s.name);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                {seriesNames.map((name: string, i: number) => (
                    <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stackId="1"
                        stroke={AREA_COLORS[i % AREA_COLORS.length]}
                        fill={AREA_COLORS[i % AREA_COLORS.length]}
                        fillOpacity={0.6}
                    />
                ))}
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
}
