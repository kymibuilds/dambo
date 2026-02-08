'use client';

import { TamboProvider } from '@tambo-ai/react';
import {
    HistogramChart,
    BarChart,
    ScatterChart,
    CorrelationHeatmap,
    LineChart,
    PieChart,
    AreaChart,
    BoxPlotChart,
    TreemapChart,
    StackedBarChart
} from '@/components/charts';
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
    // ============ NEW CHART TYPES ============
    {
        name: 'line_chart',
        description: 'Display a line chart for TIME SERIES data. Use when user asks about trends over time, date analysis, or time-based patterns. Extract date column (e.g., "date", "Date", "created_at") and value column (e.g., "sales_amount", "revenue"). Optionally group by a category for multiple lines (e.g., "sales over time by region"). You MUST provide "dateColumn", "valueColumn", and "datasetId".',
        component: LineChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            dateColumn: z.string().describe('The date/time column (e.g., date, created_at, timestamp). REQUIRED.'),
            valueColumn: z.string().describe('The numeric value column to plot over time (e.g., sales_amount, revenue). REQUIRED.'),
            groupColumn: z.string().optional().describe('Optional category column for multiple lines (e.g., region, product_category).'),
        }),
    },
    {
        name: 'pie_chart',
        description: 'Display a pie or donut chart showing CATEGORICAL BREAKDOWN as proportions. Use when user asks about proportions, percentages, distribution of categories, market share, or "how much of each". Extract the categorical column from user request. Set donut=true for donut style. You MUST provide "column" and "datasetId".',
        component: PieChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            column: z.string().describe('The categorical column to show breakdown for (e.g., product_category, region). REQUIRED.'),
            limit: z.number().optional().describe('Maximum number of slices (default: 10, groups rest as "Other").'),
            donut: z.boolean().optional().describe('Set to true for donut chart style (hollow center).'),
        }),
    },
    {
        name: 'area_chart',
        description: 'Display a STACKED AREA chart for cumulative time series. Use when user asks about cumulative trends, stacked values over time, or contribution of categories over time. Requires date column, value column, and stack column. You MUST provide "dateColumn", "valueColumn", "stackColumn", and "datasetId".',
        component: AreaChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            dateColumn: z.string().describe('The date/time column (e.g., date, timestamp). REQUIRED.'),
            valueColumn: z.string().describe('The numeric value to stack (e.g., sales_amount). REQUIRED.'),
            stackColumn: z.string().describe('The category column to stack by (e.g., product_category, region). REQUIRED.'),
        }),
    },
    {
        name: 'boxplot_chart',
        description: 'Display a BOX PLOT showing statistical distribution with quartiles, median, min, max, and outliers. Use when user asks about distribution, outliers, quartiles, variance, or spread of a numeric column. You MUST provide "column" (must be numeric) and "datasetId".',
        component: BoxPlotChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            column: z.string().describe('The numeric column to analyze (e.g., sales_amount, customer_age). REQUIRED.'),
        }),
    },
    {
        name: 'treemap_chart',
        description: 'Display a TREEMAP for hierarchical data visualization showing proportions as nested rectangles. Use when user asks about hierarchical breakdown, nested categories, or proportional sizes across groups. Requires grouping columns (comma-separated for hierarchy) and value column. You MUST provide "groupColumns", "valueColumn", and "datasetId".',
        component: TreemapChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            groupColumns: z.string().describe('Comma-separated grouping columns for hierarchy (e.g., "region,product_category"). REQUIRED.'),
            valueColumn: z.string().describe('The numeric value for sizing rectangles (e.g., sales_amount). REQUIRED.'),
        }),
    },
    {
        name: 'stacked_bar_chart',
        description: 'Display a STACKED BAR chart for grouped categorical comparisons. Use when user asks to compare categories with sub-groups, grouped bars, or stacked categories. Requires category column and stack column. You MUST provide "categoryColumn", "stackColumn", and "datasetId".',
        component: StackedBarChart,
        propsSchema: z.object({
            datasetId: z.string().describe('The ID of the dataset to visualize'),
            categoryColumn: z.string().describe('The main category axis column (e.g., region). REQUIRED.'),
            stackColumn: z.string().describe('The column to stack/group by (e.g., product_category). REQUIRED.'),
            valueColumn: z.string().optional().describe('Optional value column for summing. If omitted, counts occurrences.'),
        }),
    },
    // ============ ANALYSIS CARDS ============
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
