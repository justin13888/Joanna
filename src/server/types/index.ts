/**
 * Core type definitions for Joanna voice assistant backend.
 * All types are defined here for centralized management and easy testing.
 */

// === Message & Conversation Types ===

/** Message roles in a conversation */
export type MessageRole = "user" | "assistant" | "system";

/** Conversation status */
export type ConversationStatus = "active" | "archived";

/** Memory mode for Backboard API calls */
export type MemoryMode = "Auto" | "Readonly" | "off";

// === Memory Types ===

/** Categories for journal memories */
export type MemoryCategory =
    | "goal" // Fitness goals, career goals, etc.
    | "event" // Things that happened
    | "feeling" // Emotional state
    | "person" // People mentioned
    | "plan" // Future intentions
    | "reflection"; // Insights, learnings

/** Memory extracted from user input during synthesis */
export interface ExtractedMemory {
    content: string;
    category: MemoryCategory;
    confidence: number;
}

/** Memory retrieved from Backboard long-term storage */
export interface RetrievedMemory {
    id: string;
    content: string;
    relevanceScore: number;
    createdAt: Date;
}

/** Memory statistics from Backboard */
export interface MemoryStats {
    totalMemories: number;
    memoriesByCategory?: Record<MemoryCategory, number>;
}

// === Agent Planning Types ===

/** Agent internal planning state for debugging and logging */
export interface AgentPlanningState {
    extractedMemories: ExtractedMemory[];
    followUpQuestions: string[];
    retrievedContext: RetrievedMemory[];
    responseStrategy: string;
}

/** Result of memory synthesis from user input */
export interface SynthesisResult {
    /** New memories extracted from this message */
    extractedMemories: ExtractedMemory[];

    /** Potential follow-up questions to flesh out the journal */
    followUpQuestions: string[];

    /** Topics that could benefit from elaboration */
    elaborationTopics: string[];

    /** Confidence score for the extraction (0-1) */
    confidence: number;
}

/** Response from the agent after processing a message */
export interface AgentResponse {
    /** The assistant's response text */
    content: string;

    /** Internal planning state (for debugging/logging) */
    planningState: AgentPlanningState;

    /** Timestamp */
    timestamp: Date;
}

// === Conversation DTOs ===

/** Conversation summary for listing */
export interface ConversationSummary {
    id: string;
    title: string | null;
    status: ConversationStatus;
    messageCount: number;
    lastMessageAt: Date | null;
    createdAt: Date;
}

/** Full conversation with messages */
export interface ConversationWithMessages {
    id: string;
    title: string | null;
    status: ConversationStatus;
    messages: Message[];
    createdAt: Date;
}

/** Single message */
export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: Date;
}

// === Pagination ===

/** Paginated result wrapper */
export interface PaginatedResult<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

// === User/Auth Types ===

/** User record */
export interface User {
    id: string;
    email: string;
    createdAt: Date;
}

/** JWT payload structure */
export interface JWTPayload {
    userId: string;
    email: string;
    iat: number;
    exp: number;
}

// === Backboard Types ===

/** Backboard assistant configuration */
export interface AssistantConfig {
    name: string;
    systemPrompt: string;
    embeddingModelName?: string;
    embeddingProvider?: string;
}

/** Backboard thread (conversation) */
export interface BackboardThread {
    threadId: string;
    createdAt: Date;
}

/** Backboard assistant response */
export interface BackboardAssistantResponse {
    content: string;
    role: "assistant";
    toolCalls?: unknown[];
}
