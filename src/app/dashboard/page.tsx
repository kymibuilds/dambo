"use client";

import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, LayoutGrid, List, Loader2, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { listProjects, createProject, type Project } from "@/lib/api/projects";

interface DisplayProject {
    id: string;
    title: string;
    tags: string[];
    summary: string;
    date: string;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).replace(',', ' •');
}

function projectToDisplay(project: Project): DisplayProject {
    return {
        id: project.project_id,
        title: project.name,
        tags: ["Project"],
        summary: "Dataset project ready for analysis and visualization",
        date: formatDate(project.created_at),
    };
}

export default function DashboardPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isAddingDataset, setIsAddingDataset] = useState(false);
    const [newDatasetTitle, setNewDatasetTitle] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [projects, setProjects] = useState<DisplayProject[]>([]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showKaggleNotice, setShowKaggleNotice] = useState(false);

    // Fetch projects on mount
    useEffect(() => {
        async function fetchProjects() {
            try {
                setIsLoading(true);
                setError(null);
                const data = await listProjects();
                setProjects(data.map(projectToDisplay));
            } catch (err) {
                console.error('Failed to fetch projects:', err);
                setError(err instanceof Error ? err.message : 'Failed to load projects');
            } finally {
                setIsLoading(false);
            }
        }
        fetchProjects();
    }, []);

    const handleCreateDataset = async () => {
        if (!newDatasetTitle.trim()) return;

        try {
            setIsCreating(true);
            setError(null);
            const newProject = await createProject(newDatasetTitle.trim());
            setProjects([projectToDisplay(newProject), ...projects]);
            setIsAddingDataset(false);
            setNewDatasetTitle("");
        } catch (err) {
            console.error('Failed to create project:', err);
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveTitle = (id: string) => {
        if (editValue.trim()) {
            setProjects(projects.map(d => d.id === id ? { ...d, title: editValue.trim() } : d));
        }
        setEditingId(null);
    };

    const removeTag = (projectId: string, tagToRemove: string) => {
        setProjects(projects.map(d => {
            if (d.id === projectId) {
                return { ...d, tags: d.tags.filter(t => t !== tagToRemove) };
            }
            return d;
        }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-500">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Projects</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your datasets and projects here.</p>
                    </div>
                </div>
                <div className="mt-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-semibold">Note:</span> The datasets shown below are reference examples for a quick overview of the project.
                        You can upload your own CSV files to create fully functional visualizations.
                        <span className="italic"> Kaggle API integration coming soon!</span>
                    </p>
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

            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                    {error}
                </div>
            )}

            <div className={viewMode === 'grid' ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3"}>
                {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/${project.id}`} className="block group/card">
                        <div className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex transition-all hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 ${viewMode === 'grid' ? 'flex-col justify-between h-[200px]' : 'flex-row items-center justify-between py-4'}`}>
                            <div className={viewMode === 'grid' ? "space-y-3" : "flex items-center gap-8 flex-1"}>
                                <div className={viewMode === 'grid' ? "flex items-start justify-between" : "min-w-[200px]"}>
                                    <div className="flex items-center gap-2 group min-h-[28px]">
                                        {editingId === project.id ? (
                                            <Input
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveTitle(project.id);
                                                    if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                onBlur={() => handleSaveTitle(project.id)}
                                                className="h-7 text-sm font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-zinc-300/50 bg-transparent w-full"
                                                style={{ fontFamily: 'var(--font-shippori)' }}
                                            />
                                        ) : (
                                            <>
                                                <h4 className="font-semibold" style={{ fontFamily: 'var(--font-shippori)' }}>{project.title}</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setEditingId(project.id);
                                                        setEditValue(project.title);
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
                                    {project.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-none px-1.5 py-0 text-[10px] gap-1 transition-all">
                                            {tag}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeTag(project.id, tag);
                                                }}
                                                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                            >
                                                <X className="h-2 w-2" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                <p className={`text-[11px] text-zinc-400 font-medium leading-relaxed ${viewMode === 'list' ? 'flex-1 line-clamp-1' : ''}`}>
                                    {project.summary}
                                </p>
                            </div>

                            <div className={viewMode === 'grid' ? "pt-3 flex items-center justify-between border-t border-zinc-50 dark:border-zinc-900 mt-auto" : "pl-8 border-l border-zinc-100 dark:border-zinc-900 ml-4"}>
                                <p className="text-[10px] text-zinc-300 dark:text-zinc-600 font-medium uppercase tracking-wider whitespace-nowrap">{project.date}</p>
                            </div>
                        </div>
                    </Link>
                ))}

                {/* Add New Project card */}
                {isAddingDataset ? (
                    <div className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex flex-col transition-all animate-in fade-in zoom-in-95 duration-200 ${viewMode === 'grid' ? 'h-[200px] justify-between' : 'min-h-[100px] w-full'}`}>
                        <div className="space-y-3">
                            <Input
                                autoFocus
                                placeholder="Project name..."
                                value={newDatasetTitle}
                                onChange={(e) => setNewDatasetTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isCreating) handleCreateDataset();
                                    if (e.key === 'Escape') setIsAddingDataset(false);
                                }}
                                className="h-8 text-sm font-semibold px-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-zinc-300/50 bg-transparent w-full"
                                style={{ fontFamily: 'var(--font-shippori)' }}
                                disabled={isCreating}
                            />

                            <p className="text-[10px] text-zinc-400">
                                Create a new project to upload and analyze your datasets.
                            </p>
                        </div>
                        <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mt-4' : 'mt-2'}`}>
                            <Button
                                size="xs"
                                onClick={handleCreateDataset}
                                className="h-7 px-3 text-[10px] font-bold tracking-tight"
                                disabled={isCreating || !newDatasetTitle.trim()}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        CREATING...
                                    </>
                                ) : (
                                    'CREATE'
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setIsAddingDataset(false)}
                                className="h-7 px-3 text-[10px] font-bold tracking-tight text-zinc-400"
                                disabled={isCreating}
                            >
                                CANCEL
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddingDataset(true)}
                            className={`rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex flex-col items-center justify-center border-dashed hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors ${viewMode === 'grid' ? 'h-[200px]' : 'min-h-[60px] py-4 flex-row gap-4'}`}
                        >
                            <Plus className={viewMode === 'grid' ? "h-6 w-6 mb-2 text-zinc-400" : "h-4 w-4 text-zinc-400"} />
                            <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-shippori)' }}>Add new project</span>
                        </Button>

                        {/* Add from Kaggle button */}
                        <div className="relative">
                            <Button
                                variant="outline"
                                onClick={() => setShowKaggleNotice(true)}
                                className={`rounded-xl border border-zinc-300/80 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-cyan-800/30 dark:text-zinc-50 p-6 flex flex-col items-center justify-center border-dashed hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-900/40 dark:hover:to-blue-900/40 transition-all ${viewMode === 'grid' ? 'h-[200px]' : 'min-h-[60px] py-4 flex-row gap-4'}`}
                            >
                                <div className={`relative ${viewMode === 'grid' ? 'mb-2' : ''}`}>
                                    <Database className={`${viewMode === 'grid' ? 'h-6 w-6' : 'h-4 w-4'} text-cyan-500 dark:text-cyan-400`} />
                                </div>
                                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300" style={{ fontFamily: 'var(--font-shippori)' }}>Add from Kaggle</span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 ${viewMode === 'grid' ? 'mt-2' : 'ml-2'}`}>Coming Soon</span>
                            </Button>

                            {/* Coming Soon Notice Popup */}
                            {showKaggleNotice && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div
                                        className="fixed inset-0 bg-black/20 dark:bg-black/40"
                                        onClick={() => setShowKaggleNotice(false)}
                                    />
                                    <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex flex-col items-center text-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/50 dark:to-blue-900/50 flex items-center justify-center">
                                                <Database className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: 'var(--font-shippori)' }}>Kaggle Integration</h4>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    We're working on Kaggle API integration to let you import datasets directly. Stay tuned!
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => setShowKaggleNotice(false)}
                                                className="w-full"
                                            >
                                                Got it
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
