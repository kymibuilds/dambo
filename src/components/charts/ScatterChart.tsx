'use client';

import { useEffect, useState } from 'react';
import { fetchScatter, type ScatterData } from '@/lib/api/visualizations';
import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ScatterChartProps {
    datasetId?: string;
    x?: string;
    y?: string;
}

export function ScatterChart({ datasetId, x, y }: ScatterChartProps) {
    const [data, setData] = useState<ScatterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            // Validate required parameters before making API call
            const missing: string[] = [];
            if (!datasetId) missing.push('datasetId');
            if (!x) missing.push('x (X-axis column)');
            if (!y) missing.push('y (Y-axis column)');

            if (missing.length > 0) {
                setError(`Missing required parameters: ${missing.join(', ')}. Please specify both X and Y columns.`);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                console.log('[DEBUG] ScatterChart making API call with:', { datasetId, x, y });
                const res = await fetchScatter(datasetId!, x!, y!);
                console.log('[DEBUG] ScatterChart received data:', res);
                setData(res);
                setError(null);
            } catch (err) {
                console.error('[DEBUG] ScatterChart error:', err);
                setError(`Failed to load scatter plot: ${err instanceof Error ? err.message : 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId, x, y]);

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading chart...</div>;
    if (error) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;
    if (!data) return null;

    const chartData = data.x.map((val, i) => ({ x: val, y: data.y[i] }));

    return (
        <div className="w-full min-h-[288px] bg-white rounded-lg p-4 border border-zinc-200 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-700 mb-2 text-center flex-shrink-0">{x} vs {y}</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                    <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 40 }}>
                        <XAxis
                            type="number"
                            dataKey="x"
                            name={x}
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: x, position: 'bottom', offset: 10, fill: '#52525b', fontSize: 10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name={y}
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: y, angle: -90, position: 'left', offset: 10, fill: '#52525b', fontSize: 10 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b' }}
                            itemStyle={{ color: '#18181b' }}
                            cursor={{ strokeDasharray: '3 3' }}
                        />
                        <Scatter name={`${x} vs ${y}`} data={chartData} fill="#6366f1" />
                    </RechartsScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
