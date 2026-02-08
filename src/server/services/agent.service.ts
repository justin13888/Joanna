/**
 * AgentService
 *
 * Orchestrates the complete agent loop:
 * 1. Take user's response
 * 2. Synthesize: identify new memories, identify follow-up questions
 * 3. Retrieve sparse memories of next things to cover/elaborate
 * 4. Store new memories in current step
 * 5. Plan out internally how to respond and ACT
 */
import type { ConversationService } from "./conversation.service";
import type { MemorySynthesisService } from "./memory-synthesis.service";
import type { MemoryRetrievalService } from "./memory-retrieval.service";
import type { IBackboardService } from "./backboard.service";
import type {
    AgentPlanningState,
    AgentResponse,
    RetrievedMemory,
} from "@/server/types";
import {
    JOANNA_GREETING_PROMPT,
    JOANNA_SYSTEM_PROMPT,
} from "@/server/prompts/journal-assistant";

export class AgentService {
    constructor(
        private conversationService: ConversationService,
        private memorySynthesisService: MemorySynthesisService,
        private memoryRetrievalService: MemoryRetrievalService,
        private backboardService: IBackboardService,
    ) { }

    /**
     * Process a user message and generate a response.
     * This is the main entry point for the agent loop.
     */
    async processMessage(params: {
        conversationId: string;
        userId: string;
        userMessage: string;
    }): Promise<AgentResponse> {
        const { conversationId, userId, userMessage } = params;
        console.log("[Agent] Starting processMessage", { conversationId, userId });

        // Step 1: Get conversation context
        const backboardThreadId = await this.conversationService.getBackboardThreadId(
            conversationId,
            userId,
        );
        if (!backboardThreadId) {
            throw new Error("Conversation not found");
        }

        const recentContext = await this.conversationService.getRecentContext(
            conversationId,
            10,
        );

        console.log("[Agent] Got recent context", recentContext.length);

        // Step 2: Synthesize - identify new memories and follow-up questions
        const synthesisResult = await this.memorySynthesisService.synthesize({
            userMessage,
            conversationContext: recentContext,
        });

        console.log("[Agent] Synthesis complete", {
            memories: synthesisResult.extractedMemories.length,
            followUps: synthesisResult.followUpQuestions.length
        });

        // Step 3: Retrieve sparse memories of things to cover/elaborate
        const retrievedContext = await this.memoryRetrievalService.retrieveContext({
            synthesisResult,
            conversationContext: recentContext,
            limit: 5,
        });

        console.log("[Agent] Retrieval complete", { retrieved: retrievedContext.length });

        // Step 4: Store new memories in current step
        // Explicitly store synthesized memories instead of relying on "Auto" mode
        if (synthesisResult.extractedMemories.length > 0) {
            console.log(`[Agent] Storing ${synthesisResult.extractedMemories.length} synthesized memories`);
            await Promise.all(
                synthesisResult.extractedMemories.map((mem) =>
                    this.backboardService.createMemory(mem.content, {
                        category: mem.category,
                        confidence: mem.confidence,
                        source: "synthesis",
                        timestamp: new Date().toISOString(),
                    })
                )
            );
        }
        console.log("[Agent] Memory storage complete");

        // Step 5: Send message to Backboard and get response
        const augmentedPrompt = this.buildAugmentedPrompt(
            userMessage,
            synthesisResult,
            retrievedContext,
        );

        const response = await this.backboardService.addMessage({
            threadId: backboardThreadId,
            content: augmentedPrompt,
            memoryMode: "Readonly", // Use existing memories but don't auto-store the user message (we did it explicitly above)
            systemPrompt: JOANNA_SYSTEM_PROMPT,
        });
        console.log("[Agent] Received response from Backboard");

        // Store messages locally for quick access
        await this.conversationService.addMessage({
            conversationId,
            role: "user",
            content: userMessage,
            metadata: {
                synthesisResult,
                retrievedContext: retrievedContext.map((m) => ({
                    id: m.id,
                    content: m.content,
                })),
            },
        });
        console.log("[Agent] Stored user message locally");

        await this.conversationService.addMessage({
            conversationId,
            role: "assistant",
            content: response.content,
        });
        console.log("[Agent] Stored assistant response locally");

        // Build planning state for debugging/logging
        const planningState: AgentPlanningState = {
            extractedMemories: synthesisResult.extractedMemories,
            followUpQuestions: synthesisResult.followUpQuestions,
            retrievedContext,
            responseStrategy: this.inferResponseStrategy(synthesisResult, retrievedContext),
        };

        console.log("[Agent] Process complete, returning response");

        return {
            content: response.content,
            planningState,
            timestamp: new Date(),
        };
    }

