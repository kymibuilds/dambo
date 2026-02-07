"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, ExternalLink } from "lucide-react";

const integrations = [
    {
        name: "Slack",
        description: "Send real-time alerts and notifications to your Slack channels.",
        status: "connected",
        iconPath: "M8.33 21h4V14H6.33v3c0 2.21 1.79 4 4 4z M17.67 3h-4v7h6V7c0-2.21-1.79-4-4-4z M21 17.67V13.67h-7v6h3c2.21 0 4-1.79 4-4z M3 6.33v4h7V3.33H7c-2.21 0-4 1.79-4 4z",
        color: "#4A154B"
    },
    {
        name: "Shopify",
        description: "Visualize your store's live sales and inventory data instantly.",
        status: "not_connected",
        iconPath: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
        color: "#95BF47"
    },
    {
        name: "Stripe",
        description: "Track revenue growth and payment failures in real-time.",
        status: "not_connected",
        iconPath: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2z",
        color: "#008CDD"
    },
    {
        name: "Discord",
        description: "Stream live data updates directly to your Discord community.",
        status: "not_connected",
        iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
        color: "#5865F2"
    }
];

export default function IntegrationsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Integrations</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Connect your favorite tools to stream data.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Browse Marketplace
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {integrations.map((integration) => (
                    <div
                        key={integration.name}
                        className="rounded-xl border border-zinc-300/80 bg-white text-zinc-950 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)] dark:border-zinc-800/50 dark:bg-zinc-950 dark:text-zinc-50 p-6 flex flex-col justify-between min-h-[220px] group hover:border-zinc-400 dark:hover:border-zinc-700 transition-all"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div
                                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                                    style={{ backgroundColor: integration.color }}
                                >
                                    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                                        <path d={integration.iconPath} />
                                    </svg>
                                </div>
                                {integration.status === "connected" ? (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 gap-1 rounded-md px-1.5 py-0.5 text-[10px]">
                                        <Check className="h-2.5 w-2.5" />
                                        Active
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-zinc-400 border-zinc-100 dark:border-zinc-800 rounded-md px-1.5 py-0.5 text-[10px]">
                                        Disconnected
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1">
                                <h4 className="font-semibold" style={{ fontFamily: 'var(--font-shippori)' }}>{integration.name}</h4>
                                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                    {integration.description}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                variant={integration.status === "connected" ? "outline" : "default"}
                                size="sm"
                                className="w-full text-xs font-semibold h-9"
                            >
                                {integration.status === "connected" ? "Manage Integration" : "Connect"}
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Custom Webhook Card */}
                <div className="rounded-xl border border-dashed border-zinc-300/80 bg-white/50 text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 p-6 flex flex-col items-center justify-center min-h-[220px] group hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-zinc-400" />
                    </div>
                    <h4 className="font-semibold text-center" style={{ fontFamily: 'var(--font-shippori)' }}>Custom Webhook</h4>
                    <p className="text-[11px] text-zinc-400 text-center mt-1 font-medium italic">Push data from any source</p>
                    <Button variant="ghost" size="sm" className="mt-4 text-[10px] h-7 px-4 rounded-full border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition-all font-bold tracking-tight">
                        SETUP WEBHOOK
                    </Button>
                </div>
            </div>
        </div>
    );
}
