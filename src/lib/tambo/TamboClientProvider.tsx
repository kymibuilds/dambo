'use client';

import { TamboProvider } from '@tambo-ai/react';
import { HistogramChart, BarChart, ScatterChart, CorrelationHeatmap } from '@/components/charts';
import { DataPrepCard } from '@/components/analysis/DataPrepCard';
import { FeatureInsightsCard } from '@/components/analysis/FeatureInsightsCard';
import { z } from 'zod';

const components = [
    {
        name: 'histogram_chart',
        description: 'Display a histogram for a NUMERIC column. ALWAYS extract the column name from the user prompt (e.g., "histogram of salary" means column="Salary", "show age distribution" means column="Age"). Valid numeric columns include: Age, Salary, Experience_Years, Performance_Score. You MUST provide "column" (case-sensitive, use proper capitalization like "Salary" not "salary") and "datasetId". NEVER ask the user to select a column - infer it from their request.',
        component: HistogramChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            column: z.string().describe('The name of the numeric column to plot (e.g., Salary, Age, Experience_Years). REQUIRED.'),
            bins: z.number().optional().describe('Number of bins (default: 10)'),
        }),
    },
    {
        name: 'bar_chart',
        description: 'Display a bar chart for a CATEGORICAL column. ALWAYS extract the column name from the user prompt (e.g., "bar chart of city" means column="City", "show departments" means column="Department"). Valid categorical columns include: City, Department, Employment_Type, Is_Remote. You MUST provide "column" (case-sensitive, use proper capitalization like "City" not "city") and "datasetId". NEVER ask the user to select a column - infer it from their request.',
        component: BarChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            column: z.string().describe('The name of the categorical column to plot (e.g., City, Department, Employment_Type). REQUIRED.'),
        }),
    },
    {
        name: 'scatter_chart',
        description: 'Display a scatter plot of TWO NUMERIC columns with optional color customization. ALWAYS extract both column names from the user prompt (e.g., "scatter plot of age vs salary" means x="Age" and y="Salary"). Valid numeric columns: Age, Salary, Experience_Years, Performance_Score. Supported colors: red, blue, green, purple, orange, pink, yellow, cyan, indigo, teal. If user mentions a color (e.g., "with red dots"), set color accordingly. You MUST provide "x", "y" (case-sensitive) and "datasetId".',
        component: ScatterChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            x: z.string().describe('Column for X axis (e.g., Age, Experience_Years). MUST be numeric. REQUIRED.'),
            y: z.string().describe('Column for Y axis (e.g., Salary, Performance_Score). MUST be numeric. REQUIRED.'),
            color: z.string().optional().describe('Dot color. Options: red, blue, green, purple, orange, pink, yellow, cyan, indigo, teal. Default: indigo'),
        }),
    },
    {
        name: 'correlation_heatmap',
        description: 'Display a correlation heatmap for all numeric columns. Use this when users ask to see correlations, relationships between all variables, or a correlation matrix. You MUST provide "datasetId".',
        component: CorrelationHeatmap,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
        }),
    },
    {
        name: 'data_prep_card',
        description: 'Display an actionable list of data preparation tips for ML. Use this when the user asks for data cleaning advice, feature engineering steps, or how to prepare the data for machine learning. Also use it when Gemini provides specific data prep tips.',
        component: DataPrepCard,
        propsSchema: z.object({
            tips: z.array(z.string()).describe('List of actionable data preparation tips (e.g., "Impute missing values in Age", "One-hot encode City")'),
            severity: z.enum(['info', 'warning', 'critical']).optional().describe('Severity level of the data quality issues addressed'),
        }),
    },
    {
        name: 'feature_insights_card',
        description: 'Display insights about feature importance and target variables. Use this when the user asks about which columns are important, what to predict, or which columns to drop.',
        component: FeatureInsightsCard,
        propsSchema: z.object({
            likely_targets: z.array(z.string()).describe('List of columns that look like target variables (e.g., price, label, churn)'),
            important_features: z.array(z.string()).describe('List of columns that appear to be strong features based on correlation or naming'),
            drop_candidates: z.array(z.string()).optional().describe('List of columns that should likely be dropped (IDs, high cardinality)'),
        }),
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
