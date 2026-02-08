'use client';

import { useEffect, useState, useMemo } from 'react';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartFilter } from '@/lib/api/visualizations';
import { generatePalette } from '@/lib/utils/colors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for stacked areas
const AREA_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

interface AreaChartProps {
    datasetId?: string;
    dateColumn?: string;
    valueColumn?: string;
    stackColumn?: string;
    filter?: ChartFilter;
    color?: string;
}

export function AreaChart({ datasetId, dateColumn, valueColumn, stackColumn, filter, color }: AreaChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !dateColumn || !valueColumn || !stackColumn) {
                // validation...
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/area?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}&stack_column=${encodeURIComponent(stackColumn)}`;

                if (filter) {
                    url += `&filter_column=${encodeURIComponent(filter.column)}`;
                    url += `&filter_operator=${encodeURIComponent(filter.operator)}`;
                    url += `&filter_value=${encodeURIComponent(String(filter.value))}`;
                }

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
    }, [datasetId, dateColumn, valueColumn, stackColumn, filter]);

    const chartColors = useMemo(() => {
        if (color && data?.series) {
            return generatePalette(color, data.series.length);
        }
        return AREA_COLORS;
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
                        return date.toLocaleDateString();
                    }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <defs>
                    {seriesNames.map((name: string, i: number) => (
                        <linearGradient key={`color-${name}`} id={`color-${name}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0} />
                        </linearGradient>
                    ))}
                </defs>
                {seriesNames.map((name: string, i: number) => (
                    <Area
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stackId="1"
                        stroke={chartColors[i % chartColors.length]}
                        fillOpacity={1}
                        fill={`url(#color-${name})`}
                    />
                ))}
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
}
