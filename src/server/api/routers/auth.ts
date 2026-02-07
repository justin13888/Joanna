/**
 * Auth Router
 *
 * Handles user registration and login.
 * TODO: Add password reset, email verification, OAuth
 */
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { loginSchema, registerSchema } from "@/server/schemas";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
    /**
     * Register a new user.
     */
    register: publicProcedure
        .input(registerSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const result = await ctx.services.auth.register({
                    email: input.email,
                    password: input.password,
                });

                return {
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                    },
                    token: result.token,
                };
            } catch (error) {
                if (error instanceof Error && error.message === "User already exists") {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "A user with this email already exists",
                    });
                }
                throw error;
            }
        }),

    /**
     * Login a user.
     */
    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const result = await ctx.services.auth.login({
                    email: input.email,
                    password: input.password,
                });

                return {
                    user: {
                        id: result.user.id,
                        email: result.user.email,
                    },
                    token: result.token,
                };
            } catch (error) {
                if (error instanceof Error && error.message === "Invalid credentials") {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Invalid email or password",
                    });
                }
                throw error;
            }
        }),

    /**
     * Get current user (requires authentication).
     */
    me: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.userId) {
            return null;
        }

        const user = await ctx.services.auth.getUserById(ctx.userId);
        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
        };
    }),
});
