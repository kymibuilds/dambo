'use client';

import { useEffect, useState } from 'react';
import { Treemap as RechartsTreemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartFilter } from '@/lib/api/visualizations';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Color palette for treemap
const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D', '#FF8042', '#FFBB28'];

interface TreemapChartProps {
    datasetId?: string;
    groupColumns?: string; // comma-separated
    valueColumn?: string;
    filter?: ChartFilter;
}

// Custom content component for treemap cells
const CustomizedContent = (props: any) => {
    const { x, y, width, height, name, value, depth, index } = props;

    if (width < 30 || height < 20) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[index % COLORS.length],
                    stroke: '#fff',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 50 && height > 30 && (
                <>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 - 8}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={12}
                        fontWeight="bold"
                    >
                        {name}
                    </text>
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                    >
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </text>
                </>
            )}
        </g>
    );
};

export function TreemapChart({ datasetId, groupColumns, valueColumn, filter }: TreemapChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!datasetId || !groupColumns || !valueColumn) {
                // validation...
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let url = `${API_BASE}/datasets/${datasetId}/treemap?group_columns=${encodeURIComponent(groupColumns)}&value_column=${encodeURIComponent(valueColumn)}`;

                if (filter) {
                    url += `&filter_column=${encodeURIComponent(filter.column)}`;
                    url += `&filter_operator=${encodeURIComponent(filter.operator)}`;
                    url += `&filter_value=${encodeURIComponent(String(filter.value))}`;
                }

                const res = await fetch(url);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch treemap data');
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
    }, [datasetId, groupColumns, valueColumn, filter]);

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

    // Transform hierarchical data for recharts treemap
    // For single-level grouping, each node becomes a direct child
    const chartData = data.nodes.map((node: any, i: number) => ({
        name: node.path.join(' > '),
        size: node.value,
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <RechartsTreemap
                data={chartData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#8884d8"
                content={<CustomizedContent />}
            >
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '12px'
                    }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Value']}
                />
            </RechartsTreemap>
        </ResponsiveContainer>
    );
}
