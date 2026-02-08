"use client";

import { AppShell } from "@/app/_components/app-shell";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;

    const { error } = api.conversation.get.useQuery(
        { conversationId },
        {
            retry: false,
            enabled: !!conversationId,
        },
    );

    useEffect(() => {
        if (error?.data?.code === "NOT_FOUND") {
            console.log("Conversation not found");
        }
    }, [error]);

    return (
        <div className="flex min-h-dvh items-center justify-center bg-neutral-900 text-stone-800">
            <AppShell conversationId={conversationId} />
        </div>
    );
}
