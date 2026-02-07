/**
 * Test utilities and helpers for Joanna tests.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

/**
 * Create a test database connection.
 * Uses the same DATABASE_URL but in a test context.
 */
export function createTestDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL not set for tests");
    }

    const client = postgres(connectionString);
    return drizzle(client, { schema });
}

/**
 * Clean up test data from database.
 * Deletes all data from tables in reverse order of dependencies.
 */
export async function cleanupTestData(db: ReturnType<typeof createTestDb>) {
    // Delete in order to respect foreign key constraints
    await db.delete(schema.messages);
    await db.delete(schema.conversations);
    await db.delete(schema.users);
}

/**
 * Generate a unique test email.
 */
export function testEmail(prefix = "test"): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
}

/**
 * Generate a test password.
 */
export function testPassword(): string {
    return "testPassword123!";
}

/**
 * Mock BackboardService for unit tests that don't need real API calls.
 */
export function createMockBackboardService() {
    let threadCounter = 0;
    const threads = new Map<string, { messages: string[] }>();

    return {
        assistantId: "mock-assistant-id",

        ensureAssistant: async () => "mock-assistant-id",

        getAssistantId: () => "mock-assistant-id",

        createThread: async () => {
            const threadId = `mock-thread-${++threadCounter}`;
            threads.set(threadId, { messages: [] });
            return threadId;
        },

        getThread: async (threadId: string) => ({
            threadId,
            createdAt: new Date(),
        }),

        deleteThread: async (threadId: string) => {
            threads.delete(threadId);
        },

        addMessage: async (params: { threadId: string; content: string }) => {
            const thread = threads.get(params.threadId);
            if (thread) {
                thread.messages.push(params.content);
            }
            return {
                content: `Mock response to: ${params.content.slice(0, 50)}...`,
                role: "assistant" as const,
            };
        },

        getMemories: async () => [],

        getMemoryStats: async () => ({
            totalMemories: 0,
        }),

        deleteMemory: async () => { },
    };
}
