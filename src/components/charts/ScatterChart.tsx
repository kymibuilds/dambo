'use client';

interface ScatterChartProps {
    x_label: string;
    y_label: string;
    x: number[];
    y: number[];
}

export function ScatterChart({ x_label, y_label, x = [], y = [] }: ScatterChartProps) {
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const yMin = Math.min(...y);
    const yMax = Math.max(...y);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    return (
        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">
                Scatter: {x_label} vs {y_label}
            </h3>
            <div className="relative w-full h-48 bg-zinc-800 rounded">
                {x.map((xVal, i) => {
                    const left = ((xVal - xMin) / xRange) * 100;
                    const bottom = ((y[i] - yMin) / yRange) * 100;
                    return (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-purple-500 rounded-full transform -translate-x-1/2 translate-y-1/2"
                            style={{ left: `${left}%`, bottom: `${bottom}%` }}
                        />
                    );
                })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>{xMin.toFixed(1)}</span>
                <span>{x_label}</span>
                <span>{xMax.toFixed(1)}</span>
            </div>
        </div>
    );
}
