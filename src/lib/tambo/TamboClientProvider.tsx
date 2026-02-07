'use client';

import { TamboProvider } from '@tambo-ai/react';
import { HistogramChart, BarChart, ScatterChart, CorrelationHeatmap } from '@/components/charts';

const components = [
    {
        name: 'histogram_chart',
        description: 'Display a histogram for numeric column distribution',
        component: HistogramChart,
        propsDefinition: {
            column: { type: 'string', description: 'Column name' },
            bins: { type: 'array', description: 'Bin edges' },
            counts: { type: 'array', description: 'Count per bin' },
        },
    },
    {
        name: 'bar_chart',
        description: 'Display a bar chart for categorical data',
        component: BarChart,
        propsDefinition: {
            column: { type: 'string', description: 'Column name' },
            categories: { type: 'array', description: 'Category names' },
            counts: { type: 'array', description: 'Count per category' },
        },
    },
    {
        name: 'scatter_chart',
        description: 'Display a scatter plot for two numeric columns',
        component: ScatterChart,
        propsDefinition: {
            x_label: { type: 'string', description: 'X-axis label' },
            y_label: { type: 'string', description: 'Y-axis label' },
            x: { type: 'array', description: 'X values' },
            y: { type: 'array', description: 'Y values' },
        },
    },
    {
        name: 'correlation_heatmap',
        description: 'Display a correlation matrix heatmap',
        component: CorrelationHeatmap,
        propsDefinition: {
            columns: { type: 'array', description: 'Column names' },
            matrix: { type: 'array', description: '2D correlation matrix' },
        },
    },
];

export function TamboClientProvider({ children }: { children: React.ReactNode }) {
    const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

    if (!apiKey) {
        console.warn('Tambo API key not found. AI features will be disabled.');
        return <>{children}</>;
    }

    return (
        <TamboProvider
            apiKey={apiKey}
            components={components}
        >
            {children}
        </TamboProvider>
    );
}
