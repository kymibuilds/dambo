"use client";

import { Button } from "@/components/ui/button";
import { Database, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isProjectPage = pathname.split('/').length > 2 && pathname !== '/dashboard/integrations';

    return (
        <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {!isProjectPage && (
                <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hidden md:flex flex-col">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Dambo</h2>
                    </div>
                    <nav className="flex-1 px-4 space-y-2">
                        <Link href="/dashboard" className="block">
                            <Button variant="ghost" className="w-full justify-start gap-2 text-zinc-600 dark:text-zinc-400">
                                <Database className="h-4 w-4" />
                                Datasets
                            </Button>
                        </Link>
                        <Link href="/dashboard/integrations" className="block">
                            <Button variant="ghost" className="w-full justify-start gap-2 text-zinc-600 dark:text-zinc-400">
                                <Zap className="h-4 w-4" />
                                Integrations
                            </Button>
                        </Link>
                    </nav>
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group">
                            <div className="size-8 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">TR</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate" style={{ fontFamily: 'var(--font-shippori)' }}>Team Rugpull</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate lowercase tracking-tight">team@dambo.ai</p>
                            </div>
                        </button>
                    </div>
                </aside>
            )}
            <main className={`flex-1 ${isProjectPage ? '' : 'p-8'}`}>
                {children}
            </main>
        </div>
    );
}
