/**
 * Database schema for Joanna voice assistant.
 * Uses Drizzle ORM with PostgreSQL.
 */
import { relations } from "drizzle-orm";
import { index, pgEnum, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Multi-project schema prefix for Drizzle ORM.
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `joanna_${name}`);

// === Enums ===

export const conversationStatusEnum = pgEnum("conversation_status", [
	"active",
	"archived",
]);

export const messageRoleEnum = pgEnum("message_role", [
	"user",
	"assistant",
	"system",
]);

// === Users Table ===
// TODO: Add password hashing, email verification, OAuth integration

export const users = createTable(
	"user",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		email: d.varchar({ length: 255 }).notNull().unique(),
		// TODO: Store hashed password, not plaintext
		passwordHash: d.varchar({ length: 255 }).notNull(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [index("user_email_idx").on(t.email)],
);

// === Conversations Table ===

export const conversations = createTable(
	"conversation",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		userId: d.uuid().references(() => users.id, { onDelete: "cascade" }),
		backboardThreadId: d.varchar({ length: 255 }).notNull().unique(),
		title: d.varchar({ length: 500 }),
		status: conversationStatusEnum().default("active").notNull(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("conversation_user_idx").on(t.userId),
		index("conversation_backboard_thread_idx").on(t.backboardThreadId),
		index("conversation_status_idx").on(t.status),
	],
);

// === Messages Table ===

export const messages = createTable(
	"message",
	(d) => ({
		id: d.uuid().primaryKey().defaultRandom(),
		conversationId: d
			.uuid()
			.references(() => conversations.id, { onDelete: "cascade" })
			.notNull(),
		role: messageRoleEnum().notNull(),
		content: d.text().notNull(),
		// Store agent planning state, extracted memories, etc.
		metadata: d.jsonb().$type<Record<string, unknown>>(),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
	}),
	(t) => [
		index("message_conversation_idx").on(t.conversationId),
		index("message_created_at_idx").on(t.createdAt),
	],
);

// === Relations ===

export const usersRelations = relations(users, ({ many }) => ({
	conversations: many(conversations),
}));

export const conversationsRelations = relations(
	conversations,
	({ one, many }) => ({
		user: one(users, {
			fields: [conversations.userId],
			references: [users.id],
		}),
		messages: many(messages),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
}));

// === Legacy posts table (example from create-t3-app) ===

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [index("name_idx").on(t.name)],
);
