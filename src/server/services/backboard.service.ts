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
    type AddMemoryOptions,
    type AddMessageOptions,
} from "backboard-sdk";
import type {
    AssistantConfig,
    BackboardAssistantResponse,
    BackboardThread,
    MemoryMode,
    MemoryStats,
    RetrievedMemory,
} from "@/server/types";

export interface IBackboardService {
    /**
     * Ensure an assistant exists, creating one if necessary.
     * Returns the assistant ID.
     */
    ensureAssistant(config: AssistantConfig): Promise<string>;

    /**
     * Get assistant by ID.
     */
    getAssistant(assistantId: string): Promise<Assistant>;

    /**
     * Get the current assistant ID (throws if not initialized).
     */
    getAssistantId(): string;

    /**
     * Create a new thread (conversation).
     * Returns the thread ID.
     */
    createThread(): Promise<string>;

    /**
     * Get thread by ID.
     */
    getThread(threadId: string): Promise<BackboardThread>;

    /**
     * Delete a thread.
     */
    deleteThread(threadId: string): Promise<void>;

    /**
     * Add a message to a thread and get the assistant's response.
     * Uses the configured LLM provider and model.
     */
    addMessage(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): Promise<BackboardAssistantResponse>;

    /**
     * Add a message with streaming response.
     * Returns an async iterator of response chunks.
     */
    addMessageStreaming(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): AsyncGenerator<string, void, unknown>;

    /**
     * Get all memories for the assistant.
     */
    getMemories(params?: { limit?: number }): Promise<RetrievedMemory[]>;

    /**
     * Get memory statistics.
     */
    getMemoryStats(): Promise<MemoryStats>;

    /**
     * Delete a specific memory.
     */
    deleteMemory(memoryId: string): Promise<void>;

    /**
     * Manually create a new memory.
     */
    createMemory(content: string, metadata?: Record<string, any>): Promise<Memory>;

    /**
     * Get debug state of the service.
     */
    getDebugState(): Record<string, any>;
}

export class BackboardService implements IBackboardService {
    private client: BackboardClient;
    private assistantId: string | null;
    private llmProvider: string;
    private llmModel: string;

    constructor(config: {
        apiKey: string;
        assistantId?: string;
        llmProvider: string;
        llmModel: string;
    }) {
        this.client = new BackboardClient({ apiKey: config.apiKey });
        this.assistantId = config.assistantId ?? null;
        this.llmProvider = config.llmProvider;
        this.llmModel = config.llmModel;
    }

    // === Assistant Management ===

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

    async getAssistant(assistantId: string): Promise<Assistant> {
        return await this.client.getAssistant(assistantId);
    }

    getAssistantId(): string {
        if (!this.assistantId) {
            throw new Error("BackboardService: Assistant not initialized");
        }
        return this.assistantId;
    }

    // === Thread (Conversation) Management ===

    async createThread(): Promise<string> {
        const assistantId = this.getAssistantId();
        const thread = await this.client.createThread(assistantId);
        return thread.threadId;
    }

    async getThread(threadId: string): Promise<BackboardThread> {
        const thread = await this.client.getThread(threadId);
        return {
            threadId: thread.threadId,
            createdAt: new Date(thread.createdAt),
        };
    }

    async deleteThread(threadId: string): Promise<void> {
        await this.client.deleteThread(threadId);
    }

    // === Messages ===

    async addMessage(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): Promise<BackboardAssistantResponse> {

        const options: AddMessageOptions = {
            content: params.content,
            llmProvider: this.llmProvider,
            modelName: this.llmModel,
            memory: params.memoryMode,
            stream: false,
        }

        console.log(`Adding message to thread ${params.threadId}: ${JSON.stringify(options, null, 2)}`);

        const response = await this.client.addMessage(params.threadId, options);

        // When stream is false, we get a MessageResponse
        const messageResponse = response as MessageResponse;

        return {
            content: messageResponse.content,
            role: "assistant",
            toolCalls: messageResponse.toolCalls ?? undefined,
        };
    }

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

    async getMemoryStats(): Promise<MemoryStats> {
        const assistantId = this.getAssistantId();
        const stats: BackboardMemoryStats =
            await this.client.getMemoryStats(assistantId);

        return {
            totalMemories: stats.totalMemories,
        };
    }

    async deleteMemory(memoryId: string): Promise<void> {
        const assistantId = this.getAssistantId();
        await this.client.deleteMemory(assistantId, memoryId);
    }

    async createMemory(content: string, metadata?: Record<string, any>): Promise<Memory> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = this.client;
        const assistantId = this.getAssistantId();
        return await client.addMemory(assistantId, {
            content,
            metadata,
        });
    }

    getDebugState(): Record<string, any> {
        return {
            type: "RealBackboardService",
            assistantId: this.assistantId,
            llmProvider: this.llmProvider,
            llmModel: this.llmModel,
            info: "Real Backboard service does not expose internal memory state.",
        };
    }
}
