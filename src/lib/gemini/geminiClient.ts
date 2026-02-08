'use client';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface ColumnExtractionResult {
    column?: string;  // For bar/histogram charts
    x?: string;       // For scatter plots
    y?: string;       // For scatter plots
    confidence: number;
}

/**
 * Use Gemini to extract column names from a user's natural language prompt.
 * This makes Tambo's chart generation smarter by ensuring correct column names.
 */
export async function extractChartColumns(
    userMessage: string,
    availableColumns: string[],
    chartType: 'bar_chart' | 'histogram_chart' | 'scatter_chart' | 'correlation_heatmap'
): Promise<ColumnExtractionResult | null> {
    if (!apiKey) {
        console.warn('[Gemini] No API key found, falling back to regex extraction');
        return null;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const prompt = buildExtractionPrompt(userMessage, availableColumns, chartType);

        console.log('[Gemini] Extracting columns for:', { userMessage, chartType });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        console.log('[Gemini] Raw response:', responseText);

        const parsed = JSON.parse(responseText) as ColumnExtractionResult;

        // Validate that extracted columns actually exist in available columns
        const validateColumn = (col: string | undefined): string | undefined => {
            if (!col) return undefined;
            const match = availableColumns.find(ac => ac.toLowerCase() === col.toLowerCase());
            return match; // Return the correctly-cased version
        };

        const validated: ColumnExtractionResult = {
            column: validateColumn(parsed.column),
            x: validateColumn(parsed.x),
            y: validateColumn(parsed.y),
            confidence: parsed.confidence,
        };

        console.log('[Gemini] Validated extraction:', validated);

        return validated;
    } catch (error) {
        console.error('[Gemini] Extraction error:', error);
        return null;
    }
}

function buildExtractionPrompt(
    userMessage: string,
    availableColumns: string[],
    chartType: string
): string {
    const columnList = availableColumns.join(', ');

    if (chartType === 'scatter_chart') {
        return `You are a data visualization assistant. Extract the X and Y column names from the user's request.

Available columns in the dataset: [${columnList}]

User request: "${userMessage}"

Instructions:
1. Identify which column should be on the X-axis (usually mentioned first or before "vs", "against", "and")
2. Identify which column should be on the Y-axis (usually mentioned second or after "vs", "against", "and")
3. Match column names case-insensitively (e.g., "salary" matches "Salary", "experience_years" matches "Experience_Years")
4. If a column name uses underscores, the user might use spaces instead (e.g., "experience years" = "Experience_Years")
5. Set confidence to 1.0 if both columns are clearly mentioned, lower if you're guessing

Return JSON with: x (X-axis column), y (Y-axis column), confidence (0-1)`;
    } else {
        return `You are a data visualization assistant. Extract the column name from the user's request.

Available columns in the dataset: [${columnList}]

User request: "${userMessage}"

Instructions:
1. Identify which column the user wants to visualize
2. Match column names case-insensitively (e.g., "city" matches "City")
3. If a column name uses underscores, the user might use spaces instead
4. For histograms, prefer numeric columns. For bar charts, prefer categorical columns.
5. Set confidence to 1.0 if the column is clearly mentioned, lower if you're guessing

Return JSON with: column (the column name), confidence (0-1)`;
    }
}

// Cache to avoid redundant API calls
const extractionCache = new Map<string, ColumnExtractionResult>();

export async function extractChartColumnsWithCache(
    userMessage: string,
    availableColumns: string[],
    chartType: 'bar_chart' | 'histogram_chart' | 'scatter_chart' | 'correlation_heatmap'
): Promise<ColumnExtractionResult | null> {
    const cacheKey = `${chartType}:${userMessage}:${availableColumns.sort().join(',')}`;

    if (extractionCache.has(cacheKey)) {
        console.log('[Gemini] Using cached extraction');
        return extractionCache.get(cacheKey)!;
    }

    const result = await extractChartColumns(userMessage, availableColumns, chartType);

    if (result) {
        extractionCache.set(cacheKey, result);
    }

    return result;
}
