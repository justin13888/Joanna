
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { MockBackboardService } from "@/server/services/mock-backboard.service";

export const debugRouter = createTRPCRouter({
    /**
     * Get the current memory state of the mock backboard service.
     * Returns null if not running with mock service.
     */
    getMemoryState: publicProcedure.query(({ ctx }) => {
        const { backboard } = ctx.services;
        return backboard.getDebugState();
    }),

    /**
     * Reset the mock memory state.
     */
    resetMemoryState: publicProcedure.mutation(({ ctx }) => {
        const { backboard } = ctx.services;

        if (backboard instanceof MockBackboardService) {
            backboard._reset();
            return { success: true };
        }

        return {
            success: false,
            error: "Not running in mock mode.",
        };
    }),
});
