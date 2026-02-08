'use client';

import { Lightbulb, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DataPrepCardProps {
    tips: string[];
    severity?: 'info' | 'warning' | 'critical';
}

export function DataPrepCard({ tips, severity = 'info' }: DataPrepCardProps) {
    const getIcon = () => {
        switch (severity) {
            case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'info':
            default: return <Lightbulb className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = () => {
        switch (severity) {
            case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'warning': return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
            case 'info':
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        }
    };

    return (
        <div className={`rounded-xl border p-4 ${getBgColor()} shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
                {getIcon()}
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Data Preparation Tips</h3>
            </div>
            <ul className="space-y-2">
                {tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="mt-1 block min-w-[6px] w-[6px] h-[6px] rounded-full bg-current opacity-60" />
                        <span>{tip}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
