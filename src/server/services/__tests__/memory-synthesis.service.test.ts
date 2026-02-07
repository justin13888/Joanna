/**
 * MemorySynthesisService Unit Tests
 *
 * Tests the memory synthesis service with mocked Backboard.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MemorySynthesisService } from "../memory-synthesis.service";
import { createMockBackboardService } from "./test-utils";

describe("MemorySynthesisService", () => {
    let service: MemorySynthesisService;
    let mockBackboard: ReturnType<typeof createMockBackboardService>;

    beforeEach(() => {
        mockBackboard = createMockBackboardService();
        service = new MemorySynthesisService(
            mockBackboard as unknown as ConstructorParameters<typeof MemorySynthesisService>[0],
        );
    });

    describe("synthesize", () => {
        it("should return a synthesis result structure", async () => {
            const result = await service.synthesize({
                userMessage: "I started a new job at Google last week as a software engineer.",
                conversationContext: [],
            });

            // The mock returns a basic response, verify structure
            expect(result).toBeDefined();
            expect(Array.isArray(result.extractedMemories)).toBe(true);
            expect(Array.isArray(result.followUpQuestions)).toBe(true);
        });

        it("should handle empty messages gracefully", async () => {
            const result = await service.synthesize({
                userMessage: "",
                conversationContext: [],
            });

            expect(result).toBeDefined();
            expect(result.extractedMemories).toEqual([]);
        });

        it("should use conversation context for synthesis", async () => {
            const result = await service.synthesize({
                userMessage: "It's going great!",
                conversationContext: [
                    { role: "assistant", content: "How is your new job going?", id: "msg-123", createdAt: new Date() },
                ],
            });

            expect(result).toBeDefined();
        });
    });
});
