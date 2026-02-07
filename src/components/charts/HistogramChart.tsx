'use client';

interface HistogramChartProps {
    column: string;
    bins: number[];
    counts: number[];
}

export function HistogramChart({ column, bins, counts }: HistogramChartProps) {
    const maxCount = Math.max(...counts, 1);

    return (
        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Histogram: {column}</h3>
            <div className="flex items-end gap-1 h-40">
                {counts.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                            className="w-full bg-blue-500 rounded-t transition-all"
                            style={{ height: `${(count / maxCount) * 100}%` }}
                        />
                        <span className="text-[10px] text-zinc-500 mt-1 truncate w-full text-center">
                            {bins[i]?.toFixed(0)}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-2 text-xs text-zinc-500 text-center">
                {counts.length} bins
            </div>
        </div>
    );
}
