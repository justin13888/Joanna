/**
 * MemoryRetrievalService
 *
 * Fetches relevant memories from Backboard.io for contextual responses.
 * Uses semantic search based on current conversation topics.
 */
import type { IBackboardService } from "./backboard.service";
import type {
    Message,
    MemoryStats,
    RetrievedMemory,
    SynthesisResult,
} from "@/server/types";

export class MemoryRetrievalService {
    constructor(private backboardService: IBackboardService) { }

    /**
     * Retrieve memories relevant to the current conversation context.
     * Uses the synthesis result to understand what topics to search for.
     */
    async retrieveContext(params: {
        synthesisResult: SynthesisResult;
        conversationContext: Message[];
        limit?: number;
    }): Promise<RetrievedMemory[]> {
        const limit = params.limit ?? 10;

        try {
            // Get memories from Backboard
            // Note: Backboard's memory: 'Auto' mode handles retrieval automatically
            // This service provides additional retrieval for cases where we need
            // explicit control or pre-fetch context
            const memories = await this.backboardService.getMemories({ limit });

            // Filter and rank memories based on relevance to current topics
            const rankedMemories = this.rankMemories(memories, params);

            return rankedMemories.slice(0, limit);
        } catch (error) {
            console.error("Memory retrieval failed:", error);
            return [];
        }
    }

    /**
     * Search memories by explicit query.
     * Useful for admin/debug interfaces.
     */
    async searchMemories(params: {
        query: string;
        limit?: number;
    }): Promise<RetrievedMemory[]> {
        const limit = params.limit ?? 10;

        try {
            const memories = await this.backboardService.getMemories({ limit: 100 });

            // Simple keyword matching for now
            const queryWords = params.query.toLowerCase().split(/\s+/);
            const filtered = memories.filter((memory) => {
                const contentLower = memory.content.toLowerCase();
                return queryWords.some((word) => contentLower.includes(word));
            });

            return filtered.slice(0, limit);
        } catch (error) {
            console.error("Memory search failed:", error);
            return [];
        }
    }

    /**
     * Get memory statistics for the assistant.
     */
    async getStats(): Promise<MemoryStats> {
        try {
            return await this.backboardService.getMemoryStats();
        } catch (error) {
            console.error("Failed to get memory stats:", error);
            return { totalMemories: 0 };
        }
    }

    /**
     * Rank memories based on relevance to the current context.
     * Uses extracted topics and follow-up questions to score.
     */
    private rankMemories(
        memories: RetrievedMemory[],
        context: {
            synthesisResult: SynthesisResult;
            conversationContext: Message[];
        },
    ): RetrievedMemory[] {
        const { synthesisResult, conversationContext } = context;

        // Build a set of keywords from the synthesis result and recent messages
        const keywords = new Set<string>();

        // Add extracted memory content as keywords
        for (const memory of synthesisResult.extractedMemories) {
            for (const word of memory.content.toLowerCase().split(/\s+/)) {
                if (word.length > 3) keywords.add(word);
            }
        }

        // Add elaboration topics
        for (const topic of synthesisResult.elaborationTopics) {
            for (const word of topic.toLowerCase().split(/\s+/)) {
                if (word.length > 3) keywords.add(word);
            }
        }

        // Add words from recent messages
        for (const message of conversationContext.slice(-5)) {
            for (const word of message.content.toLowerCase().split(/\s+/)) {
                if (word.length > 3) keywords.add(word);
            }
        }

        // Score each memory based on keyword overlap
        const scored = memories.map((memory) => {
            const contentWords = memory.content.toLowerCase().split(/\s+/);
            let score = 0;

            for (const word of contentWords) {
                if (keywords.has(word)) {
                    score += 1;
                }
            }

            // Normalize by content length
            const normalizedScore = contentWords.length > 0
                ? score / Math.sqrt(contentWords.length)
                : 0;

            return {
                ...memory,
                relevanceScore: normalizedScore,
            };
        });

        // Sort by relevance score (descending)
        return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
}
