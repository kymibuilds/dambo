'use client';

import { useState, useCallback } from 'react';
import { fetchQuickAnalysis, type QuickAnalysisData } from '@/lib/api/visualizations';

export interface UseQuickAnalysisResult {
    data: QuickAnalysisData | null;
    isLoading: boolean;
    error: string | null;
    runAnalysis: (datasetId: string) => Promise<QuickAnalysisData | null>;
    reset: () => void;
}

export function useQuickAnalysis(): UseQuickAnalysisResult {
    const [data, setData] = useState<QuickAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = useCallback(async (datasetId: string): Promise<QuickAnalysisData | null> => {
        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            const result = await fetchQuickAnalysis(datasetId);
            setData(result);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to run quick analysis';
            setError(message);
            console.error('[useQuickAnalysis] Error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        data,
        isLoading,
        error,
        runAnalysis,
        reset,
    };
}
