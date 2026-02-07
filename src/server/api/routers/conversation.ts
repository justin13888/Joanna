/**
 * Conversation Router
 *
 * CRUD operations for conversations.
 */
import {
    agentProcedure,
    createTRPCRouter,
    protectedProcedure,
} from "@/server/api/trpc";
import {
    archiveConversationSchema,
    createConversationSchema,
    getConversationSchema,
    listConversationsSchema,
} from "@/server/schemas";
import { TRPCError } from "@trpc/server";

export const conversationRouter = createTRPCRouter({
    /**
     * Create a new conversation.
     * Creates both a local record and a Backboard thread.
     */
    create: agentProcedure
        .input(createConversationSchema)
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.services.conversation.create({
                userId: ctx.userId,
                title: input.title,
            });

            return {
                id: result.id,
                backboardThreadId: result.backboardThreadId,
            };
        }),

    /**
     * Get a conversation by ID with its messages.
     */
    get: protectedProcedure
        .input(getConversationSchema)
        .query(async ({ ctx, input }) => {
            const conversation = await ctx.services.conversation.getById(
                input.conversationId,
                ctx.userId,
            );

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            return conversation;
        }),

    /**
     * List all conversations with pagination.
     */
    list: protectedProcedure
        .input(listConversationsSchema)
        .query(async ({ ctx, input }) => {
            return await ctx.services.conversation.list({
                userId: ctx.userId,
                status: input.status,
                limit: input.limit,
                cursor: input.cursor,
            });
        }),

    /**
     * Archive a conversation.
     */
    archive: protectedProcedure
        .input(archiveConversationSchema)
        .mutation(async ({ ctx, input }) => {
            await ctx.services.conversation.archive(input.conversationId, ctx.userId);
            return { success: true };
        }),

    /**
     * Delete a conversation.
     */
    delete: protectedProcedure
        .input(getConversationSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.services.conversation.delete(input.conversationId, ctx.userId);
                return { success: true };
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
