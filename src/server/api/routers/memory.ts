/**
 * Memory Router
 *
 * Memory inspection and management endpoints.
 * Primarily for debugging and admin purposes.
 */
import {
    agentProcedure,
    createTRPCRouter,
} from "@/server/api/trpc";
import {
    getMemoryStatsSchema,
    searchMemoriesSchema,
} from "@/server/schemas";

export const memoryRouter = createTRPCRouter({
    /**
     * Search memories by query.
     * Useful for debugging and inspecting what the assistant remembers.
     */
    search: agentProcedure
        .input(searchMemoriesSchema)
        .query(async ({ ctx, input }) => {
            const memories = await ctx.services.memoryRetrieval.searchMemories({
                query: input.query,
                limit: input.limit,
            });

            return {
                memories: memories.map((m) => ({
                    id: m.id,
                    content: m.content,
                    relevanceScore: m.relevanceScore,
                    createdAt: m.createdAt,
                })),
                total: memories.length,
            };
        }),

    /**
     * Get memory statistics.
     */
    stats: agentProcedure
        .input(getMemoryStatsSchema)
        .query(async ({ ctx }) => {
            const stats = await ctx.services.memoryRetrieval.getStats();

            return {
                totalMemories: stats.totalMemories,
                memoriesByCategory: stats.memoriesByCategory,
            };
        }),

    /**
     * List all memories (paginated).
     */
    list: agentProcedure.query(async ({ ctx }) => {
        const memories = await ctx.services.backboard.getMemories({ limit: 50 });

        return {
            memories: memories.map((m) => ({
                id: m.id,
                content: m.content,
                createdAt: m.createdAt,
            })),
            total: memories.length,
        };
    }),
});
