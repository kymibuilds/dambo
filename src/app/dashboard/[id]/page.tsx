"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Send,
    ArrowLeft,
    Plus,
    X,
    MessageCircle
} from "lucide-react";
import Link from "next/link";
import { type Node } from '@xyflow/react';
import FlowCanvas from "@/components/canvas/FlowCanvas";

export default function ProjectPage() {
    const [chats, setChats] = useState([
        {
            id: 'initial',
            title: 'General',
            messages: [{ role: 'assistant', content: "Hello! I've analyzed your dataset. You can ask me to visualize trends, filter data, or generate a custom UI component based on your performance metrics." }]
        }
    ]);
    const [activeChatId, setActiveChatId] = useState('initial');
    const [message, setMessage] = useState("");
    const [editingChatId, setEditingChatId] = useState<string | null>(null);

    // Fixed chat width for now
    const chatWidth = 400;

    const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

    const handleCreateChat = () => {
        const newId = Math.random().toString(36).substring(7);
        const newChat = {
            id: newId,
            title: `Chat ${chats.length + 1}`,
            messages: [{ role: 'assistant', content: "New chat session started. How can I help with your project?" }]
        };
        setChats([...chats, newChat]);
        setActiveChatId(newId);
    };

    const handleCloseChat = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (chats.length === 1) return;

        const newChats = chats.filter(c => c.id !== id);
        setChats(newChats);
        if (activeChatId === id) {
            setActiveChatId(newChats[newChats.length - 1].id);
        }
    };

    const handleRenameChat = (id: string, newTitle: string) => {
        setChats(chats.map(c => c.id === id ? { ...c, title: newTitle } : c));
    };

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
            setActiveChatId(chatId);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            {/* Left: Canvas Area */}
            <div className="flex-1 flex flex-col relative group overflow-hidden">
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

                {/* React Flow Canvas */}
                <div className="h-full w-full">
                    <FlowCanvas onNodeSelect={handleNodeSelect} />
                </div>
            </div>

            {/* Right: Chat Interface */}
            <div
                style={{ width: `${chatWidth}px` }}
                className="flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm z-30"
            >
                {/* Chat Tabs */}
                <div className="flex items-center gap-1 p-1 bg-zinc-50/50 dark:bg-zinc-950/50 overflow-x-auto scrollbar-minimal border-b border-zinc-100 dark:border-zinc-800">
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            onDoubleClick={() => setEditingChatId(chat.id)}
                            className={`group/tab flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${activeChatId === chat.id
                                ? 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-300/50 dark:border-zinc-700'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                        >
                            {editingChatId === chat.id ? (
                                <input
                                    autoFocus
                                    value={chat.title}
                                    onChange={(e) => handleRenameChat(chat.id, e.target.value)}
                                    onBlur={() => setEditingChatId(null)}
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingChatId(null)}
                                    className="bg-transparent border-none outline-none focus:ring-0 w-16 cursor-text"
                                    spellCheck={false}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span className="w-16 truncate">{chat.title}</span>
                            )}
                            {chats.length > 1 && (
                                <button
                                    onClick={(e) => handleCloseChat(e, chat.id)}
                                    className="opacity-0 group-hover/tab:opacity-100 text-zinc-400 hover:text-red-500 transition-all"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCreateChat}
                        className="h-6 w-6 p-0 rounded-md shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Plus className="size-3" />
                    </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                    {activeChat.messages.map((msg: { role: string, content: string }, i: number) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] text-[13px] leading-relaxed ${msg.role === 'user'
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-2 rounded-lg shadow-sm font-medium'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-2 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                        {activeChatId !== 'initial' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveChatId('initial')}
                                className="h-10 w-10 shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                title="Switch to Global Chat"
                            >
                                <MessageCircle className="size-4" />
                            </Button>
                        )}
                        <div className="relative flex-1 flex items-center">
                            <Input
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={`Message "${activeChat.title}"...`}
                                className="h-10 pl-3 pr-10 rounded-lg bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-1 focus-visible:ring-zinc-400 text-[13px]"
                            />
                            <button
                                onClick={handleSend}
                                className="absolute right-2 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                <Send className="size-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
