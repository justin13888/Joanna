/**
 * Message Router
 *
 * Send and receive messages in conversations.
 * This is the main interface for the agent loop.
 */
import {
    agentProcedure,
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import {
    getMessagesSchema,
    sendMessageSchema,
    startConversationSchema,
} from "@/server/schemas";
import { TRPCError } from "@trpc/server";
import type { BackboardAPIError } from "backboard-sdk";

export const messageRouter = createTRPCRouter({
    /**
     * Send a message and get the assistant's response.
     * This is the main endpoint for the agent loop.
     */
    send: agentProcedure
        .input(sendMessageSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const response = await ctx.services.agent.processMessage({
                    conversationId: input.conversationId,
                    userId: ctx.userId,
                    userMessage: input.content,
                });

                return {
                    content: response.content,
                    timestamp: response.timestamp,
                    // Include planning state for debugging (could be omitted in production)
                    debug: {
                        extractedMemoriesCount: response.planningState.extractedMemories.length,
                        retrievedContextCount: response.planningState.retrievedContext.length,
                        responseStrategy: response.planningState.responseStrategy,
                    },
                };
            } catch (error) {
                console.error("--- ERROR IN MESSAGE.SEND ---");
                // Log the full structure including non-enumerable properties like 'message', 'stack'
                console.error(
                    "Full error object:",
                    JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
                );

                // Specifically check for BackboardSDK specific fields if they exist on the error object
                // @ts-expect-error - Checking for possible hidden properties
                if (error?.response?.data) {
                    // @ts-expect-error - Checking for possible hidden properties
                    console.error("API Response Data:", JSON.stringify(error.response.data, null, 2));
                }

                if (error instanceof Error) {
                    console.error("Stack:", error.stack);
                }

                if (error instanceof Error && error.message === "Conversation not found") {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Conversation not found",
                    });
                }
                throw error;
            }
        }),

    /**
     * Start a conversation with initial greeting.
     * Call this after creating a conversation to get Joanna's opening.
     */
    startConversation: agentProcedure
        .input(startConversationSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const response = await ctx.services.agent.startConversation({
                    conversationId: input.conversationId,
                    userId: ctx.userId,
                });

                return {
                    content: response.content,
                    timestamp: response.timestamp,
                };
            } catch (error) {
                if (error instanceof Error && error.message === "Conversation not found") {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Conversation not found",
                    });
                }
                throw error;
            }
        }),

    /**
     * Get message history for a conversation.
     */
    list: protectedProcedure
        .input(getMessagesSchema)
        .query(async ({ ctx, input }) => {
            try {
                return await ctx.services.conversation.getMessages({
                    conversationId: input.conversationId,
                    userId: ctx.userId,
                    limit: input.limit,
                    cursor: input.cursor,
                });
            } catch (error) {
                if (error instanceof Error && error.message === "Conversation not found") {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Conversation not found",
                    });
                }
                throw error;
            }
        }),
});
