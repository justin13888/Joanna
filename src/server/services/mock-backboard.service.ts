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
import { GoogleGenAI } from "@google/genai";

/**
 * LLM configuration for real inference (optional).
 * If provided, MockBackboardService uses real LLM for responses.
 */
export interface LLMConfig {
    provider: "google";
    model: string;  // e.g., "gemini-2.0-flash"
    apiKey: string;
}

export class MockBackboardService implements IBackboardService {
    private assistants: Map<string, Assistant> = new Map();
    private threads: Map<string, BackboardThread> = new Map();
    private messages: Map<string, { role: "user" | "assistant"; content: string }[]> = new Map();
    private memories: Map<string, Memory[]> = new Map();
    private currentAssistantId: string | null = null;
    private currentSystemPrompt: string | null = null;

    // LLM config for real inference
    private llmConfig: LLMConfig | null = null;
    private genAI: GoogleGenAI | null = null;

    constructor(
        config: {
            apiKey?: string;
            assistantId?: string;
            llm?: LLMConfig;
        } = {},
    ) {
        console.log("[MockBackboard] Initializing...");
        // Initialize LLM if config provided
        if (config.llm) {
            this.llmConfig = config.llm;
            this.genAI = new GoogleGenAI({ apiKey: config.llm.apiKey });
            console.log(`[MockBackboard] LLM configured with model: ${config.llm.model}`);
        }
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
            console.log(`[MockBackboard] Pre-loaded assistant: ${config.assistantId}`);
        }
    }

    // === Assistant Management ===

    async ensureAssistant(config: AssistantConfig): Promise<string> {
        console.log("[MockBackboard] ensureAssistant called with:", config.name);
        // Store the system prompt for use in LLM calls
        this.currentSystemPrompt = config.systemPrompt;

        if (this.currentAssistantId && this.assistants.has(this.currentAssistantId)) {
            console.log(`[MockBackboard] Using existing assistant: ${this.currentAssistantId}`);
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
        console.log(`[MockBackboard] Created new assistant: ${assistantId}`);
        return assistantId;
    }

    async getAssistant(assistantId: string): Promise<Assistant> {
        const assistant = this.assistants.get(assistantId);
        if (!assistant) {
            console.error(`[MockBackboard] Assistant not found: ${assistantId}`);
            throw new Error(`Assistant ${assistantId} not found`);
        }
        return assistant;
    }

    getAssistantId(): string {
        if (!this.currentAssistantId) {
            console.error("[MockBackboard] Attempted to getAssistantId but not initialized");
            throw new Error("BackboardService: Assistant not initialized");
        }
        return this.currentAssistantId;
    }

    // === Thread (Conversation) Management ===

    async createThread(): Promise<string> {
        // Enforce hierarchy: Must have an assistant to create a thread
        const assistantId = this.getAssistantId();

        const threadId = `thread_${randomUUID()}`;
        const thread: BackboardThread = {
            threadId,
            createdAt: new Date(),
        };
        this.threads.set(threadId, thread);
        this.messages.set(threadId, []);

        console.log(`[MockBackboard] Created thread: ${threadId} for assistant: ${assistantId}`);
        return threadId;
    }

    async getThread(threadId: string): Promise<BackboardThread> {
        const thread = this.threads.get(threadId);
        if (!thread) {
            console.error(`[MockBackboard] Thread not found: ${threadId}`);
            throw new Error(`Thread ${threadId} not found`);
        }
        return thread;
    }

    async deleteThread(threadId: string): Promise<void> {
        if (!this.threads.has(threadId)) {
            console.error(`[MockBackboard] Cannot delete missing thread: ${threadId}`);
            throw new Error(`Thread ${threadId} not found`);
        }
        this.threads.delete(threadId);
        this.messages.delete(threadId);
        console.log(`[MockBackboard] Deleted thread: ${threadId}`);
    }

    // === Messages ===

    async addMessage(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): Promise<BackboardAssistantResponse> {
        console.log(`[MockBackboard] addMessage to thread ${params.threadId}, memoryMode=${params.memoryMode}`);

        if (!this.threads.has(params.threadId)) {
            // Auto-create thread if missing (dev convenience for server restarts)
            console.warn(`[MockBackboard] Thread ${params.threadId} not found, auto-creating...`);
            const thread: BackboardThread = {
                threadId: params.threadId,
                createdAt: new Date(),
            };
            this.threads.set(params.threadId, thread);
            this.messages.set(params.threadId, []);
        }

        const threadMessages = this.messages.get(params.threadId) || [];

        // Store user message
        threadMessages.push({ role: "user", content: params.content });

        let responseContent: string;

        // Use real LLM if configured, otherwise mock
        if (this.genAI && this.llmConfig) {
            console.log("[MockBackboard] Generating response via LLM...");
            responseContent = await this.generateLLMResponse(threadMessages, params.systemPrompt);
        } else {
            console.log("[MockBackboard] Generating static mock response...");
            responseContent = `Mock response to: "${params.content}"`;
        }

        threadMessages.push({ role: "assistant", content: responseContent });
        this.messages.set(params.threadId, threadMessages);

        // === MEMORY IMPLEMENTATION ===
        // In the real implementation, memory is handled as a side-effect by the Backboard API
        // based on the `memory` parameter. Here, we simulate that side-effect explicitly.
        if (params.memoryMode === "Auto") {
            console.log("[MockBackboard] Auto-memory enabled, creating memory from content...");
            const memoryContent = params.content;
            await this.createMockMemory(memoryContent);
        } else {
            console.log("[MockBackboard] Memory creation skipped (mode != Auto)");
        }

        return {
            content: responseContent,
            role: "assistant",
        };
    }

    /**
     * Generate a response using the configured LLM (Gemini).
     */
    private async generateLLMResponse(
        messages: { role: "user" | "assistant"; content: string }[],
        overrideSystemPrompt?: string,
    ): Promise<string> {
        if (!this.genAI || !this.llmConfig) {
            throw new Error("LLM not configured");
        }

        const systemPrompt = overrideSystemPrompt ?? this.currentSystemPrompt ?? "";

        // Build conversation history for context
        const contents = messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));


        const isGemma = this.llmConfig.model.toLowerCase().includes("gemma");
        const requestConfig: { systemInstruction?: string } = {};

        if (isGemma && systemPrompt) {
            // Prepend system prompt to the first user message if using Gemma
            const userMsgIndex = contents.findIndex(c => c.role === "user");
            if (userMsgIndex !== -1) {
                const userMsg = contents[userMsgIndex];
                if (userMsg?.parts?.[0]) {
                    const originalText = userMsg.parts[0].text;
                    userMsg.parts[0].text = `System Instruction: ${systemPrompt}\n\n${originalText}`;
                }
            } else {
                contents.unshift({
                    role: "user",
                    parts: [{ text: `System Instruction: ${systemPrompt}` }],
                });
            }
        } else if (systemPrompt) {
            // For other models (Gemini), use the dedicated config
            requestConfig.systemInstruction = systemPrompt;
        }


        const response = await this.genAI.models.generateContent({
            model: this.llmConfig.model,
            contents,
            config: requestConfig,
        });

        return response.text ?? "I'm sorry, I couldn't generate a response.";
    }

    async *addMessageStreaming(params: {
        threadId: string;
        content: string;
        memoryMode: MemoryMode;
        systemPrompt?: string;
    }): AsyncGenerator<string, void, unknown> {
        console.log(`[MockBackboard] addMessageStreaming to thread ${params.threadId}`);
        if (!this.threads.has(params.threadId)) {
            // Auto-create thread if missing (dev convenience for server restarts)
            console.warn(`[MockBackboard] Thread ${params.threadId} not found, auto-creating...`);
            const thread: BackboardThread = {
                threadId: params.threadId,
                createdAt: new Date(),
            };
            this.threads.set(params.threadId, thread);
            this.messages.set(params.threadId, []);
        }

        const threadMessages = this.messages.get(params.threadId) || [];
        threadMessages.push({ role: "user", content: params.content });

        let responseContent: string;

        // Use real LLM if configured, otherwise mock
        if (this.genAI && this.llmConfig) {
            // For now, use non-streaming and simulate chunks (Gemini streaming is more complex)
            responseContent = await this.generateLLMResponse(threadMessages, params.systemPrompt);
        } else {
            responseContent = `Mock streaming response to: "${params.content}"`;
        }

        // Simulate streaming by yielding word chunks
        const chunks = responseContent.split(" ");
        for (const chunk of chunks) {
            await new Promise(resolve => setTimeout(resolve, 50)); // simulate latency
            yield chunk + " ";
        }

        threadMessages.push({ role: "assistant", content: responseContent });
        this.messages.set(params.threadId, threadMessages);

        if (params.memoryMode === "Auto") {
            console.log("[MockBackboard] Auto-memory enabled, creating memory from content (streaming)...");
            await this.createMockMemory(params.content);
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
        console.log(`[MockBackboard] Stored new memory for assistant ${assistantId}: "${content.substring(0, 30)}..." (Total: ${currentMemories.length + 1})`);
    }

    async getMemories(params?: { limit?: number }): Promise<RetrievedMemory[]> {
        const assistantId = this.getAssistantId();
        const allMemories = this.memories.get(assistantId) || [];

        // Sort by recency (mocking search/relevance)
        const sorted = [...allMemories].sort((a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );

        const sliced = params?.limit ? sorted.slice(0, params.limit) : sorted;
        console.log(`[MockBackboard] Retrieved ${sliced.length} memories (requested limit: ${params?.limit})`);

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
        console.log(`[MockBackboard] getMemoryStats: ${count} total memories`);
        return {
            totalMemories: count,
        };
    }

    async deleteMemory(memoryId: string): Promise<void> {
        const assistantId = this.getAssistantId();
        const currentMemories = this.memories.get(assistantId) || [];
        const filtered = currentMemories.filter(m => m.id !== memoryId);

        if (filtered.length < currentMemories.length) {
            this.memories.set(assistantId, filtered);
            console.log(`[MockBackboard] Deleted memory: ${memoryId}`);
        } else {
            console.warn(`[MockBackboard] Delete failed - memory not found: ${memoryId}`);
            // Note: Real backboard service might throw or just return, assuming here we warn.
        }
    }

    async createMemory(content: string, metadata?: Record<string, any>): Promise<Memory> {
        const assistantId = this.getAssistantId();
        const memory: Memory = {
            id: `mem_${randomUUID()}`,
            content,
            score: 1.0,
            createdAt: new Date().toISOString(),
            metadata: metadata || {},
        };
        const currentMemories = this.memories.get(assistantId) || [];
        currentMemories.push(memory);
        this.memories.set(assistantId, currentMemories);
        console.log(`[MockBackboard] Explicitly created memory for assistant ${assistantId}: "${content.substring(0, 30)}..." (Total: ${currentMemories.length})`);
        return memory;
    }

    // helper for tests
    _reset() {
        console.log("[MockBackboard] Resetting state...");
        this.assistants.clear();
        this.threads.clear();
        this.messages.clear();
        this.memories.clear();
        this.currentAssistantId = null;
    }

    async getDebugState(): Promise<Record<string, any>> {
        return {
            type: "MockBackboardService",
            assistants: Object.fromEntries(this.assistants),
            threads: Object.fromEntries(this.threads),
            messages: Object.fromEntries(this.messages),
            memories: Object.fromEntries(this.memories),
            currentAssistantId: this.currentAssistantId,
            currentSystemPrompt: this.currentSystemPrompt,
        };
    }
}
