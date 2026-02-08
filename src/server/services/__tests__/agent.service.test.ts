/**
 * AgentService Unit Tests
 *
 * Tests the agent service orchestration with mocked dependencies.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentService } from "../agent.service";
import type { ConversationService } from "../conversation.service";
import type { MemorySynthesisService } from "../memory-synthesis.service";
import type { MemoryRetrievalService } from "../memory-retrieval.service";
import type { BackboardService } from "../backboard.service";

// Mock all dependencies
const mockConversationService = {
    getBackboardThreadId: vi.fn().mockResolvedValue("mock-thread-id"),
    getRecentContext: vi.fn().mockResolvedValue([
        { role: "assistant", content: "Hello! How was your day?" },
    ]),
    addMessage: vi.fn().mockResolvedValue({
        id: "msg-1",
        role: "user",
        content: "test",
        createdAt: new Date(),
    }),
    create: vi.fn().mockResolvedValue({
        id: "conv-1",
        backboardThreadId: "mock-thread-id",
    }),
};

const mockMemorySynthesisService = {
    synthesize: vi.fn().mockResolvedValue({
        extractedMemories: [
            { content: "User went to gym", category: "event", confidence: 0.9 },
        ],
        followUpQuestions: ["How did your workout go?"],
        elaborationTopics: ["exercise routine", "fitness goals"],
        previousTopicsToRevisit: [],
        confidence: 0.9,
        shouldTerminate: false,
        terminationReason: null,
        isMinimalResponse: false,
    }),
};

const mockMemoryRetrievalService = {
    retrieveContext: vi.fn().mockResolvedValue([]),
};

const mockBackboardService = {
    getAssistantId: vi.fn().mockReturnValue("mock-assistant-id"),
    addMessage: vi.fn().mockResolvedValue({
        content: "That sounds great! Tell me more about your workout.",
        role: "assistant",
    }),
    createMemory: vi.fn().mockResolvedValue({
        id: "mem-1",
        content: "test memory",
        score: 1.0,
        createdAt: new Date().toISOString(),
        metadata: {},
    }),
    getMemories: vi.fn().mockResolvedValue([]),
};

describe("AgentService", () => {
    let service: AgentService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AgentService(
            mockConversationService as unknown as ConversationService,
            mockMemorySynthesisService as unknown as MemorySynthesisService,
            mockMemoryRetrievalService as unknown as MemoryRetrievalService,
            mockBackboardService as unknown as BackboardService,
        );
    });

    describe("processMessage", () => {
        it("should orchestrate the full agent loop", async () => {
            const response = await service.processMessage({
                conversationId: "conv-1",
                userId: "user-1",
                userMessage: "I went to the gym today",
            });

            expect(response).toBeDefined();
            expect(response.content).toBeDefined();
            expect(response.planningState).toBeDefined();
            expect(response.timestamp).toBeInstanceOf(Date);

            // Verify the flow was called correctly
            expect(mockConversationService.getBackboardThreadId).toHaveBeenCalledWith(
                "conv-1",
                "user-1",
            );
            expect(mockConversationService.getRecentContext).toHaveBeenCalled();
            expect(mockMemorySynthesisService.synthesize).toHaveBeenCalled();
            expect(mockMemoryRetrievalService.retrieveContext).toHaveBeenCalled();
        });

        it("should throw if conversation not found", async () => {
            mockConversationService.getBackboardThreadId.mockResolvedValueOnce(null);

            await expect(
                service.processMessage({
                    conversationId: "invalid",
                    userId: "user-1",
                    userMessage: "Hello",
                }),
            ).rejects.toThrow("Conversation not found");
        });

        it("should include extracted memories in planning state", async () => {
            const response = await service.processMessage({
                conversationId: "conv-1",
                userId: "user-1",
                userMessage: "I started learning guitar",
            });

            expect(response.planningState.extractedMemories).toHaveLength(1);
            expect(response.planningState.extractedMemories[0]?.content).toBe(
                "User went to gym",
            );
        });
    });

    describe("startConversation", () => {
        it("should initialize a conversation with greeting", async () => {
            const response = await service.startConversation({
                conversationId: "conv-1",
                userId: "user-1",
            });

            expect(response).toBeDefined();
            expect(response.content).toBeDefined();
        });
    });
});
