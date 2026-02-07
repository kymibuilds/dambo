'use client';

interface CorrelationHeatmapProps {
    columns: string[];
    matrix: (number | null)[][];
}

function getColor(value: number | null): string {
    if (value === null) return 'bg-zinc-700';
    // Map -1 to 1 range to color
    if (value >= 0.7) return 'bg-green-500';
    if (value >= 0.4) return 'bg-green-700';
    if (value >= 0.1) return 'bg-green-900';
    if (value >= -0.1) return 'bg-zinc-700';
    if (value >= -0.4) return 'bg-red-900';
    if (value >= -0.7) return 'bg-red-700';
    return 'bg-red-500';
}

export function CorrelationHeatmap({ columns, matrix }: CorrelationHeatmapProps) {
    if (columns.length === 0) {
        return (
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400">
                No numeric columns for correlation
            </div>
        );
    }

    return (
        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Correlation Matrix</h3>
            <div className="overflow-x-auto">
                <table className="text-xs">
                    <thead>
                        <tr>
                            <th className="p-1"></th>
                            {columns.map((col) => (
                                <th key={col} className="p-1 text-zinc-400 font-normal truncate max-w-16">
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.map((row, i) => (
                            <tr key={i}>
                                <td className="p-1 text-zinc-400 truncate max-w-16">{columns[i]}</td>
                                {row.map((val, j) => (
                                    <td key={j} className="p-0.5">
                                        <div
                                            className={`w-8 h-8 rounded flex items-center justify-center ${getColor(val)}`}
                                        >
                                            <span className="text-white text-[10px]">
                                                {val !== null ? val.toFixed(1) : '-'}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex gap-2 mt-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div> -1
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-zinc-700 rounded"></div> 0
                </span>
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div> +1
                </span>
            </div>
        </div>
    );
}