    /**
     * Start a new conversation with an initial greeting.
     */
    async startConversation(params: {
        conversationId: string;
        userId: string;
    }): Promise<AgentResponse> {
        const { conversationId, userId } = params;

        // Get the Backboard thread ID
        const backboardThreadId = await this.conversationService.getBackboardThreadId(
            conversationId,
            userId,
        );
        if (!backboardThreadId) {
            throw new Error("Conversation not found");
        }

        // Retrieve recent memories to personalize the greeting
        // We get the last 5 memories to provide some context on what's been happening
        let recentMemories: RetrievedMemory[] = [];
        try {
            recentMemories = await this.backboardService.getMemories({ limit: 5 });
            console.log(`[Agent] Retrieved ${recentMemories.length} memories for greeting context`);
        } catch (error) {
            console.warn("[Agent] Failed to retrieve memories for greeting:", error);
        }

        // Build the greeting prompt with context
        let promptContent = JOANNA_GREETING_PROMPT;
        if (recentMemories.length > 0) {
            promptContent += "\n\n---";
            promptContent += "\nContext from recent conversations (use to personalize greeting if relevant):";
            for (const memory of recentMemories) {
                promptContent += `\n- ${memory.content}`;
            }
        }

        // Get greeting from the assistant
        const response = await this.backboardService.addMessage({
            threadId: backboardThreadId,
            content: promptContent,
            memoryMode: "Readonly", // Read memories but don't store the greeting prompt
            systemPrompt: JOANNA_SYSTEM_PROMPT,
        });

        // Store the greeting locally
        await this.conversationService.addMessage({
            conversationId,
            role: "assistant",
            content: response.content,
        });
        console.log("[Agent] Stored assistant response locally");

        const planningState: AgentPlanningState = {
            extractedMemories: [],
            followUpQuestions: [],
            retrievedContext: recentMemories,
            responseStrategy: "initial_greeting",
        };

        return {
            content: response.content,
            planningState,
            timestamp: new Date(),
        };
    }

    /**
     * Build an augmented prompt that includes synthesis results and retrieved context.
     * This helps the LLM generate more informed responses.
     */
    private buildAugmentedPrompt(
        userMessage: string,
        synthesisResult: { followUpQuestions: string[]; elaborationTopics: string[] },
        retrievedContext: RetrievedMemory[],
    ): string {
        const parts: string[] = [];

        // Add user message
        parts.push(userMessage);

        // Add internal context (not visible to user but helps LLM)
        if (retrievedContext.length > 0 || synthesisResult.followUpQuestions.length > 0) {
            parts.push("\n\n---");
            parts.push("(Internal context for response planning - do not mention explicitly)");

            if (retrievedContext.length > 0) {
                parts.push("\nRelevant memories from past conversations:");
                for (const memory of retrievedContext.slice(0, 3)) {
                    parts.push(`- ${memory.content}`);
                }
            }

            if (synthesisResult.followUpQuestions.length > 0) {
                parts.push("\nPotential follow-up questions:");
                for (const question of synthesisResult.followUpQuestions.slice(0, 2)) {
                    parts.push(`- ${question}`);
                }
            }

            if (synthesisResult.elaborationTopics.length > 0) {
                parts.push("\nTopics that could be elaborated:");
                for (const topic of synthesisResult.elaborationTopics.slice(0, 2)) {
                    parts.push(`- ${topic}`);
                }
            }
        }

        return parts.join("\n");
    }

    /**
     * Infer the response strategy based on synthesis and retrieved context.
     */
    private inferResponseStrategy(
        synthesisResult: { followUpQuestions: string[]; extractedMemories: { category: string }[] },
        retrievedContext: RetrievedMemory[],
    ): string {
        if (retrievedContext.length > 0) {
            return "contextual_follow_up";
        }

        if (synthesisResult.followUpQuestions.length > 0) {
            return "elaboration_prompt";
        }

        if (synthesisResult.extractedMemories.some((m) => m.category === "feeling")) {
            return "emotional_support";
        }

        if (synthesisResult.extractedMemories.some((m) => m.category === "goal")) {
            return "goal_tracking";
        }

        return "general_journaling";
    }
}
