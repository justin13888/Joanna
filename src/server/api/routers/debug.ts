
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { MockBackboardService } from "@/server/services/mock-backboard.service";
import { JOANNA_SYSTEM_PROMPT } from "@/server/prompts/journal-assistant";

export const debugRouter = createTRPCRouter({
    /**
     * Get the current memory state of the backboard service.
     * Works with both MockBackboardService and real BackboardService.
     */
    getMemoryState: publicProcedure.query(async ({ ctx }) => {
        const { backboard } = ctx.services;

        // Ensure assistant is initialized before fetching debug state
        await backboard.ensureAssistant({
            name: "Joanna",
            systemPrompt: JOANNA_SYSTEM_PROMPT,
        });

        return await backboard.getDebugState();
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
