'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchScatter, fetchDatasetProfile, type ScatterData } from '@/lib/api/visualizations';
import { ScatterChart as RechartsScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { validateAndFixColumn } from '@/lib/gemini/geminiClient';

// Predefined color palette
const COLOR_MAP: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    purple: '#8b5cf6',
    orange: '#f97316',
    pink: '#ec4899',
    yellow: '#eab308',
    cyan: '#06b6d4',
    indigo: '#6366f1',
    teal: '#14b8a6',
};

interface ScatterChartProps {
    datasetId?: string;
    x?: string;
    y?: string;
    color?: string; // Color name (red, blue, etc.) or hex code
}

export function ScatterChart({ datasetId, x, y, color = 'indigo' }: ScatterChartProps) {
    const [data, setData] = useState<ScatterData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fixedX, setFixedX] = useState<string | undefined>(x);
    const [fixedY, setFixedY] = useState<string | undefined>(y);

    // Resolve color - support both color names and hex codes
    const dotColor = useMemo(() => {
        if (!color) return '#6366f1';
        const lowerColor = color.toLowerCase();
        return COLOR_MAP[lowerColor] || (color.startsWith('#') ? color : '#6366f1');
    }, [color]);

    useEffect(() => {
        async function load() {
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

                // Fetch available columns for validation
                const profile = await fetchDatasetProfile(datasetId!);
                const cols = profile.columns.map((c: any) => c.name);

                // Get only numeric columns for scatter plot validation
                const numericCols = profile.columns
                    .filter((c: any) => ['int64', 'float64', 'number', 'integer', 'float'].includes(c.dtype?.toLowerCase() || ''))
                    .map((c: any) => c.name);

                // Validate and fix X column (prefer numeric columns)
                let xToUse = x!;
                const isXValid = numericCols.some((c: string) => c.toLowerCase() === x!.toLowerCase());
                if (!isXValid) {
                    console.log('[ScatterChart] Invalid/non-numeric X column, asking Gemini to fix:', x);
                    const fixed = await validateAndFixColumn(x!, numericCols.length > 0 ? numericCols : cols, 'scatter_chart');
                    if (fixed) {
                        console.log('[ScatterChart] Gemini fixed X:', x, '->', fixed);
                        xToUse = fixed;
                        setFixedX(fixed);
                    } else {
                        setError(`X column "${x}" not found or not numeric. Available numeric columns: ${numericCols.slice(0, 5).join(', ')}...`);
                        return;
                    }
                } else {
                    setFixedX(x);
                }

                // Validate and fix Y column (prefer numeric columns)
                let yToUse = y!;
                const isYValid = numericCols.some((c: string) => c.toLowerCase() === y!.toLowerCase());
                if (!isYValid) {
                    console.log('[ScatterChart] Invalid/non-numeric Y column, asking Gemini to fix:', y);
                    const fixed = await validateAndFixColumn(y!, numericCols.length > 0 ? numericCols : cols, 'scatter_chart');
                    if (fixed) {
                        console.log('[ScatterChart] Gemini fixed Y:', y, '->', fixed);
                        yToUse = fixed;
                        setFixedY(fixed);
                    } else {
                        setError(`Y column "${y}" not found or not numeric. Available numeric columns: ${numericCols.slice(0, 5).join(', ')}...`);
                        return;
                    }
                } else {
                    setFixedY(y);
                }

                const res = await fetchScatter(datasetId!, xToUse, yToUse);
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

    // Simple data transform
    const chartData = useMemo(() => {
        if (!data) return [];
        return data.x.map((val, i) => ({ x: val, y: data.y[i] }));
    }, [data]);

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading chart...</div>;
    if (error) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;
    if (!data) return null;

    return (
        <div className="w-full h-full min-h-[300px] bg-white rounded-lg p-3 border border-zinc-200 flex flex-col">
            <h3 className="text-sm font-medium text-zinc-700 mb-2 text-center flex-shrink-0">{fixedX} vs {fixedY}</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}>
                    <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 40 }}>
                        <XAxis
                            type="number"
                            dataKey="x"
                            name={fixedX}
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: fixedX, position: 'bottom', offset: 10, fill: '#52525b', fontSize: 10 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name={fixedY}
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: fixedY, angle: -90, position: 'left', offset: 10, fill: '#52525b', fontSize: 10 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b' }}
                            itemStyle={{ color: '#18181b' }}
                            cursor={{ strokeDasharray: '3 3' }}
                        />
                        <Scatter name={`${fixedX} vs ${fixedY}`} data={chartData} fill={dotColor} />
                    </RechartsScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
