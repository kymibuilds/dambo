'use client';

import { TamboProvider } from '@tambo-ai/react';
import { HistogramChart, BarChart, ScatterChart, CorrelationHeatmap } from '@/components/charts';

const components = [
    {
        name: 'histogram_chart',
        description: 'Display a histogram for a numeric column. You MUST provide the "column" name. You MUST provide "datasetId".',
        component: HistogramChart,
        propsDefinition: {
            datasetId: { type: 'string', description: 'The ID of the dataset to visualize' },
            column: { type: 'string', description: 'The name of the numeric column to plot' },
            bins: { type: 'number', description: 'Number of bins (default: 10)' },
        },
    },
    {
        name: 'bar_chart',
        description: 'Display a bar chart for a categorical column. You MUST provide the "column" name. You MUST provide "datasetId".',
        component: BarChart,
        propsDefinition: {
            datasetId: { type: 'string', description: 'The ID of the dataset to visualize' },
            column: { type: 'string', description: 'The name of the categorical column to plot' },
        },
    },
    {
        name: 'scatter_chart',
        description: 'Display a scatter plot of two numeric columns. You MUST provide "x" and "y" columns. You MUST provide "datasetId".',
        component: ScatterChart,
        propsDefinition: {
            datasetId: { type: 'string', description: 'The ID of the dataset to visualize' },
            x: { type: 'string', description: 'Column for X axis' },
            y: { type: 'string', description: 'Column for Y axis' },
        },
    },
    {
        name: 'correlation_heatmap',
        description: 'Display a correlation heatmap for all numeric columns. You MUST provide "datasetId".',
        component: CorrelationHeatmap,
        propsDefinition: {
            datasetId: { type: 'string', description: 'The ID of the dataset to visualize' },
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
