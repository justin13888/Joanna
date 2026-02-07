/**
 * ConversationService Integration Tests
 *
 * Tests the conversation service with a real database and mocked Backboard.
 */
import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
} from "vitest";
import { ConversationService } from "../conversation.service";
import { AuthService } from "../auth.service";
import {
    createTestDb,
    cleanupTestData,
    createMockBackboardService,
    testEmail,
    testPassword,
} from "./test-utils";

describe("ConversationService", () => {
    const db = createTestDb();
    const mockBackboard = createMockBackboardService();
    let conversationService: ConversationService;
    let authService: AuthService;
    let testUserId: string;
    let testConversationId: string;

    beforeAll(async () => {
        authService = new AuthService(db, "test-jwt-secret-minimum-32-characters");
        conversationService = new ConversationService(
            db,
            mockBackboard as unknown as ConstructorParameters<typeof ConversationService>[1],
        );
        // Cleanup any leftover data
        await cleanupTestData(db);
    });

    beforeEach(async () => {
        // Create a test user for each test
        const { user } = await authService.register({
            email: testEmail(),
            password: testPassword(),
        });
        testUserId = user.id;

        // Create a test conversation for tests that need it
        const conv = await conversationService.create({
            userId: testUserId,
            title: "Test Conversation",
        });
        testConversationId = conv.id;
    });

    afterEach(async () => {
        await cleanupTestData(db);
    });

    afterAll(async () => {
        await cleanupTestData(db);
    });

    describe("create", () => {
        it("should create a conversation with a Backboard thread", async () => {
            const result = await conversationService.create({
                userId: testUserId,
                title: "New Conversation",
            });

            expect(result.id).toBeDefined();
            expect(result.backboardThreadId).toBeDefined();
        });
    });

    describe("getById", () => {
        it("should return a conversation with messages", async () => {
            const conversation = await conversationService.getById(
                testConversationId,
                testUserId,
            );

            expect(conversation).not.toBeNull();
            expect(conversation?.id).toBe(testConversationId);
            expect(conversation?.messages).toEqual([]);
        });

        it("should return null for non-existent conversation", async () => {
            const conversation = await conversationService.getById(
                "00000000-0000-0000-0000-000000000000",
                testUserId,
            );
            expect(conversation).toBeNull();
        });
    });

    describe("list", () => {
        it("should list conversations for a user", async () => {
            // Already have one from beforeEach, add one more
            await conversationService.create({ userId: testUserId, title: "Conv 2" });

            const result = await conversationService.list({
                userId: testUserId,
                limit: 10,
            });

            expect(result.items).toHaveLength(2);
            expect(result.hasMore).toBe(false);
        });
    });

    describe("addMessage", () => {
        it("should add a message to a conversation", async () => {
            const message = await conversationService.addMessage({
                conversationId: testConversationId,
                role: "user",
                content: "Hello, Joanna!",
            });

            expect(message.role).toBe("user");
            expect(message.content).toBe("Hello, Joanna!");
        });
    });

    describe("getRecentContext", () => {
        it("should return recent messages in chronological order", async () => {
            await conversationService.addMessage({
                conversationId: testConversationId,
                role: "user",
                content: "First message",
            });
            await conversationService.addMessage({
                conversationId: testConversationId,
                role: "assistant",
                content: "Second message",
            });
            await conversationService.addMessage({
                conversationId: testConversationId,
                role: "user",
                content: "Third message",
            });

            const context = await conversationService.getRecentContext(
                testConversationId,
                10,
            );

            expect(context).toHaveLength(3);
            expect(context[0]?.content).toBe("First message");
            expect(context[2]?.content).toBe("Third message");
        });
    });

    describe("archive", () => {
        it("should archive a conversation", async () => {
            await conversationService.archive(testConversationId, testUserId);

            const result = await conversationService.list({
                userId: testUserId,
                status: "archived",
                limit: 10,
            });

            expect(result.items).toHaveLength(1);
            expect(result.items[0]?.status).toBe("archived");
        });
    });
});
