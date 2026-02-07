/**
 * BackboardService
 *
 * Encapsulates all interactions with backboard.io API.
 * Handles assistant creation, thread management, message sending, and memory retrieval.
 */
import {
    BackboardClient,
    type Assistant,
    type MessageResponse,
    type Memory,
    type MemoryStats as BackboardMemoryStats,
} from "backboard-sdk";
import type {
    AssistantConfig,
    BackboardAssistantResponse,
    BackboardThread,
    MemoryMode,
    MemoryStats,
    RetrievedMemory,
} from "@/server/types";

export class BackboardService {
    private client: BackboardClient;
    private assistantId: string | null;
    private llmProvider: string;
    private llmModel: string;

    constructor(config: {
        apiKey: string;
        assistantId?: string;
        llmProvider?: string;
        llmModel?: string;
    }) {
        this.client = new BackboardClient({ apiKey: config.apiKey });
        this.assistantId = config.assistantId ?? null;
        this.llmProvider = config.llmProvider ?? "google";
        this.llmModel = config.llmModel ?? "gemini-2.0-flash";
    }

    // === Assistant Management ===

    /**
     * Ensure an assistant exists, creating one if necessary.
     * Returns the assistant ID.
     */
    async ensureAssistant(config: AssistantConfig): Promise<string> {
        if (this.assistantId) {
            // Verify assistant exists
            try {
                await this.getAssistant(this.assistantId);
                return this.assistantId;
            } catch {
                // Assistant doesn't exist, create a new one
                console.warn(
                    `Assistant ${this.assistantId} not found, creating new one`,
                );
            }
        }

        // Create new assistant
        const assistant: Assistant = await this.client.createAssistant({
            name: config.name,
            system_prompt: config.systemPrompt,
            embedding_model_name: config.embeddingModelName,
            embedding_provider: config.embeddingProvider,
        });

        this.assistantId = assistant.assistantId;
        console.log(`Created new Backboard assistant: ${this.assistantId}`);
        return this.assistantId;
    }

    /**
     * Get assistant by ID.
     */
    async getAssistant(assistantId: string): Promise<Assistant> {
        return await this.client.getAssistant(assistantId);
    }

    /**
     * Get the current assistant ID (throws if not initialized).
     */
    getAssistantId(): string {
        if (!this.assistantId) {
            throw new Error("BackboardService: Assistant not initialized");
        }
        return this.assistantId;
    }

    // === Thread (Conversation) Management ===

    /**
     * Create a new thread (conversation).
     * Returns the thread ID.
     */
    async createThread(): Promise<string> {
        const assistantId = this.getAssistantId();
        const thread = await this.client.createThread(assistantId);
        return thread.threadId;
    }

    /**
     * Get thread by ID.
     */
    async getThread(threadId: string): Promise<BackboardThread> {
        const thread = await this.client.getThread(threadId);
        return {
            threadId: thread.threadId,
            createdAt: new Date(thread.createdAt),
        };
    }

    /**
     * Delete a thread.
     */
    async deleteThread(threadId: string): Promise<void> {
        await this.client.deleteThread(threadId);
    }

    // === Messages ===

    /**
     * Add a message to a thread and get the assistant's response.
     * Uses the configured LLM provider and model.
     */
    async addMessage(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): Promise<BackboardAssistantResponse> {
        const response = await this.client.addMessage(params.threadId, {
            content: params.content,
            llmProvider: this.llmProvider,
            modelName: this.llmModel,
            memory: params.memoryMode,
            stream: false,
        });

        // When stream is false, we get a MessageResponse
        const messageResponse = response as MessageResponse;

        return {
            content: messageResponse.content,
            role: "assistant",
            toolCalls: messageResponse.toolCalls ?? undefined,
        };
    }

    /**
     * Add a message with streaming response.
     * Returns an async iterator of response chunks.
     */
    async *addMessageStreaming(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): AsyncGenerator<string, void, unknown> {
        const stream = await this.client.addMessage(params.threadId, {
            content: params.content,
            llmProvider: this.llmProvider,
            modelName: this.llmModel,
            memory: params.memoryMode,
            stream: true,
        });

        // Handle streaming response
        if (Symbol.asyncIterator in (stream as object)) {
            for await (const chunk of stream as AsyncIterable<{ content: string }>) {
                yield chunk.content;
            }
        }
    }

    // === Memory Operations ===

    /**
     * Get all memories for the assistant.
     */
    async getMemories(params?: { limit?: number }): Promise<RetrievedMemory[]> {
        const assistantId = this.getAssistantId();
        const response = await this.client.getMemories(assistantId);

        // The response is a MemoriesListResponse with memories array
        const memories: Memory[] = response.memories ?? response;

        return memories.slice(0, params?.limit).map((m: Memory) => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.score ?? 1.0,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
    }

    /**
     * Get memory statistics.
     */
    async getMemoryStats(): Promise<MemoryStats> {
        const assistantId = this.getAssistantId();
        const stats: BackboardMemoryStats =
            await this.client.getMemoryStats(assistantId);

        return {
            totalMemories: stats.totalMemories,
        };
    }

    /**
     * Delete a specific memory.
     */
    async deleteMemory(memoryId: string): Promise<void> {
        const assistantId = this.getAssistantId();
        await this.client.deleteMemory(assistantId, memoryId);
    }
}
