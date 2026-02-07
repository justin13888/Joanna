/**
 * ConversationService
 *
 * Manages conversations in local database and syncs with Backboard threads.
 * Provides CRUD operations and maintains the mapping between local IDs and Backboard thread IDs.
 */
import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/server/db/schema";
import { conversations, messages } from "@/server/db/schema";
import type { IBackboardService } from "./backboard.service";
import type {
    ConversationStatus,
    ConversationSummary,
    ConversationWithMessages,
    Message,
    MessageRole,
    PaginatedResult,
} from "@/server/types";

type DrizzleDB = PostgresJsDatabase<typeof schema>;

export class ConversationService {
    constructor(
        private db: DrizzleDB,
        private backboardService: IBackboardService,
    ) { }

    // === CRUD Operations ===

    /**
     * Create a new conversation.
     * Creates both a local record and a Backboard thread.
     */
    async create(params: {
        userId: string;
        title?: string;
    }): Promise<{ id: string; backboardThreadId: string }> {
        // Create thread in Backboard
        const backboardThreadId = await this.backboardService.createThread();

        // Create local record
        const [conversation] = await this.db
            .insert(conversations)
            .values({
                userId: params.userId,
                backboardThreadId,
                title: params.title,
                status: "active",
            })
            .returning({ id: conversations.id });

        if (!conversation) {
            throw new Error("Failed to create conversation");
        }

        return {
            id: conversation.id,
            backboardThreadId,
        };
    }

    /**
     * Get a conversation by ID.
     */
    async getById(
        id: string,
        userId: string,
    ): Promise<ConversationWithMessages | null> {
        const conversation = await this.db.query.conversations.findFirst({
            where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
            with: {
                messages: {
                    orderBy: [desc(messages.createdAt)],
                },
            },
        });

        if (!conversation) {
            return null;
        }

        return {
            id: conversation.id,
            title: conversation.title,
            status: conversation.status as ConversationStatus,
            messages: conversation.messages.map((m) => ({
                id: m.id,
                role: m.role as MessageRole,
                content: m.content,
                createdAt: m.createdAt,
            })),
            createdAt: conversation.createdAt,
        };
    }

    /**
     * Get a conversation by Backboard thread ID.
     */
    async getByBackboardThreadId(
        threadId: string,
    ): Promise<{ id: string; userId: string | null } | null> {
        const conversation = await this.db.query.conversations.findFirst({
            where: eq(conversations.backboardThreadId, threadId),
            columns: { id: true, userId: true },
        });

        return conversation ?? null;
    }

    /**
     * Get the Backboard thread ID for a conversation.
     */
    async getBackboardThreadId(
        conversationId: string,
        userId: string,
    ): Promise<string | null> {
        const conversation = await this.db.query.conversations.findFirst({
            where: and(
                eq(conversations.id, conversationId),
                eq(conversations.userId, userId),
            ),
            columns: { backboardThreadId: true },
        });

        return conversation?.backboardThreadId ?? null;
    }

    /**
     * List conversations for a user with pagination.
     */
    async list(params: {
        userId: string;
        status?: ConversationStatus;
        limit: number;
        cursor?: string;
    }): Promise<PaginatedResult<ConversationSummary>> {
        const conditions = [eq(conversations.userId, params.userId)];

        if (params.status) {
            conditions.push(eq(conversations.status, params.status));
        }

        if (params.cursor) {
            conditions.push(lt(conversations.id, params.cursor));
        }

        const results = await this.db
            .select({
                id: conversations.id,
                title: conversations.title,
                status: conversations.status,
                createdAt: conversations.createdAt,
                messageCount: sql<number>`(
          SELECT COUNT(*) FROM ${messages} 
          WHERE ${messages.conversationId} = ${conversations.id}
        )`.as("message_count"),
                lastMessageAt: sql<Date | null>`(
          SELECT MAX(${messages.createdAt}) FROM ${messages} 
          WHERE ${messages.conversationId} = ${conversations.id}
        )`.as("last_message_at"),
            })
            .from(conversations)
            .where(and(...conditions))
            .orderBy(desc(conversations.createdAt))
            .limit(params.limit + 1); // Fetch one extra to check for more

        const hasMore = results.length > params.limit;
        const items = hasMore ? results.slice(0, -1) : results;
        const lastItem = items[items.length - 1];

        return {
            items: items.map((c) => ({
                id: c.id,
                title: c.title,
                status: c.status as ConversationStatus,
                messageCount: Number(c.messageCount),
                lastMessageAt: c.lastMessageAt,
                createdAt: c.createdAt,
            })),
            nextCursor: hasMore && lastItem ? lastItem.id : null,
            hasMore,
        };
    }

