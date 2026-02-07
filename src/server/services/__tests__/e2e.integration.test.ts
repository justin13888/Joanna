/**
 * End-to-End Integration Test
 *
 * Tests the full flow from auth → conversation → message.
 * This is a focused integration test that verifies the complete user journey.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
    createTestDb,
    cleanupTestData,
    createMockBackboardService,
} from "./test-utils";
import { AuthService, ConversationService } from "..";

describe("End-to-End Integration", () => {
    const db = createTestDb();
    const jwtSecret = "test-jwt-secret-minimum-32-characters";

    beforeAll(async () => {
        await cleanupTestData(db);
    });

    afterAll(async () => {
        await cleanupTestData(db);
    });

    it("should complete full user flow: register → create conversation → add messages", async () => {
        const mockBackboard = createMockBackboardService();
        const authService = new AuthService(db, jwtSecret);
        const conversationService = new ConversationService(
            db,
            mockBackboard as unknown as Parameters<typeof ConversationService>[1],
        );

        // Step 1: Register a user
        const email = `e2e-test-${Date.now()}@example.com`;
        const { user, token } = await authService.register({
            email,
            password: "password123",
        });

        expect(user.email).toBe(email);
        expect(token).toBeDefined();

        // Step 2: Verify the token
        const payload = authService.verifyToken(token);
        expect(payload.userId).toBe(user.id);
        expect(payload.email).toBe(email);

        // Step 3: Create a conversation
        const { id: conversationId, backboardThreadId } =
            await conversationService.create({
                userId: user.id,
                title: "E2E Test Journal",
            });

        expect(conversationId).toBeDefined();
        expect(backboardThreadId).toContain("mock-thread");

        // Step 4: Add messages to the conversation
        const msg1 = await conversationService.addMessage({
            conversationId,
            role: "assistant",
            content: "Hi! How was your day?",
        });
        expect(msg1.role).toBe("assistant");

        const msg2 = await conversationService.addMessage({
            conversationId,
            role: "user",
            content: "I went to the gym today and had a great workout!",
        });
        expect(msg2.role).toBe("user");

        // Step 5: Verify conversation state
        const conversation = await conversationService.getById(
            conversationId,
            user.id,
        );

        expect(conversation).not.toBeNull();
        expect(conversation?.title).toBe("E2E Test Journal");
        expect(conversation?.messages.length).toBe(2);

        // Check both messages exist (order may vary by implementation)
        const contents = conversation?.messages.map((m) => m.content) ?? [];
        expect(contents.some((c) => c.includes("How was your day"))).toBe(true);
        expect(contents.some((c) => c.includes("gym"))).toBe(true);

        // Step 6: Verify context retrieval
        const context = await conversationService.getRecentContext(
            conversationId,
            10,
        );
        expect(context.length).toBe(2);

        // Step 7: Archive the conversation
        await conversationService.archive(conversationId, user.id);

        const archived = await conversationService.list({
            userId: user.id,
            status: "archived",
            limit: 10,
        });
        expect(archived.items).toHaveLength(1);
        expect(archived.items[0].id).toBe(conversationId);

        // Cleanup this test's data manually
        await cleanupTestData(db);
    });
});
