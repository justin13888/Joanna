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
import { MockBackboardService } from "../mock-backboard.service";

/**
 * Mock BackboardService for unit tests that don't need real API calls.
 */
export function createMockBackboardService() {
    return new MockBackboardService({ assistantId: "mock-assistant-id" });
}
