import {
    type Assistant,
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
import type { IBackboardService } from "./backboard.service";
import { randomUUID } from "node:crypto";

export class MockBackboardService implements IBackboardService {
    private assistants: Map<string, Assistant> = new Map();
    private threads: Map<string, BackboardThread> = new Map();
    private messages: Map<string, { role: "user" | "assistant"; content: string }[]> = new Map();
    private memories: Map<string, Memory[]> = new Map();
    private currentAssistantId: string | null = null;

    constructor(
        config: {
            apiKey?: string;
            assistantId?: string;
        } = {},
    ) {
        if (config.assistantId) {
            this.currentAssistantId = config.assistantId;
            // Also create the mock assistant object so getAssistant works
            // Casting to match assumed shape
            const assistant: Assistant = {
                assistantId: config.assistantId,
                name: "Mock Assistant",
                description: "Joanna is your personal diary assistant",
                systemPrompt: "Mock Prompt",
                tools: null,
                createdAt: new Date(),
            };
            this.assistants.set(config.assistantId, assistant);
            this.memories.set(config.assistantId, []);
        }
    }

    // === Assistant Management ===

    async ensureAssistant(config: AssistantConfig): Promise<string> {
        if (this.currentAssistantId && this.assistants.has(this.currentAssistantId)) {
            return this.currentAssistantId;
        }

        const assistantId = `asst_${randomUUID()}`;
        // Casting to any to avoid strict type checks on Assistant if keys mismatch, 
        // but trying to match likely SDK shape based on error hint
        const assistant: Assistant = {
            assistantId,
            name: config.name,
            systemPrompt: config.systemPrompt,
            tools: null,
            createdAt: new Date(),
        };

        this.assistants.set(assistantId, assistant);
        this.currentAssistantId = assistantId;
        this.memories.set(assistantId, []); // Initialize memories for this assistant
        return assistantId;
    }

    async getAssistant(assistantId: string): Promise<Assistant> {
        const assistant = this.assistants.get(assistantId);
        if (!assistant) {
            throw new Error(`Assistant ${assistantId} not found`);
        }
        return assistant;
    }

    getAssistantId(): string {
        if (!this.currentAssistantId) {
            throw new Error("BackboardService: Assistant not initialized");
        }
        return this.currentAssistantId;
    }

    // === Thread (Conversation) Management ===

    async createThread(): Promise<string> {
        const threadId = `thread_${randomUUID()}`;
        const thread: BackboardThread = {
            threadId,
            createdAt: new Date(),
        };
        this.threads.set(threadId, thread);
        this.messages.set(threadId, []);
        return threadId;
    }

    async getThread(threadId: string): Promise<BackboardThread> {
        const thread = this.threads.get(threadId);
        if (!thread) {
            throw new Error(`Thread ${threadId} not found`);
        }
        return thread;
    }

    async deleteThread(threadId: string): Promise<void> {
        if (!this.threads.has(threadId)) {
            throw new Error(`Thread ${threadId} not found`);
        }
        this.threads.delete(threadId);
        this.messages.delete(threadId);
    }

    // === Messages ===

    async addMessage(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): Promise<BackboardAssistantResponse> {
        if (!this.threads.has(params.threadId)) {
            throw new Error(`Thread ${params.threadId} not found`);
        }

        const threadMessages = this.messages.get(params.threadId) || [];

        // Store user message
        threadMessages.push({ role: "user", content: params.content });

        // Generate mock response
        const responseContent = `Mock response to: "${params.content}"`;
        threadMessages.push({ role: "assistant", content: responseContent });

        this.messages.set(params.threadId, threadMessages);

        // Handle memory effects
        if (params.memoryMode === "Auto") {
            // Mock creating a memory
            const memoryContent = `Memory derived from: "${params.content}"`;
            await this.createMockMemory(memoryContent);
        }

        return {
            content: responseContent,
            role: "assistant",
        };
    }

    async *addMessageStreaming(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): AsyncGenerator<string, void, unknown> {
        if (!this.threads.has(params.threadId)) {
            throw new Error(`Thread ${params.threadId} not found`);
        }

        const threadMessages = this.messages.get(params.threadId) || [];
        threadMessages.push({ role: "user", content: params.content });

        const responseContent = `Mock streaming response to: "${params.content}"`;

        // Simulate streaming chunks
        const chunks = responseContent.split(" ");
        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 10)); // simulate latency
            yield chunk + " ";
        }

        threadMessages.push({ role: "assistant", content: responseContent });
        this.messages.set(params.threadId, threadMessages);

        if (params.memoryMode === "Auto") {
            await this.createMockMemory(`Memory derived from: "${params.content}"`);
        }
    }

    // === Memory Operations ===

    private async createMockMemory(content: string) {
        const assistantId = this.getAssistantId();
        const memory: Memory = {
            id: `mem_${randomUUID()}`,
            content,
            score: 1.0,
            createdAt: new Date().toISOString(),
            metadata: {},
        };
        const currentMemories = this.memories.get(assistantId) || [];
        currentMemories.push(memory);
        this.memories.set(assistantId, currentMemories);
    }

    async getMemories(params?: { limit?: number }): Promise<RetrievedMemory[]> {
        const assistantId = this.getAssistantId();
        const allMemories = this.memories.get(assistantId) || [];

        // Sort by recency (mocking search/relevance)
        const sorted = [...allMemories].sort((a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );

        const sliced = params?.limit ? sorted.slice(0, params.limit) : sorted;

        return sliced.map(m => ({
            id: m.id,
            content: m.content,
            relevanceScore: m.score ?? 1.0,
            createdAt: new Date(m.createdAt!),
        }));
    }

    async getMemoryStats(): Promise<MemoryStats> {
        const assistantId = this.getAssistantId();
        const count = (this.memories.get(assistantId) || []).length;
        return {
            totalMemories: count,
        };
    }

    async deleteMemory(memoryId: string): Promise<void> {
        const assistantId = this.getAssistantId();
        const currentMemories = this.memories.get(assistantId) || [];
        const filtered = currentMemories.filter(m => m.id !== memoryId);

        this.memories.set(assistantId, filtered);
    }

    // helper for tests
    _reset() {
        this.assistants.clear();
        this.threads.clear();
        this.messages.clear();
        this.memories.clear();
        this.currentAssistantId = null;
    }
}
