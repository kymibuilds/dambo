'use client';

import { type QuickAnalysisData } from '@/lib/api/visualizations';
import { HistogramChart } from '@/components/charts/HistogramChart';
import { BarChart } from '@/components/charts/BarChart';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';
import {
    Database,
    AlertTriangle,
    TrendingUp,
    Zap,
    BarChart3,
    Grid3X3,
    Loader2
} from 'lucide-react';

interface QuickAnalysisPanelProps {
    data: QuickAnalysisData;
    datasetId: string;
    isLoading?: boolean;
}

function InsightCard({
    icon: Icon,
    label,
    value,
    sublabel,
    colorClass = 'text-zinc-600 dark:text-zinc-400'
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sublabel?: string;
    colorClass?: string;
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
            {sublabel && (
                <div className="text-xs text-zinc-500 dark:text-zinc-500">{sublabel}</div>
            )}
        </div>
    );
}

function ReadinessIndicator({ score, level }: { score: number; level: string }) {
    const getColor = () => {
        if (level === 'High') return 'bg-emerald-500';
        if (level === 'Moderate') return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getTextColor = () => {
        if (level === 'High') return 'text-emerald-600 dark:text-emerald-400';
        if (level === 'Moderate') return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">ML Readiness</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-zinc-200 dark:text-zinc-700"
                        />
                        <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${(score / 100) * 176} 176`}
                            className={getColor().replace('bg-', 'text-')}
                        />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${getTextColor()}`}>
                        {score}
                    </span>
                </div>
                <div>
                    <div className={`text-xl font-bold ${getTextColor()}`}>{level}</div>
                    <div className="text-xs text-zinc-500">Readiness Level</div>
                </div>
            </div>
        </div>
    );
}

export function QuickAnalysisPanel({ data, datasetId, isLoading }: QuickAnalysisPanelProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <span className="ml-3 text-zinc-500">Running Quick Analysis...</span>
            </div>
        );
    }

    const { dataset_overview, ml_readiness, strongest_correlations, outlier_detection, chart_payloads } = data;

    // Get top outlier column
    const topOutlier = outlier_detection.length > 0
        ? outlier_detection.reduce((a, b) => a.outlier_percentage > b.outlier_percentage ? a : b)
        : null;

    // Get strongest correlation
    const topCorrelation = strongest_correlations.length > 0
        ? strongest_correlations[0]
        : null;

    return (
        <div className="space-y-6">
            {/* Insight Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <InsightCard
                    icon={Database}
                    label="Dataset Size"
                    value={`${dataset_overview.row_count.toLocaleString()} × ${dataset_overview.column_count}`}
                    sublabel="rows × columns"
                    colorClass="text-blue-500"
                />
                <InsightCard
                    icon={Grid3X3}
                    label="Duplicates"
                    value={dataset_overview.duplicate_rows}
                    sublabel={`${((dataset_overview.duplicate_rows / dataset_overview.row_count) * 100).toFixed(1)}% of rows`}
                    colorClass="text-amber-500"
                />
                {topCorrelation && (
                    <InsightCard
                        icon={TrendingUp}
                        label="Strongest Correlation"
                        value={topCorrelation.correlation?.toFixed(3) ?? 'N/A'}
                        sublabel={`${topCorrelation.column_a} ↔ ${topCorrelation.column_b}`}
                        colorClass="text-emerald-500"
                    />
                )}
                {topOutlier && (
                    <InsightCard
                        icon={AlertTriangle}
                        label="Top Outliers"
                        value={`${topOutlier.outlier_percentage.toFixed(1)}%`}
                        sublabel={`in ${topOutlier.column}`}
                        colorClass="text-red-500"
                    />
                )}
            </div>

            {/* ML Readiness */}
            <ReadinessIndicator score={ml_readiness.readiness_score} level={ml_readiness.readiness_level} />

            {/* Charts Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Key Visualizations
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Histogram */}
                    {chart_payloads.histograms?.[0] && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                                Distribution: {chart_payloads.histograms[0].column}
                            </h4>
                            <HistogramChart
                                datasetId={datasetId}
                                column={chart_payloads.histograms[0].column}
                            />
                        </div>
                    )}

                    {/* Bar Chart */}
                    {chart_payloads.bars?.[0] && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                                Categories: {chart_payloads.bars[0].column}
                            </h4>
                            <BarChart
                                datasetId={datasetId}
                                column={chart_payloads.bars[0].column}
                            />
                        </div>
                    )}
                </div>

                {/* Correlation Heatmap */}
                {chart_payloads.correlation_heatmap && chart_payloads.correlation_heatmap.columns.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                            Correlation Heatmap
                        </h4>
                        <CorrelationHeatmap datasetId={datasetId} />
                    </div>
                )}
            </div>
        </div>
    );
}
