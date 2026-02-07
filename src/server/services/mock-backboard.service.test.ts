
import { describe, it, expect, beforeEach } from "vitest";
import { MockBackboardService } from "./mock-backboard.service";
import type { AssistantConfig } from "@/server/types";

describe("MockBackboardService", () => {
    let service: MockBackboardService;

    beforeEach(() => {
        service = new MockBackboardService();
    });

    it("should create and retrieve an assistant", async () => {
        const config: AssistantConfig = {
            name: "Test Assistant",
            systemPrompt: "You are a test assistant",
        };

        const assistantId = await service.ensureAssistant(config);
        expect(assistantId).toBeDefined();
        expect(assistantId).toContain("asst_");

        const assistant = await service.getAssistant(assistantId);
        expect(assistant).toBeDefined();
        expect(assistant.assistantId).toBe(assistantId);
        expect(assistant.name).toBe(config.name);
    });

    it("should manage threads", async () => {
        await service.ensureAssistant({ name: "Test", systemPrompt: "Test" });

        const threadId = await service.createThread();
        expect(threadId).toBeDefined();
        expect(threadId).toContain("thread_");

        const thread = await service.getThread(threadId);
        expect(thread.threadId).toBe(threadId);
        expect(thread.createdAt).toBeInstanceOf(Date);

        await service.deleteThread(threadId);
        await expect(service.getThread(threadId)).rejects.toThrow();
    });

    it("should handle messages and generate mock response", async () => {
        await service.ensureAssistant({ name: "Test", systemPrompt: "Test" });
        const threadId = await service.createThread();

        const response = await service.addMessage({
            threadId,
            content: "Hello",
            memoryMode: "off",
        });

        expect(response.role).toBe("assistant");
        expect(response.content).toContain('Mock response to: "Hello"');
    });

    it("should store memories in Auto mode", async () => {
        await service.ensureAssistant({ name: "Test", systemPrompt: "Test" });
        const threadId = await service.createThread();

        // Initial memories should be empty
        const initialStats = await service.getMemoryStats();
        expect(initialStats.totalMemories).toBe(0);

        // Add message with Auto memory mode
        await service.addMessage({
            threadId,
            content: "My name is Justin",
            memoryMode: "Auto",
        });

        // Should have created a mock memory
        const stats = await service.getMemoryStats();
        expect(stats.totalMemories).toBe(1);

        const memories = await service.getMemories();
        expect(memories).toHaveLength(1);
        expect(memories[0]?.content).toContain("Memory derived from");
    });
});
