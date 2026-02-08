"use client";

import { Zap } from "lucide-react";

export default function IntegrationsPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
            <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Zap className="h-8 w-8 text-zinc-400" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>
                    Integrations Coming Soon
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
                    We're working on integrations with Slack, Shopify, Stripe, Discord, and more. Stay tuned!
                </p>
            </div>
        </div>
    );
}
