'use client';

import { useEffect, useState } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for multiple lines
const LINE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

interface LineChartProps {
    datasetId?: string;
    dateColumn?: string;
    valueColumn?: string;
    groupColumn?: string;
}

export function LineChart({ datasetId, dateColumn, valueColumn, groupColumn }: LineChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !dateColumn || !valueColumn) {
                setError('Missing required parameters');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/line?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}`;
                if (groupColumn) {
                    url += `&group_column=${encodeURIComponent(groupColumn)}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch line data');
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
    }, [datasetId, dateColumn, valueColumn, groupColumn]);

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
    let chartData: any[] = [];
    let seriesNames: string[] = [];

    if (data?.series) {
        // Multiple lines
        seriesNames = data.series.map((s: any) => s.name);
        const dateMap: Record<string, any> = {};

        data.series.forEach((s: any) => {
            s.data.forEach((d: any) => {
                if (!dateMap[d.date]) {
                    dateMap[d.date] = { date: d.date };
                }
                dateMap[d.date][s.name] = d.value;
            });
        });

        chartData = Object.values(dateMap).sort((a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    } else if (data?.data) {
        // Single line
        chartData = data.data.map((d: any) => ({
            date: d.date,
            value: d.value
        }));
        seriesNames = ['value'];
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
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
                {seriesNames.length > 1 && <Legend />}
                {seriesNames.map((name, i) => (
                    <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                ))}
            </RechartsLineChart>
        </ResponsiveContainer>
    );
}
