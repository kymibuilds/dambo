'use client';

import { Target, Sparkles, AlertCircle } from 'lucide-react';

interface FeatureInsightsCardProps {
    likely_targets: string[];
    important_features: string[];
    drop_candidates?: string[];
}

export function FeatureInsightsCard({
    likely_targets = [],
    important_features = [],
    drop_candidates = []
}: FeatureInsightsCardProps) {
    return (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Feature Insights</h3>
            </div>

            <div className="space-y-4">
                {likely_targets.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">
                            <Target className="w-3 h-3" />
                            Potential Targets
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {likely_targets.map((target, i) => (
                                <span key={i} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm rounded-md border border-emerald-100 dark:border-emerald-800">
                                    {target}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {important_features.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                            <Sparkles className="w-3 h-3" />
                            Key Features
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {important_features.map((feature, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-md border border-blue-100 dark:border-blue-800">
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {drop_candidates && drop_candidates.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                            <AlertCircle className="w-3 h-3" />
                            Consider Dropping
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {drop_candidates.map((col, i) => (
                                <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 line-through opacity-70">
                                    {col}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