    /**
     * Archive a conversation.
     */
    async archive(id: string, userId: string): Promise<void> {
        await this.db
            .update(conversations)
            .set({ status: "archived" })
            .where(
                and(eq(conversations.id, id), eq(conversations.userId, userId)),
            );
    }

    /**
     * Delete a conversation and its Backboard thread.
     */
    async delete(id: string, userId: string): Promise<void> {
        // Get the Backboard thread ID first
        const conversation = await this.db.query.conversations.findFirst({
            where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
            columns: { backboardThreadId: true },
        });

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        // Delete from Backboard
        await this.backboardService.deleteThread(conversation.backboardThreadId);

        // Delete local record (messages will cascade)
        await this.db
            .delete(conversations)
            .where(
                and(eq(conversations.id, id), eq(conversations.userId, userId)),
            );
    }

    // === Message Operations ===

    /**
     * Add a message to a conversation.
     */
    async addMessage(params: {
        conversationId: string;
        role: MessageRole;
        content: string;
        metadata?: Record<string, unknown>;
    }): Promise<Message> {
        const [message] = await this.db
            .insert(messages)
            .values({
                conversationId: params.conversationId,
                role: params.role,
                content: params.content,
                metadata: params.metadata,
            })
            .returning();

        if (!message) {
            throw new Error("Failed to add message");
        }

        return {
            id: message.id,
            role: message.role as MessageRole,
            content: message.content,
            createdAt: message.createdAt,
        };
    }

    /**
     * Get messages for a conversation with pagination.
     */
    async getMessages(params: {
        conversationId: string;
        userId: string;
        limit: number;
        cursor?: string;
    }): Promise<PaginatedResult<Message>> {
        // First verify the user owns the conversation
        const conversation = await this.db.query.conversations.findFirst({
            where: and(
                eq(conversations.id, params.conversationId),
                eq(conversations.userId, params.userId),
            ),
            columns: { id: true },
        });

        if (!conversation) {
            throw new Error("Conversation not found");
        }

        const conditions = [eq(messages.conversationId, params.conversationId)];

        if (params.cursor) {
            conditions.push(lt(messages.id, params.cursor));
        }

        const results = await this.db.query.messages.findMany({
            where: and(...conditions),
            orderBy: [desc(messages.createdAt)],
            limit: params.limit + 1,
        });

        const hasMore = results.length > params.limit;
        const items = hasMore ? results.slice(0, -1) : results;
        const lastItem = items[items.length - 1];

        return {
            items: items.map((m) => ({
                id: m.id,
                role: m.role as MessageRole,
                content: m.content,
                createdAt: m.createdAt,
            })),
            nextCursor: hasMore && lastItem ? lastItem.id : null,
            hasMore,
        };
    }

    /**
     * Get recent messages for context (most recent first, reversed for chronological order).
     */
    async getRecentContext(
        conversationId: string,
        messageCount: number,
    ): Promise<Message[]> {
        const recentMessages = await this.db.query.messages.findMany({
            where: eq(messages.conversationId, conversationId),
            orderBy: [desc(messages.createdAt)],
            limit: messageCount,
        });

        // Reverse to get chronological order
        return recentMessages
            .reverse()
            .map((m) => ({
                id: m.id,
                role: m.role as MessageRole,
                content: m.content,
                createdAt: m.createdAt,
            }));
    }

    /**
     * Update conversation title.
     */
    async updateTitle(
        id: string,
        userId: string,
        title: string,
    ): Promise<void> {
        await this.db
            .update(conversations)
            .set({ title })
            .where(
                and(eq(conversations.id, id), eq(conversations.userId, userId)),
            );
    }
}
