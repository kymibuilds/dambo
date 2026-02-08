'use client';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

interface ColumnExtractionResult {
    column?: string;  // For bar/histogram charts
    x?: string;       // For scatter plots
    y?: string;       // For scatter plots
    dateColumn?: string; // For line/area charts
    valueColumn?: string; // For line/area charts
    categoryColumn?: string; // For stacked bar charts
    stackColumn?: string; // For stacked bar/area charts
    groupColumns?: string; // For treemaps
    confidence: number;
}

/**
 * Use Gemini to extract column names from a natural language prompt.
 * This makes Tambo's chart generation smarter by ensuring correct column names.
 */
export async function extractChartColumns(
    userMessage: string,
    availableColumns: string[],
    chartType: string
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
            dateColumn: validateColumn(parsed.dateColumn),
            valueColumn: validateColumn(parsed.valueColumn),
            categoryColumn: validateColumn(parsed.categoryColumn),
            stackColumn: validateColumn(parsed.stackColumn),
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
3. Match column names case-insensitively (e.g., "salary" matches "Salary")
4. Set confidence to 1.0 if both columns are clearly mentioned, lower if you're guessing

Return JSON with: x, y, confidence (0-1)`;
    } else if (chartType === 'line_chart' || chartType === 'area_chart') {
        return `You are a data visualization assistant. Extract the date and value column names.

Available columns in the dataset: [${columnList}]

User request: "${userMessage}"

Instructions:
1. Identify the Date/Time column (e.g., "date", "created_at", year, month) -> dateColumn
2. Identify the numeric Value column to plot (e.g., "sales", "revenue", "count") -> valueColumn
3. For area charts, look for a stacking category (e.g., "by region") -> stackColumn (optional)
4. Match column names case-insensitively

Return JSON with: dateColumn, valueColumn, stackColumn (optional), confidence (0-1)`;
    } else if (chartType === 'stacked_bar_chart') {
        return `You are a data visualization assistant. Extract the category and stack column names.

Available columns: [${columnList}]
User request: "${userMessage}"

Instructions:
1. Identify the main Category column (e.g., axis) -> categoryColumn
2. Identify the Stack/Group column (e.g., "broken down by") -> stackColumn
3. Match column names case-insensitively

Return JSON with: categoryColumn, stackColumn, confidence (0-1)`;
    } else if (chartType === 'treemap_chart') {
        return `You are a data visualization assistant. Extract the value column for sizing.

Available columns: [${columnList}]
User request: "${userMessage}"

Instructions:
1. Identify the numeric Value column for sizing rectangles -> valueColumn
2. Match column names case-insensitively

Return JSON with: valueColumn, confidence (0-1)`;
    } else {
        return `You are a data visualization assistant. Extract the relevant column name.

Available columns in the dataset: [${columnList}]

User request: "${userMessage}"

Instructions:
1. Identify which column the user wants to visualize
2. Match column names case-insensitively (e.g., "city" matches "City")
3. For histograms, prefer numeric columns. For bar/pie charts, prefer categorical columns.
4. Set confidence to 1.0 if the column is clearly mentioned, lower if you're guessing

Return JSON with: column (the column name), confidence (0-1)`;
    }
}

// Cache to avoid redundant API calls
const extractionCache = new Map<string, ColumnExtractionResult>();

export async function extractChartColumnsWithCache(
    userMessage: string,
    availableColumns: string[],
    chartType: string
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
    chartType: string
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

// ============ CHART MODIFICATION PARSING ============

export interface ChartModificationResult {
    action: 'change_type' | 'change_column' | 'add_filter' | 'change_both' | 'unknown';
    newChartType?: string;
    newColumn?: string;
    filter?: {
        column: string;
        operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains';
        value: number | string;
    };
    explanation?: string;
}

/**
 * Parse a user's chart modification request using Gemini.
 * Used in node personal chat to understand what changes the user wants.
 */
export async function parseChartModification(
    userMessage: string,
    currentChartType: string,
    currentColumn: string | undefined,
    availableColumns: string[],
    datasetId: string
): Promise<ChartModificationResult> {
    // Default result for when Gemini can't be used
    const defaultResult: ChartModificationResult = { action: 'unknown' };

    if (!apiKey) {
        console.warn('[Gemini] No API key for chart modification parsing');
        return defaultResult;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                responseMimeType: 'application/json',
            },
        });

        const prompt = `
    You are an expert data visualization assistant. Your goal is to understand how the user wants to modify their current chart.
    
    Current State:
    - Chart Type: ${currentChartType}
    - Current Column: ${currentColumn || 'None'}
    - Available Columns: ${JSON.stringify(availableColumns)}
    - User Request: "${userMessage}"
    
    Determine the user's intent:
    1. Change Chart Type (e.g., "make it a pie chart", "show as bar")
       - Output action: "change_type"
       - valid types: bar_chart, pie_chart, line_chart, scatter_chart, histogram_chart, boxplot_chart, area_chart, treemap_chart
       
    2. Change Column/Variable (e.g., "show Age instead", "change to Salary")
       - Output action: "change_column"
       - Match the user's requested column to one of the Available Columns.
       
    3. Add/Update Filter (e.g., "show count > 100", "only where City is New York", "filter values below 50")
       - Output action: "add_filter"
       - Extract filter details: column, operator, value
       
    4. Change Both Type and Column (e.g., "show histogram of Age", "plot Salary as line chart")
       - Output action: "change_both"
       
    5. Change Style/Color (e.g., "make it red", "change color to #ff0000", "use purple theme")
       - Output action: "change_style"
       - Extract color: hex code or standard color name (e.g. "red", "blue", "#FF5733")

    6. Unknown/Unclear
       - If the request is not related to chart modification or is unintelligible.
       - Output action: "unknown"

    Return a JSON object with:
    - action: string
    - newChartType: string (optional)
    - newColumn: string (optional)
    - filter: { column, operator, value } (optional)
    - color: string (optional)
    - explanation: short description of what you did (e.g., "Changed chart to Pie Chart")
    
    Response format:
    {
      "action": "change_type",
      "newChartType": "pie_chart",
      "explanation": "Switched to pie chart view"
    }
    `;

        console.log('[Gemini] Parsing chart modification:', userMessage);

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        console.log('[Gemini] Modification parse result:', responseText);

        const parsed = JSON.parse(responseText) as ChartModificationResult;

        // Basic validation
        if (parsed.action === 'change_column' || parsed.action === 'change_both') {
            if (parsed.newColumn && !availableColumns.includes(parsed.newColumn)) {
                // Try to fuzzy match
                const match = availableColumns.find(c => c.toLowerCase() === parsed.newColumn?.toLowerCase());
                if (match) parsed.newColumn = match;
            }
        }

        // Validate filter column if present
        if (parsed.filter?.column) {
            const match = availableColumns.find(c => c.toLowerCase() === parsed.filter!.column.toLowerCase());
            if (match) {
                parsed.filter.column = match;
            } else {
                // Default to current column if filter column invalid, or first available column
                parsed.filter.column = currentColumn || availableColumns[0];
            }
        }

        return parsed;
    } catch (error) {
        console.error('[Gemini] Chart modification parse error:', error);
        return defaultResult;
    }
}
