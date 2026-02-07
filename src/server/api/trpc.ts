/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { env } from "@/env";
import {
	AgentService,
	AuthService,
	BackboardService,
	ConversationService,
	MemoryRetrievalService,
	MemorySynthesisService,
} from "@/server/services";
import { JOANNA_SYSTEM_PROMPT } from "@/server/prompts/journal-assistant";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

// Initialize services as singletons
let backboardService: BackboardService | null = null;
let authService: AuthService | null = null;

function getBackboardService(): BackboardService {
	if (!backboardService) {
		backboardService = new BackboardService({
			apiKey: env.BACKBOARD_API_KEY,
			assistantId: env.BACKBOARD_ASSISTANT_ID,
			llmProvider: env.LLM_PROVIDER,
			llmModel: env.LLM_MODEL,
		});
	}
	return backboardService;
}

function getAuthService(): AuthService {
	if (!authService) {
		authService = new AuthService(db, env.JWT_SECRET);
	}
	return authService;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
	const bb = getBackboardService();
	const auth = getAuthService();

	// Initialize services with dependency injection
	const conversationService = new ConversationService(db, bb);
	const memorySynthesisService = new MemorySynthesisService(bb);
	const memoryRetrievalService = new MemoryRetrievalService(bb);
	const agentService = new AgentService(
		conversationService,
		memorySynthesisService,
		memoryRetrievalService,
		bb,
	);

	// Extract user from JWT if present
	let userId: string | null = null;
	const authHeader = opts.headers.get("authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		try {
			const payload = auth.verifyToken(token);
			userId = payload.userId;
		} catch {
			// Invalid token - will be handled by protected procedure
		}
	} else {
		// TODO: remove this fallback for production
		// Fallback to a hardcoded user for development/demo
		userId = "00000000-0000-0000-0000-000000000000";
	}

	return {
		db,
		userId,
		services: {
			backboard: bb,
			conversation: conversationService,
			memorySynthesis: memorySynthesisService,
			memoryRetrieval: memoryRetrievalService,
			agent: agentService,
			auth,
		},
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

	return result;
});

/**
 * Middleware to ensure user is authenticated.
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		});
	}
	return next({
		ctx: {
			...ctx,
			userId: ctx.userId, // Now guaranteed to be non-null
		},
	});
});

/**
 * Middleware to ensure Backboard assistant is initialized.
 */
const backboardMiddleware = t.middleware(async ({ ctx, next }) => {
	// Ensure assistant is initialized (creates one if needed)
	await ctx.services.backboard.ensureAssistant({
		name: "Joanna",
		systemPrompt: JOANNA_SYSTEM_PROMPT,
	});
	return next();
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure
	.use(timingMiddleware)
	.use(authMiddleware);

/**
 * Agent procedure - requires authentication and initialized Backboard assistant
 */
export const agentProcedure = t.procedure
	.use(timingMiddleware)
	.use(authMiddleware)
	.use(backboardMiddleware);
