'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from 'recharts';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBar, fetchDatasetProfile } from '@/lib/api/visualizations';
import { validateAndFixColumn } from '@/lib/gemini/geminiClient';


import { ChartFilter } from '@/lib/api/visualizations';

interface SimpleBarChartProps {
    datasetId?: string;
    column?: string;
    itemsPerPage?: number;
    filter?: ChartFilter;
    color?: string;
}

const ITEMS_PER_PAGE = 10;

export function BarChart({ datasetId, column: propColumn, itemsPerPage = ITEMS_PER_PAGE, filter, color }: SimpleBarChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string | undefined>(propColumn);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (propColumn) setSelectedColumn(propColumn);
    }, [propColumn]);

    // Reset pagination when column OR filter changes
    useEffect(() => {
        setCurrentPage(0);
    }, [selectedColumn, filter]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            if (!datasetId) {
                if (mounted) {
                    setError('Missing dataset ID');
                    setLoading(false);
                }
                return;
            }

            try {
                if (mounted) {
                    setLoading(true);
                    setError(null);
                }

                // If no column selected, try to get profile to show list
                if (!selectedColumn || selectedColumn === 'undefined') {
                    const profile = await fetchDatasetProfile(datasetId);
                    const cols = profile.columns.map((c: any) => c.name);
                    if (mounted) {
                        setAvailableColumns(cols);
                        setLoading(false);
                    }
                    return;
                }

                const profile = await fetchDatasetProfile(datasetId);
                const cols = profile.columns.map((c: any) => c.name);
                if (mounted) setAvailableColumns(cols);

                let columnToUse = selectedColumn;
                const isValidColumn = cols.some((c: string) => c.toLowerCase() === selectedColumn.toLowerCase());

                if (!isValidColumn) {
                    console.log('[BarChart] Invalid column, asking Gemini to fix:', selectedColumn);
                    const fixedColumn = await validateAndFixColumn(selectedColumn, cols, 'bar_chart');
                    if (fixedColumn) {
                        console.log('[BarChart] Gemini fixed column:', selectedColumn, '->', fixedColumn);
                        columnToUse = fixedColumn;
                        if (mounted) setSelectedColumn(fixedColumn);
                    } else {
                        if (mounted) {
                            setError(`Column "${selectedColumn}" not found. Available: ${cols.slice(0, 5).join(', ')}...`);
                            setData(null);
                        }
                        return;
                    }
                }

                const result = await fetchBar(datasetId, columnToUse, filter);
                if (mounted) setData(result);

            } catch (err: any) {
                console.error(err);
                if (mounted) setError(err.message || `Failed to load data (${datasetId})`);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();

        return () => {
            mounted = false;
        };
    }, [datasetId, selectedColumn, filter]);

    const { chartData, totalItems, totalPages, startIndex, endIndex } = useMemo(() => {
        const allData = data?.categories?.map((cat: string, i: number) => ({
            name: cat,
            value: data.counts[i]
        })) || [];

        const total = allData.length;
        const pages = Math.ceil(total / itemsPerPage) || 1;
        const start = currentPage * itemsPerPage;
        const end = Math.min(start + itemsPerPage, total);
        const paginated = allData.slice(start, end);

        return {
            chartData: paginated,
            totalItems: total,
            totalPages: pages,
            startIndex: start,
            endIndex: end
        };
    }, [data, currentPage, itemsPerPage]);

    const BAR_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

    // Dynamic height: 28px per bar + padding
    const chartHeight = Math.max(180, Math.min(380, chartData.length * 28 + 50));

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading...</div>;

    if (error && availableColumns.length === 0) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;

    if (!selectedColumn || selectedColumn === 'undefined' || !data) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-zinc-50 rounded-lg border border-zinc-200 p-6">
                <div className="text-zinc-500 text-sm">Please select a column to visualize:</div>
                <select
                    className="p-2 border rounded-md shadow-sm bg-white text-sm min-w-[200px]"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    value={selectedColumn || ''}
                >
                    <option value="" disabled>Select a column...</option>
                    {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                    ))}
                </select>
                {error && <div className="text-red-500 text-xs">{error}</div>}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col bg-white rounded-lg p-3 border border-zinc-200">
            <div style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart layout="vertical" data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                        <XAxis
                            type="number"
                            tick={{ fill: '#52525b', fontSize: 11 }}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: 'Count →', position: 'insideBottom', offset: -5, fill: '#52525b', fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 11, fill: '#52525b' }}
                            axisLine={{ stroke: '#e4e4e7' }}
                            label={{ value: `${selectedColumn} →`, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 12, fontWeight: 500, dy: 40 }}
                        />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7' }} />
                        <Bar dataKey="value" fill={color || "#3b82f6"} radius={[0, 4, 4, 0]}>
                            <LabelList dataKey="value" position="right" fill="#52525b" fontSize={11} offset={5} />
                            {chartData.map((_entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={color || BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                        </Bar>

                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>

            {/* Always show pagination info */}
            <div className="flex items-center justify-between mt-3 px-1 text-sm border-t border-zinc-100 pt-2">
                <span className="text-zinc-500">
                    Showing {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems}
                </span>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-zinc-600 min-w-[60px] text-center">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage === totalPages - 1}
                            className="p-1.5 rounded-md border border-zinc-200 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
