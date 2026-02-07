export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-shippori)' }}>Settings</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage your account and preferences.</p>
            </div>
            <div className="max-w-xl border rounded-lg p-6 bg-white shadow-sm border-zinc-200">
                <p className="text-sm text-zinc-600">Settings options would go here.</p>
            </div>
        </div>
    );
}
