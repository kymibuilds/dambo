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

/**
 * Validate if a column exists, and if not, use Gemini to find the best match.
 * This is a safety net for when Tambo provides invalid column names.
 */
export async function validateAndFixColumn(
    invalidColumn: string,
    availableColumns: string[],
    chartType: 'bar_chart' | 'histogram_chart' | 'scatter_chart' | 'correlation_heatmap'
): Promise<string | null> {
    if (!invalidColumn || availableColumns.length === 0) return null;

    // First, check if it's already a valid column (case-insensitive)
    const exactMatch = availableColumns.find(
        c => c.toLowerCase() === invalidColumn.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // If no API key, try fuzzy matching
    if (!apiKey) {
        console.warn('[Gemini] No API key, using fuzzy match for column:', invalidColumn);
        return fuzzyMatchColumn(invalidColumn, availableColumns);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const prompt = `You are a data column matching assistant. The user tried to use a column called "${invalidColumn}" but it doesn't exist.

Available columns: [${availableColumns.join(', ')}]

Find the best matching column from the available columns. Consider:
1. Similar meaning (e.g., "director" might match "Manager" or "Supervisor")
2. Partial matches (e.g., "name" might match "Employee_Name")
3. Common synonyms

Return JSON: { "column": "best_matching_column", "confidence": 0.0-1.0 }
If no reasonable match exists, return: { "column": null, "confidence": 0 }`;

        console.log('[Gemini] Fixing invalid column:', invalidColumn);

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsed = JSON.parse(responseText) as { column: string | null; confidence: number };

        console.log('[Gemini] Column fix result:', parsed);

        if (parsed.column && parsed.confidence >= 0.5) {
            // Validate the suggested column exists
            const match = availableColumns.find(c => c.toLowerCase() === parsed.column!.toLowerCase());
            return match || null;
        }

        return null;
    } catch (error) {
        console.error('[Gemini] Column fix error:', error);
        return fuzzyMatchColumn(invalidColumn, availableColumns);
    }
}

/**
 * Simple fuzzy matching as fallback when Gemini is unavailable
 */
function fuzzyMatchColumn(search: string, columns: string[]): string | null {
    const searchLower = search.toLowerCase().replace(/[_\s-]/g, '');

    // Try to find a column that contains the search term
    for (const col of columns) {
        const colLower = col.toLowerCase().replace(/[_\s-]/g, '');
        if (colLower.includes(searchLower) || searchLower.includes(colLower)) {
            return col;
        }
    }

    return null;
}

