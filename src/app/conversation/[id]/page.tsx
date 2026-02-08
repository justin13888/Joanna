"use client";

import { AppShell } from "@/app/_components/app-shell";
import { useParams } from "next/navigation";

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;

    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-900 text-stone-800">
            <AppShell conversationId={conversationId} />
        </div>
    );
}
