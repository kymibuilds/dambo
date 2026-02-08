'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchHistogram, fetchDatasetProfile } from '@/lib/api/visualizations';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { validateAndFixColumn } from '@/lib/gemini/geminiClient';

interface HistogramChartProps {
    datasetId?: string;
    column?: string;
    bins?: number;
    itemsPerPage?: number;
}

const ITEMS_PER_PAGE = 10;

export function HistogramChart({ datasetId, column: propColumn, bins = 10, itemsPerPage = ITEMS_PER_PAGE }: HistogramChartProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string | undefined>(propColumn);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        if (propColumn) setSelectedColumn(propColumn);
    }, [propColumn]);

    useEffect(() => {
        setCurrentPage(0);
    }, [selectedColumn]);

    useEffect(() => {
        async function load() {
            if (!datasetId) {
                setError('Missing dataset ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const profile = await fetchDatasetProfile(datasetId);
                const cols = profile.columns.map((c: any) => c.name);
                setAvailableColumns(cols);

                if (selectedColumn && selectedColumn !== 'undefined') {
                    let columnToUse = selectedColumn;
                    const isValidColumn = cols.some((c: string) => c.toLowerCase() === selectedColumn.toLowerCase());

                    if (!isValidColumn) {
                        console.log('[HistogramChart] Invalid column, asking Gemini to fix:', selectedColumn);
                        const fixedColumn = await validateAndFixColumn(selectedColumn, cols, 'histogram_chart');
                        if (fixedColumn) {
                            console.log('[HistogramChart] Gemini fixed column:', selectedColumn, '->', fixedColumn);
                            columnToUse = fixedColumn;
                            setSelectedColumn(fixedColumn);
                        } else {
                            setError(`Column "${selectedColumn}" not found. Available: ${cols.slice(0, 5).join(', ')}...`);
                            setData(null);
                            return;
                        }
                    }

                    const result = await fetchHistogram(datasetId, columnToUse);
                    setData(result);
                } else {
                    setData(null);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || `Failed to load data (${datasetId})`);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [datasetId, selectedColumn, bins]);

    const { chartData, totalItems, totalPages, startIndex, endIndex } = useMemo(() => {
        const allData = data?.bins?.slice(0, -1).map((bin: number, i: number) => ({
            bin: bin.toFixed(1),
            count: data.counts[i],
            range: `${bin.toFixed(1)} - ${data.bins[i + 1]?.toFixed(1)}`
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

    // Dynamic height based on number of bins (vertical bars)
    const chartHeight = Math.max(200, Math.min(300, 250));

    if (loading) return <div className="h-64 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" />Loading...</div>;

    if (error && availableColumns.length === 0) return <div className="h-64 flex items-center justify-center text-red-500 p-4 text-center">{error}</div>;

    if (!selectedColumn || selectedColumn === 'undefined' || !data) {
        return (
            <div className="h-64 flex flex-col items-center justify-center space-y-4 bg-zinc-50 rounded-lg border border-zinc-200 p-6">
                <div className="text-zinc-500 text-sm">Please select a column for histogram:</div>
                <select
                    className="p-2 border rounded-md shadow-sm bg-white text-sm min-w-[200px]"
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    defaultValue=""
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
                    <RechartsBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis
                            dataKey="bin"
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                        />
                        <YAxis
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e4e4e7' }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', color: '#18181b' }}
                            itemStyle={{ color: '#18181b' }}
                            cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                            formatter={(value: any) => [value, 'Count']}
                            labelFormatter={(label, payload) => payload[0]?.payload.range || label}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={`hsl(217, 91%, ${55 + (index % 5) * 5}%)`} />
                            ))}
                        </Bar>
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>

            {/* Always show pagination info */}
            <div className="flex items-center justify-between mt-3 px-1 text-sm border-t border-zinc-100 pt-2">
                <span className="text-zinc-500">
                    Showing bins {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems}
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
