"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Send,
    ArrowLeft,
    Plus,
    X,
    ArrowLeftRight,
    Upload,
    FileJson,
    Trash2,
    FileText
} from "lucide-react";
import Link from "next/link";
import { type Node } from '@xyflow/react';
import FlowCanvas from "@/components/canvas/FlowCanvas";

export default function ProjectPage() {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [chats, setChats] = useState([
        {
            id: 'initial',
            title: 'General',
            messages: [{ role: 'assistant', content: "Hello! I've analyzed your dataset. You can ask me to visualize trends, filter data, or generate a custom UI component based on your performance metrics." }]
        }
    ]);
    const [activeChatId, setActiveChatId] = useState('initial');
    const [message, setMessage] = useState("");
    const [projectFiles, setProjectFiles] = useState<{ id: string, name: string, type: string, size: string }[]>([
        { id: '1', name: 'main_dashboard.csv', type: 'CSV', size: '2.4 MB' },
        { id: '2', name: 'user_analytics.json', type: 'JSON', size: '1.1 MB' }
    ]);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);

    const handleDeleteFile = (id: string) => {
        setProjectFiles(prev => prev.filter(f => f.id !== id));
    };

    // Resizable chat state
    const [chatWidth, setChatWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 250 && newWidth < 800) {
                setChatWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [activeChat.messages, scrollToBottom]);

    const handleSend = () => {
        if (!message.trim()) return;

        const updatedChats = chats.map(c => {
            if (c.id === activeChatId) {
                return {
                    ...c,
                    messages: [...c.messages, { role: 'user', content: message }]
                };
            }
            return c;
        });

        setChats(updatedChats);
        setMessage("");

        setTimeout(() => {
            setChats(prevChats => prevChats.map(c => {
                if (c.id === activeChatId) {
                    return {
                        ...c,
                        messages: [...c.messages, { role: 'assistant', content: "I'm processing that in this specific session. I'll update the canvas with the visualization shortly." }]
                    };
                }
                return c;
            }));
        }, 1000);
    };

    const handleNodeSelect = (node: Node | null) => {
        if (!node) {
            setActiveChatId('initial');
            return;
        }

        const chatId = node.id;
        const existingChat = chats.find(c => c.id === chatId);

        if (existingChat) {
            setActiveChatId(chatId);
        } else {
            const label = (node.data?.label as string) || `Node ${node.id}`;
            const newChat = {
                id: chatId,
                title: label,
                messages: [{ role: 'assistant', content: `Chatting with ${label}. How can I help?` }]
            };
            setChats(prev => [...prev, newChat]);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newFile = {
                id: Math.random().toString(36).substring(7),
                name: file.name,
                type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
                size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            };
            setProjectFiles(prev => [...prev, newFile]);

            // Add a small notification message to the chat
            const assistantMsg = {
                role: 'assistant',
                content: `I've added "${file.name}" to your project collection. You can now mention it using "@" in our chat to start analyzing its contents.`
            };
            setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c));
        }
    };

    const handleMessageChange = (val: string) => {
        setMessage(val);

        const lastAtPos = val.lastIndexOf('@');
        if (lastAtPos !== -1 && (lastAtPos === 0 || val[lastAtPos - 1] === ' ')) {
            const searchStr = val.substring(lastAtPos + 1);
            if (!searchStr.includes(' ')) {
                setMentionSearch(searchStr);
                setShowMentions(true);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentions(false);
    };

    const selectMention = (fileName: string) => {
        const lastAtPos = message.lastIndexOf('@');
        const newMessage = message.substring(0, lastAtPos) + `@${fileName} ` + message.substring(message.indexOf(' ', lastAtPos) !== -1 ? message.indexOf(' ', lastAtPos) : message.length);
        setMessage(newMessage);
        setShowMentions(false);
    };

    const filteredFiles = projectFiles.filter(f =>
        f.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    return (
        <div className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Left: Canvas Area */}
            <div className="flex-1 flex flex-col relative group overflow-hidden">
                {/* Back Button */}
                {/* Top Right Actions: Expanding Upload Panel */}
                <div
                    className={`absolute top-3 right-3 z-30 transition-all duration-300 ease-in-out bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm overflow-hidden flex flex-col ${isUploadExpanded ? 'w-72 max-h-96' : 'w-24 max-h-[28px]'
                        }`}
                >
                    <div
                        onClick={() => !isUploadExpanded && setIsUploadExpanded(true)}
                        className={`flex items-center justify-between px-3 h-7 shrink-0 transition-colors ${!isUploadExpanded ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50' : 'border-b border-zinc-200 dark:border-zinc-800'}`}
                    >
                        {!isUploadExpanded ? (
                            <div className="flex items-center gap-2">
                                <Upload className="size-3.5 text-zinc-600 dark:text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Upload</span>
                            </div>
                        ) : (
                            <>
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Files</span>
                                <div className="flex items-center gap-1 -mr-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                        title="Upload New"
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsUploadExpanded(false); }}
                                        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={`flex-1 overflow-y-auto p-1 scrollbar-none transition-opacity duration-200 ${isUploadExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {projectFiles.length > 0 ? (
                            <div className="space-y-0.5">
                                {projectFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="group/file flex items-center justify-between p-2 rounded-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {file.type === 'JSON' ? (
                                                <FileJson className="size-3.5 text-amber-500 shrink-0" />
                                            ) : (
                                                <FileText className="size-3.5 text-blue-500 shrink-0" />
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                                    {file.name}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {file.size} • {file.type}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFile(file.id)}
                                            className="opacity-0 group-hover/file:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-zinc-400 gap-2">
                                <Upload className="size-6 opacity-20" />
                                <span className="text-[10px] font-medium">No files uploaded</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>

                <div className="absolute top-3 left-3 z-20">
                    <Link href="/dashboard">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md bg-white/70 dark:bg-zinc-900/70 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all backdrop-blur-sm shadow-sm"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="size-3.5" />
                        </Button>
                    </Link>
                </div>

                {/* React Flow Canvas */}
                <div className="h-full w-full">
                    <FlowCanvas onNodeSelect={handleNodeSelect} />
                </div>
            </div>

            {/* Right: Chat Interface */}
            <div className="relative flex pointer-events-none z-30 h-full">
                {/* Resize Handle */}
                <div
                    className="w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-40 h-full pointer-events-auto"
                    onMouseDown={startResizing}
                />

                <div
                    style={{ width: `${chatWidth}px` }}
                    className="flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm pointer-events-auto h-full"
                >
                    {/* Chat Header */}
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {activeChat.title}
                            </h3>
                            {activeChatId !== 'initial' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveChatId('initial')}
                                    className="h-6 px-2 rounded-md text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Global Chat
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none scroll-smooth">
                        {activeChat.messages.map((msg: { role: string, content: string }, i: number) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] text-[12px] leading-relaxed break-words whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3.5 py-2.5 rounded-2xl rounded-tr-sm shadow-sm font-medium'
                                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <div className="flex items-center gap-2">
                            {activeChatId !== 'initial' && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setActiveChatId('initial')}
                                    className="h-8 w-8 shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    title="Switch to Global Chat"
                                >
                                    <ArrowLeftRight className="size-4" />
                                </Button>
                            )}
                            <div className="relative flex-1 flex items-end">
                                {showMentions && filteredFiles.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-1 duration-100">
                                        <div className="py-1 max-h-48 overflow-y-auto scrollbar-minimal">
                                            {filteredFiles.map((file, idx) => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => selectMention(file.name)}
                                                    onMouseEnter={() => setMentionIndex(idx)}
                                                    className={`w-full px-3 py-1.5 text-left transition-colors ${mentionIndex === idx ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                                        }`}
                                                >
                                                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate block">{file.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <textarea
                                    value={message}
                                    onChange={(e) => {
                                        handleMessageChange(e.target.value);
                                        // Auto-resize height
                                        e.target.style.height = '32px';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                                    }}
                                    onKeyDown={(e) => {
                                        if (showMentions && filteredFiles.length > 0) {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setMentionIndex(prev => (prev + 1) % filteredFiles.length);
                                                return;
                                            }
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
                                                return;
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                selectMention(filteredFiles[mentionIndex].name);
                                                return;
                                            }
                                            if (e.key === 'Escape') {
                                                setShowMentions(false);
                                                return;
                                            }
                                        }

                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                            // Reset height
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = '32px';
                                        }
                                    }}
                                    placeholder={`Message "${activeChat.title}"...`}
                                    className="w-full min-h-[32px] max-h-[200px] py-[7px] pl-3 pr-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400 text-[11px] resize-none overflow-y-auto scrollbar-minimal outline-none"
                                    rows={1}
                                />
                                <button
                                    onClick={() => {
                                        handleSend();
                                        // Reset height of the textarea if we can find it
                                        const textarea = document.querySelector('textarea');
                                        if (textarea) textarea.style.height = '32px';
                                    }}
                                    className="absolute right-2 bottom-1.5 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    <Send className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
