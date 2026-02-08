'use client';

import { useEffect, useState } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartFilter } from '@/lib/api/visualizations';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for multiple lines
const LINE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

interface LineChartProps {
    datasetId?: string;
    dateColumn?: string;
    valueColumn?: string;
    groupColumn?: string;
    filter?: ChartFilter;
    color?: string;
}

export function LineChart({ datasetId, dateColumn, valueColumn, groupColumn, filter, color }: LineChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !dateColumn || !valueColumn) {
                // validation...
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/line?date_column=${encodeURIComponent(dateColumn)}&value_column=${encodeURIComponent(valueColumn)}`;
                if (groupColumn) {
                    url += `&group_column=${encodeURIComponent(groupColumn)}`;
                }

                if (filter) {
                    url += `&filter_column=${encodeURIComponent(filter.column)}`;
                    url += `&filter_operator=${encodeURIComponent(filter.operator)}`;
                    url += `&filter_value=${encodeURIComponent(String(filter.value))}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch line data');
                }

                const result = await res.json();
                console.log('[DEBUG] LineChart data:', result);
                setData(result);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [datasetId, dateColumn, valueColumn, groupColumn, filter]);

    if (loading) return <div className="flex justify-center items-center h-full text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading line chart...</div>;
    if (error) return <div className="flex justify-center items-center h-full text-destructive">Error: {error}</div>;
    if (!data) return <div className="flex justify-center items-center h-full text-muted-foreground">No data available</div>;

    const hasGroups = !!data.series;
    const chartData = hasGroups ?
        // Transform series data for Recharts if needed, or use as is if structure matches
        // Recharts needs an array of objects where each object is a data point (date)
        // and keys are the series names.
        // But our API returns { series: [{name: 'A', data: [...]}, ...] }
        // We need to flatten this.
        flattenSeriesData(data.series)
        : data.data;

    const seriesNames = hasGroups ? data.series.map((s: any) => s.name) : ['current'];

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                    />
                    {hasGroups && <Legend />}

                    {hasGroups ? (
                        seriesNames.map((name: string, i: number) => (
                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))
                    ) : (
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color || "#8884d8"}
                            strokeWidth={2}
                            dot={false}
                        />
                    )}
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
}

// Helper to transform nested series data into Recharts-friendly flat array
function flattenSeriesData(series: any[]) {
    // Get all unique dates
    const dateMap = new Map<string, any>();

    series.forEach(s => {
        s.data.forEach((point: any) => {
            if (!dateMap.has(point.date)) {
                dateMap.set(point.date, { date: point.date });
            }
            dateMap.get(point.date)[s.name] = point.value;
        });
    });

    return Array.from(dateMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}
