/**
 * MemoryRetrievalService Unit Tests
 *
 * Tests the memory retrieval service with mocked Backboard.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRetrievalService } from "../memory-retrieval.service";
import { createMockBackboardService } from "./test-utils";
import type { SynthesisResult } from "@/server/types";

describe("MemoryRetrievalService", () => {
    let service: MemoryRetrievalService;
    let mockBackboard: ReturnType<typeof createMockBackboardService>;

    beforeEach(() => {
        mockBackboard = createMockBackboardService();
        service = new MemoryRetrievalService(
            mockBackboard as unknown as ConstructorParameters<typeof MemoryRetrievalService>[0],
        );
    });

    describe("retrieveContext", () => {
        it("should retrieve context based on synthesis result", async () => {
            const synthesisResult: SynthesisResult = {
                extractedMemories: [
                    { content: "User likes coffee", category: "event", confidence: 0.9 },
                ],
                followUpQuestions: [],
                elaborationTopics: ["coffee preferences"],
                previousTopicsToRevisit: [],
                confidence: 0.9,
                shouldTerminate: false,
                terminationReason: null,
                isMinimalResponse: false,
            };

            const result = await service.retrieveContext({
                synthesisResult,
                conversationContext: [],
                limit: 5,
            });

            expect(Array.isArray(result)).toBe(true);
        });

        it("should handle empty synthesis result", async () => {
            const synthesisResult: SynthesisResult = {
                extractedMemories: [],
                followUpQuestions: [],
                elaborationTopics: [],
                previousTopicsToRevisit: [],
                confidence: 0,
                shouldTerminate: false,
                terminationReason: null,
                isMinimalResponse: false,
            };

            const result = await service.retrieveContext({
                synthesisResult,
                conversationContext: [],
                limit: 5,
            });

            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe("searchMemories", () => {
        it("should search memories by query", async () => {
            const memories = await service.searchMemories({
                query: "coffee",
                limit: 10,
            });

            expect(Array.isArray(memories)).toBe(true);
        });
    });

    describe("getStats", () => {
        it("should return memory statistics", async () => {
            const stats = await service.getStats();

            expect(stats).toBeDefined();
            expect(typeof stats.totalMemories).toBe("number");
        });
    });
});
