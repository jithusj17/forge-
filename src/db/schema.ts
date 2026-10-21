import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ModelId, ProjectFile, Step } from "@/lib/types";
import { user } from "./auth-schema";

export * from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const chats = sqliteTable(
  "chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    model: text("model").$type<ModelId>().notNull(),
    /** private: owner only · unlisted: anyone with the link · public: link + listed */
    visibility: text("visibility", { enum: ["private", "unlisted", "public"] }).notNull().default("private"),
    forkedFromId: text("forked_from_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(now)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("chats_user_updated_idx").on(t.userId, t.updatedAt)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull().default(""),
    status: text("status", { enum: ["streaming", "done", "error"] }),
    steps: text("steps", { mode: "json" }).$type<Step[]>(),
    workedMs: integer("worked_ms"),
    credits: real("credits"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("messages_chat_created_idx").on(t.chatId, t.createdAt)],
);

export const versions = sqliteTable(
  "versions",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    n: integer("n").notNull(),
    kind: text("kind"),
    title: text("title").notNull(),
    /** "html": self-contained preview document · "react": Sandpack project */
    runtime: text("runtime", { enum: ["html", "react"] }).notNull(),
    files: text("files", { mode: "json" }).$type<ProjectFile[]>().notNull(),
    previewHtml: text("preview_html"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [uniqueIndex("versions_chat_n_idx").on(t.chatId, t.n)],
);

/** One row per generation: drives rate limits and usage display. */
export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
    engine: text("engine", { enum: ["mock", "claude"] }).notNull(),
    keySource: text("key_source", { enum: ["none", "server", "user"] }).notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  },
  (t) => [index("generations_user_created_idx").on(t.userId, t.createdAt)],
);

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  versions: many(versions),
  owner: one(user, { fields: [chats.userId], references: [user.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
}));

export const versionsRelations = relations(versions, ({ one }) => ({
  chat: one(chats, { fields: [versions.chatId], references: [chats.id] }),
}));
