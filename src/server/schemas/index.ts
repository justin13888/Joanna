/**
 * Zod schemas for API validation.
 * All request/response validation schemas are defined here.
 */
import { z } from "zod";

// === Auth Schemas ===

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8), // TODO: Add password strength requirements
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// === Conversation Schemas ===

export const createConversationSchema = z.object({
    title: z.string().optional(),
});

export const getConversationSchema = z.object({
    conversationId: z.string().uuid(),
});

export const listConversationsSchema = z.object({
    status: z.enum(["active", "archived"]).optional(),
    limit: z.number().min(1).max(100).default(20),
    cursor: z.string().uuid().optional(),
});

export const archiveConversationSchema = z.object({
    conversationId: z.string().uuid(),
});

// === Message Schemas ===

export const sendMessageSchema = z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1).max(10000),
    // Optional metadata from frontend (e.g., audio duration, timestamp)
    metadata: z.record(z.unknown()).optional(),
});

export const getMessagesSchema = z.object({
    conversationId: z.string().uuid(),
    limit: z.number().min(1).max(100).default(50),
    cursor: z.string().uuid().optional(),
});

export const startConversationSchema = z.object({
    conversationId: z.string().uuid(),
});

// === Memory Schemas ===

export const searchMemoriesSchema = z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(50).default(10),
});

export const getMemoryStatsSchema = z.object({});

// === Type exports for schema inference ===

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type GetConversationInput = z.infer<typeof getConversationSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
export type ArchiveConversationInput = z.infer<typeof archiveConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SearchMemoriesInput = z.infer<typeof searchMemoriesSchema>;
