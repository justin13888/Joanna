/**
 * MemorySynthesisService
 *
 * Analyzes user responses to:
 * 1. Identify new memories to store (facts, events, goals, feelings)
 * 2. Generate follow-up questions based on what was shared
 *
 * This runs as part of the agent loop BEFORE storing memories in Backboard.
 */
import type { IBackboardService } from "./backboard.service";
import type {
    ExtractedMemory,
    Message,
    MemoryCategory,
    RetrievedMemory,
    SynthesisResult,
} from "@/server/types";
import { MEMORY_SYNTHESIS_PROMPT } from "@/server/prompts/journal-assistant";

interface SynthesisResponse {
    extractedMemories: Array<{
        content: string;
        category: string;
        confidence: number;
    }>;
    followUpQuestions: string[];
    elaborationTopics: string[];
    confidence: number;
}

export class MemorySynthesisService {
    constructor(private backboardService: IBackboardService) { }

    /**
     * Synthesize memories and follow-up questions from user input.
     * Uses a dedicated LLM call (not the main conversation thread) to analyze.
     */
    async synthesize(params: {
        userMessage: string;
        conversationContext: Message[];
        existingMemories?: RetrievedMemory[];
    }): Promise<SynthesisResult> {
        // Build context for synthesis
        const contextSummary = this.buildContextSummary(
            params.conversationContext,
            params.existingMemories,
        );

        const synthesisPrompt = `${MEMORY_SYNTHESIS_PROMPT}

## Conversation Context
${contextSummary}

## User's Message
${params.userMessage}

Analyze the user's message and extract memories, follow-up questions, and elaboration topics.`;

        try {
            // Create a temporary thread for synthesis (we don't want to pollute the main thread)
            // In production, this could use a separate API call or local LLM
            const threadId = await this.backboardService.createThread();
            console.log("Created thread for synthesis:", threadId);

            try {
                const response = await this.backboardService.addMessage({
                    threadId,
                    content: synthesisPrompt,
                    memoryMode: "off", // Don't store synthesis in memory
                });
                console.log("Synthesis response:", response);

                // Parse the JSON response
                const parsed = this.parseResponse(response.content);
                if (!parsed) {
                    return this.getEmptyResult();
                }
                return parsed;
            } finally {
                console.log("CLEAN UP: Deleting thread for synthesis:", threadId);
                // Clean up the temporary thread
                await this.backboardService.deleteThread(threadId).catch(() => {
                    // Ignore cleanup errors
                });
            }
        } catch (error) {
            console.error("Memory synthesis failed:", error);
            // Return empty result on failure - don't block the conversation
            return this.getEmptyResult();
        }
    }

    /**
     * Build a summary of the conversation context for the synthesis prompt.
     */
    private buildContextSummary(
        messages: Message[],
        memories?: RetrievedMemory[],
    ): string {
        const parts: string[] = [];

        if (memories && memories.length > 0) {
            parts.push("### Relevant Memories from Past Conversations");
            for (const memory of memories.slice(0, 5)) {
                parts.push(`- ${memory.content}`);
            }
            parts.push("");
        }

        if (messages.length > 0) {
            parts.push("### Recent Conversation");
            for (const message of messages.slice(-10)) {
                parts.push(`${message.role.toUpperCase()}: ${message.content}`);
            }
        }

        return parts.join("\n");
    }

    /**
     * Parse the LLM response into a SynthesisResult.
     */
    private parseResponse(content: string): SynthesisResult | null {
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("No JSON found in synthesis response", { content });
                return null;
            }

            const parsed: SynthesisResponse = JSON.parse(jsonMatch[0]);

            // Validate and transform the response
            const validCategories: MemoryCategory[] = [
                "goal",
                "event",
                "feeling",
                "person",
                "plan",
                "reflection",
            ];

            const extractedMemories: ExtractedMemory[] = (
                parsed.extractedMemories || []
            )
                .filter(
                    (m) =>
                        m.content &&
                        validCategories.includes(m.category as MemoryCategory),
                )
                .map((m) => ({
                    content: m.content,
                    category: m.category as MemoryCategory,
                    confidence: Math.round(Math.max(0, Math.min(1, m.confidence || 0.5)) * 100),
                }));

            return {
                extractedMemories,
                followUpQuestions: parsed.followUpQuestions || [],
                elaborationTopics: parsed.elaborationTopics || [],
                confidence: Math.round(Math.max(0, Math.min(1, parsed.confidence || 0.5)) * 100),
            };
        } catch (error) {
            console.warn("Failed to parse synthesis response:", error, { content });
            return null;
        }
    }

    /**
     * Return an empty synthesis result.
     */
    private getEmptyResult(): SynthesisResult {
        return {
            extractedMemories: [],
            followUpQuestions: [],
            elaborationTopics: [],
            confidence: 0,
        };
    }
}
