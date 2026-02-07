'use client';

interface BarChartProps {
    column: string;
    categories: string[];
    counts: number[];
}

export function BarChart({ column, categories, counts }: BarChartProps) {
    const maxCount = Math.max(...counts, 1);

    return (
        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Bar Chart: {column}</h3>
            <div className="space-y-2">
                {categories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 w-24 truncate">{cat}</span>
                        <div className="flex-1 bg-zinc-800 rounded h-6 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded transition-all flex items-center justify-end pr-2"
                                style={{ width: `${(counts[i] / maxCount) * 100}%` }}
                            >
                                <span className="text-xs text-white font-medium">{counts[i]}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
