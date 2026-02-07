/**
 * BackboardService Unit Tests
 *
 * Tests the Backboard service interface and behavior.
 * Uses a simplified mock since the real SDK is hard to mock.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockBackboardService } from "./test-utils";

// TODO: Finish non-mock integration tests

describe("BackboardService (Mocked)", () => {
    let service: ReturnType<typeof createMockBackboardService>;

    beforeEach(() => {
        service = createMockBackboardService();
    });

    describe("ensureAssistant", () => {
        it("should return assistant ID", async () => {
            const assistantId = await service.ensureAssistant();
            expect(assistantId).toBe("mock-assistant-id");
        });
    });

    describe("getAssistantId", () => {
        it("should return the assistant ID", () => {
            expect(service.getAssistantId()).toBe("mock-assistant-id");
        });
    });

    describe("createThread", () => {
        it("should create a thread and return a unique ID", async () => {
            const threadId1 = await service.createThread();
            const threadId2 = await service.createThread();

            expect(threadId1).toContain("mock-thread");
            expect(threadId2).toContain("mock-thread");
            expect(threadId1).not.toBe(threadId2);
        });
    });

    describe("getThread", () => {
        it("should return thread info", async () => {
            const threadId = await service.createThread();
            const thread = await service.getThread(threadId);

            expect(thread.threadId).toBe(threadId);
            expect(thread.createdAt).toBeInstanceOf(Date);
        });
    });

    describe("deleteThread", () => {
        it("should delete a thread", async () => {
            const threadId = await service.createThread();
            await service.deleteThread(threadId);
            // Should not throw
        });
    });

    describe("addMessage", () => {
        it("should add a message and return a response", async () => {
            const threadId = await service.createThread();
            const response = await service.addMessage({
                threadId,
                content: "Hello!",
            });

            expect(response.content).toContain("Mock response");
            expect(response.role).toBe("assistant");
        });
    });

    describe("getMemories", () => {
        it("should return an empty array by default", async () => {
            const memories = await service.getMemories();
            expect(memories).toEqual([]);
        });
    });

    describe("getMemoryStats", () => {
        it("should return memory stats", async () => {
            const stats = await service.getMemoryStats();
            expect(stats.totalMemories).toBe(0);
        });
    });
});
