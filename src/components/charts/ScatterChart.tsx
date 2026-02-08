'use client';

import { useEffect, useState } from 'react';
import { fetchScatter, type ScatterData } from '@/lib/api/visualizations';
import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ScatterChartProps {
    datasetId: string;
    x: string;
    y: string;
}

export function ScatterChart({ datasetId, x, y }: ScatterChartProps) {
    const [data, setData] = useState<ScatterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const res = await fetchScatter(datasetId, x, y);
                setData(res);
                setError(null);
            } catch (err) {
                console.error(err);
                setError(`Failed to load scatter plot (${datasetId || 'missing ID'})`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId, x, y]);

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading chart...</div>;
    if (error) return <div className="h-64 flex items-center justify-center text-red-500">{error}</div>;
    if (!data) return null;

    const chartData = data.x.map((val, i) => ({ x: val, y: data.y[i] }));

    return (
        <div className="w-full h-72 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300 mb-4 text-center">{x} vs {y}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                        type="number"
                        dataKey="x"
                        name={x}
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: x, position: 'bottom', offset: 0, fill: '#71717a', fontSize: 10 }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name={y}
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: y, angle: -90, position: 'left', offset: 0, fill: '#71717a', fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter name={`${x} vs ${y}`} data={chartData} fill="#8884d8" />
                </RechartsScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
