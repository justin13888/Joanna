"use client";

import { api } from "@/trpc/react";
import { useState } from "react";

export default function MemoryDebugPage() {
    const { data, refetch, isLoading, error } = api.debug.getMemoryState.useQuery();
    const resetMutation = api.debug.resetMemoryState.useMutation();
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const handleRefresh = async () => {
        await refetch();
        setLastRefresh(new Date());
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset all mock memory state? This cannot be undone.")) {
            return;
        }
        await resetMutation.mutateAsync();
        handleRefresh();
    };

    return (
        <div className="min-h-screen bg-stone-50 p-8 font-mono text-sm">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800">Memory Debug</h1>
                    <p className="text-stone-500">
                        Introspect MockBackboardService internal state
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRefresh}
                        className="rounded-md bg-white border border-stone-200 px-4 py-2 text-stone-700 shadow-sm hover:bg-stone-50 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? "Loading..." : "Refresh"}
                    </button>
                    <button
                        onClick={handleReset}
                        className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-rose-700 shadow-sm hover:bg-rose-100 transition-colors"
                        disabled={resetMutation.isPending}
                    >
                        {resetMutation.isPending ? "Resetting..." : "Reset State"}
                    </button>
                </div>
            </header>

            <div className="mb-4 text-xs text-stone-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                    <h3 className="font-bold">Error</h3>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}

            {data && (
                <div className="space-y-8">
                    {/* Overview */}
                    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold text-stone-800 border-b pb-2">
                            Overview
                        </h2>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <StatCard
                                label="Assistants"
                                value={Object.keys(data.assistants || {}).length}
                            />
                            <StatCard
                                label="Threads"
                                value={Object.keys(data.threads || {}).length}
                            />
                            <StatCard
                                label="Active Assistant"
                                value={data.currentAssistantId ? "Set" : "Null"}
                                sub={data.currentAssistantId}
                            />
                        </div>
                    </section>

                    {/* Memories */}
                    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold text-stone-800 border-b pb-2">
                            Memories
                        </h2>
                        {Object.entries(data.memories || {}).length === 0 ? (
                            <p className="italic text-stone-400">No memories stored.</p>
                        ) : (
                            Object.entries(data.memories as Record<string, any[]>).map(
                                ([assistantId, memories]) => (
                                    <div key={assistantId} className="mb-6 last:mb-0">
                                        <h3 className="mb-2 font-bold text-violet-600">
                                            Assistant: {assistantId}
                                        </h3>
                                        <div className="space-y-3">
                                            {memories.map((mem) => (
                                                <div
                                                    key={mem.id}
                                                    className="rounded-lg border border-stone-100 bg-stone-50 p-3"
                                                >
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-stone-700">
                                                            {mem.id}
                                                        </span>
                                                        <span className="text-stone-400 text-xs">
                                                            {new Date(mem.createdAt).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap text-stone-800">
                                                        {mem.content}
                                                    </p>
                                                    <div className="mt-2 text-xs text-stone-500">
                                                        Score: {mem.score}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),
                            )
                        )}
                    </section>

                    {/* Full State Dump */}
                    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold text-stone-800 border-b pb-2">
                            Full State Dump (JSON)
                        </h2>
                        <div className="max-h-[500px] overflow-auto rounded-lg bg-stone-900 p-4 text-stone-100">
                            <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string | null }) {
    return (
        <div className="rounded-lg bg-stone-50 p-3">
            <div className="text-xs text-stone-500 uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-bold text-stone-800">{value}</div>
            {sub && <div className="text-[10px] text-stone-400 truncate" title={sub}>{sub}</div>}
        </div>
    );
}
