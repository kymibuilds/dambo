"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Send,
    Sparkles,
    Maximize2,
    RotateCcw,
    Share2,
    Play,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function ProjectPage({ params }: { params: { id: string } }) {
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([
        { role: 'assistant', content: "Hello! I've analyzed your dataset. You can ask me to visualize trends, filter data, or generate a custom UI component based on your performance metrics." }
    ]);

    // Resizable chat state
    const [chatWidth, setChatWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (e: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < 800) {
                setChatWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing]);

    const handleSend = () => {
        if (!message.trim()) return;
        setChat([...chat, { role: 'user', content: message }]);
        setMessage("");
        setTimeout(() => {
            setChat(prev => [...prev, { role: 'assistant', content: "I'm processing that request now. I'll update the canvas with the new visualization." }]);
        }, 1000);
    };

    return (
        <div ref={containerRef} className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Left: Canvas Area */}
            <div className="flex-1 flex flex-col relative group">
                {/* Back Button */}
                <div className="absolute top-4 left-4 z-20">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <ArrowLeft className="size-3.5 text-zinc-500" />
                        </Button>
                    </Link>
                </div>

                {/* Canvas Toolbar (Centralized/Floating) */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-lg border border-zinc-200 dark:border-zinc-800 z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button variant="ghost" size="xs" className="h-7 w-7 p-0 rounded-md text-zinc-500 hover:text-zinc-900">
                        <RotateCcw className="size-3.5" />
                    </Button>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                    <Button variant="ghost" size="xs" className="h-7 px-3 gap-2 rounded-md text-zinc-500 hover:text-zinc-900 text-[11px] font-bold tracking-tight">
                        <Play className="size-3.5" />
                        RUN
                    </Button>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                    <Button variant="ghost" size="xs" className="h-7 w-7 p-0 rounded-md text-zinc-500 hover:text-zinc-900">
                        <Maximize2 className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="xs" className="h-7 w-7 p-0 rounded-md text-zinc-500 hover:text-zinc-900">
                        <Share2 className="size-3.5" />
                    </Button>
                </div>

                {/* Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}
                />

                <div className="flex-1 flex items-center justify-center p-20 relative overflow-y-auto">
                    {/* Mock Realtime UI Component */}
                    <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500 ring-1 ring-zinc-100 dark:ring-zinc-800/50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Performance Overview</h2>
                                <p className="text-xs text-zinc-500">Real-time visualization of your dataset trends</p>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-full gap-2 border-zinc-200 text-[11px] font-bold tracking-tight h-8">
                                <Sparkles className="size-3 text-violet-500" />
                                AI INSIGHTS
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Revenue', value: '$42,390', trend: '+12.5%' },
                                { label: 'Active Users', value: '1,284', trend: '+8.2%' },
                                { label: 'Churn Rate', value: '2.4%', trend: '-0.5%' },
                            ].map((stat, i) => (
                                <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{stat.label}</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                                        <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="h-48 w-full bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 flex flex-col items-center justify-center gap-3 relative overflow-hidden group/chart">
                            <div className="flex items-end gap-2 h-24 relative z-10">
                                {[40, 70, 50, 90, 60, 80, 45, 65, 55, 75, 40, 85].map((h, i) => (
                                    <div
                                        key={i}
                                        className="w-3 bg-zinc-900 dark:bg-zinc-100 rounded-t-[2px] opacity-10 group-hover/chart:opacity-30 hover:!opacity-100 transition-all cursor-pointer"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] relative z-10">Monthly Growth Trend</p>
                        </div>

                        <div className="pt-4 border-t border-zinc-50 dark:border-zinc-800 flex justify-end">
                            <Button size="sm" className="rounded-lg text-[11px] font-bold tracking-tight">EXPORT REPORT</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={startResizing}
                className="w-1.5 hover:w-2 transition-all bg-transparent cursor-col-resize z-40 group relative flex items-center justify-center"
            >
                <div className="h-full w-px bg-zinc-200 dark:bg-zinc-800" />
                {/* Subtle Grabber Hint */}
                <div className="absolute h-8 w-1 rounded-full bg-zinc-200 dark:bg-zinc-800 group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600 transition-colors" />
            </div>

            {/* Right: Chat Interface (Full Edge-to-Edge) */}
            <div
                style={{ width: `${chatWidth}px` }}
                className="flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0"
            >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none pt-10">
                    {chat.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-lg shadow-sm font-medium'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-4 py-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-6">
                    <div className="relative flex items-center">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Message project..."
                            className="h-12 pl-4 pr-12 rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400 text-sm"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute right-2 p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <Send className="size-4" />
                        </button>
                    </div>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-3 text-center uppercase tracking-widest font-bold">
                        Assistant may produce inaccurate outputs.
                    </p>
                </div>
            </div>
        </div>
    );
}
