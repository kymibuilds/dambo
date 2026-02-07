"use client";

import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, Sparkles, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import Link from "next/link";

export default function DashboardPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isAddingDataset, setIsAddingDataset] = useState(false);
    const [newDatasetTitle, setNewDatasetTitle] = useState("");

    const [datasets, setDatasets] = useState([
        {
            id: 'A7X2',
            title: "Q1 Sales Analytics",
            tags: ["Sales", "2024", "Revenue"],
            summary: "regional sales performance trends with quarterly growth metrics across northern territories",
            date: "Feb 8, 2026 • 1:09 AM"
        },
        {
            id: 'B9K1',
            title: "User Retention Data",
            tags: ["Product", "Retention", "SaaS"],
            summary: "weekly active user cohort analysis focusing on day-30 retention and churn velocity",
            date: "Feb 7, 2026 • 11:45 PM"
        },
        {
            id: 'C4M3',
            title: "Inventory Logs",
            tags: ["Logistics", "Stock"],
            summary: "real-time inventory levels across global distribution centers with predictive stockout alerts",
            date: "Feb 7, 2026 • 2:30 PM"
        },
        {
            id: 'D8H9',
            title: "Beta Feedback",
            tags: ["Feedback", "Research"],
            summary: "qualitative sentiment analysis from the initial closed beta cohort of early adopters",
            date: "Feb 6, 2026 • 9:15 AM"
        }
    ]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const handleCreateDataset = () => {
        if (newDatasetTitle.trim()) {
            const newId = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newDataset = {
                id: newId,
                title: newDatasetTitle.trim(),
                tags: ["New"],
                summary: "manually created dataset waiting for AI analysis and categorization",
                date: new Date().toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                }).replace(',', ' •')
            };
            setDatasets([newDataset, ...datasets]);
            setIsAddingDataset(false);
            setNewDatasetTitle("");
        }
    };

    const handleSaveTitle = (id: string) => {
        if (editValue.trim()) {
            setDatasets(datasets.map(d => d.id === id ? { ...d, title: editValue.trim() } : d));
        }
        setEditingId(null);
    };

    const removeTag = (datasetId: string, tagToRemove: string) => {
        setDatasets(datasets.map(d => {
            if (d.id === datasetId) {
                return { ...d, tags: d.tags.filter(t => t !== tagToRemove) };
            }
            return d;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Datasets</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your datasets here.</p>
                    </div>
                </div>
                <div className="flex justify-end -mt-4">
                    <div className="flex items-center gap-0.5 p-0.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setViewMode('grid')}
                            className={`h-6 w-6 p-0 rounded-md hover:bg-transparent ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-100' : 'text-zinc-400'}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setViewMode('list')}
                            className={`h-6 w-6 p-0 rounded-md hover:bg-transparent ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-100' : 'text-zinc-400'}`}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className={viewMode === 'grid' ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3"}>
                {datasets.map((dataset) => (
                    <Link key={dataset.id} href={`/dashboard/${dataset.id}`} className="block group/card">
                        <div className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 ${viewMode === 'grid' ? 'flex-col justify-between h-[200px]' : 'flex-row items-center justify-between py-4'}`}>
                            <div className={viewMode === 'grid' ? "space-y-3" : "flex items-center gap-8 flex-1"}>
                                <div className={viewMode === 'grid' ? "flex items-start justify-between" : "min-w-[200px]"}>
                                    <div className="flex items-center gap-2 group min-h-[28px]">
                                        {editingId === dataset.id ? (
                                            <Input
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveTitle(dataset.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                onBlur={() => handleSaveTitle(dataset.id)}
                                                className="h-7 text-sm font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-zinc-300/50 bg-transparent w-full"
                                                style={{ fontFamily: 'var(--font-shippori)' }}
                                            />
                                        ) : (
                                            <>
                                                <h4 className="font-semibold" style={{ fontFamily: 'var(--font-shippori)' }}>{dataset.title}</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditingId(dataset.id);
                                                        setEditValue(dataset.title);
                                                    }}
                                                    className="h-4 w-4 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-900 transition-all p-0"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={viewMode === 'grid' ? "flex flex-wrap items-center gap-1.5" : "flex flex-wrap items-center gap-1.5 flex-1"}>
                                    {dataset.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-none px-1.5 py-0 text-[10px] gap-1 transition-all">
                                            {tag}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeTag(dataset.id, tag);
                                                }}
                                                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                            >
                                                <X className="h-2 w-2" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                <p className={`text-[11px] text-zinc-400 font-medium leading-relaxed ${viewMode === 'list' ? 'flex-1 line-clamp-1' : ''}`}>
                                    {dataset.summary}
                                </p>
                            </div>

                            <div className={viewMode === 'grid' ? "pt-3 flex items-center justify-between border-t border-zinc-50 dark:border-zinc-900 mt-auto" : "pl-8 border-l border-zinc-100 dark:border-zinc-900 ml-4"}>
                                <p className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium uppercase tracking-wider whitespace-nowrap">{dataset.date}</p>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Add New Dataset card */}
                {isAddingDataset ? (
                    <div className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex flex-col transition-all animate-in fade-in zoom-in-95 duration-200 ${viewMode === 'grid' ? 'h-[200px] justify-between' : 'min-h-[100px] w-full'}`}>
                        <div className="space-y-3">
                            <Input
                                autoFocus
                                placeholder="Dataset name..."
                                value={newDatasetTitle}
                                onChange={(e) => setNewDatasetTitle(e.target.value)}
                                className="h-8 text-sm font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-zinc-300/50 bg-transparent w-full"
                                style={{ fontFamily: 'var(--font-shippori)' }}
                            />

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] text-zinc-400 font-bold tracking-tight uppercase">Source Data</label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-dashed border-zinc-300 text-zinc-500 text-[11px] justify-start gap-2 hover:bg-zinc-50 transition-colors px-3"
                                    onClick={() => document.getElementById('dataset-upload')?.click()}
                                >
                                    <Plus className="h-3 w-3" />
                                    Upload File (.csv, .json)
                                </Button>
                                <input id="dataset-upload" type="file" className="hidden" />
                            </div>
                        </div>
                        <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mt-4' : 'mt-2'}`}>
                            <Button size="xs" onClick={handleCreateDataset} className="h-7 px-3 text-[10px] font-bold tracking-tight">
                                CREATE
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => setIsAddingDataset(false)} className="h-7 px-3 text-[10px] font-bold tracking-tight text-zinc-400">
                                CANCEL
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        onClick={() => setIsAddingDataset(true)}
                        className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex flex-col items-center justify-center border-dashed hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors ${viewMode === 'grid' ? 'h-[200px]' : 'min-h-[60px] py-4 flex-row gap-4'}`}
                    >
                        <Plus className={viewMode === 'grid' ? "h-6 w-6 mb-2 text-zinc-400" : "h-4 w-4 text-zinc-400"} />
                        <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-shippori)' }}>Add new dataset</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
