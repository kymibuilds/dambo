import { HistogramChart } from '@/components/charts/HistogramChart';
import { BarChart } from '@/components/charts/BarChart';
import { ScatterChart } from '@/components/charts/ScatterChart';
import { CorrelationHeatmap } from '@/components/charts/CorrelationHeatmap';

// Tambo component registry
// Maps component names to React components for AI-driven rendering
export const tamboRegistry = {
    histogram_chart: HistogramChart,
    bar_chart: BarChart,
    scatter_chart: ScatterChart,
    correlation_heatmap: CorrelationHeatmap,
} as const;

export type TamboComponentName = keyof typeof tamboRegistry;

// Helper to render a Tambo component by name
export function renderTamboComponent(name: string, props: Record<string, unknown>) {
    const Component = tamboRegistry[name as TamboComponentName];
    if (!Component) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Component {...(props as any)} />;
}
