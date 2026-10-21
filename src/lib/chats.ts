import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId, titleFromPrompt } from "@/lib/ids";
import type { Chat, ChatSummary, Message, ModelId, Version, Visibility } from "@/lib/types";

const { chats, messages, versions, generations, user } = schema;

type MessageRow = typeof messages.$inferSelect;
type VersionRow = typeof versions.$inferSelect;

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.getTime(),
    status: row.status,
    steps: row.steps,
    workedMs: row.workedMs,
    credits: row.credits,
    error: row.error,
  };
}

export function toVersion(row: VersionRow): Version {
  return {
    n: row.n,
    kind: row.kind,
    title: row.title,
    runtime: row.runtime,
    files: row.files,
    previewHtml: row.previewHtml,
    createdAt: row.createdAt.getTime(),
  };
}

/** A chat the viewer may see: their own, or anyone's unlisted/public chat. */
export async function getChatForViewer(id: string, viewerId: string | null): Promise<Chat | null> {
  const row = await db.query.chats.findFirst({
    where: eq(chats.id, id),
    with: {
      messages: { orderBy: asc(messages.createdAt) },
      versions: { orderBy: asc(versions.n) },
      owner: { columns: { name: true, isAnonymous: true } },
    },
  });
  if (!row) return null;
  const isOwner = viewerId === row.userId;
  if (!isOwner && row.visibility === "private") return null;
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    visibility: row.visibility,
    createdAt: row.createdAt.getTime(),
    messages: row.messages.map(toMessage),
    versions: row.versions.map(toVersion),
    isOwner,
    ownerName: row.owner?.isAnonymous ? "Guest" : (row.owner?.name ?? null),
  };
}

export async function getOwnedChat(id: string, userId: string) {
  return db.query.chats.findFirst({ where: and(eq(chats.id, id), eq(chats.userId, userId)) });
}

export async function listChats(userId: string, limit = 50): Promise<ChatSummary[]> {
  const rows = await db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.getTime() }));
}

export async function createChat(userId: string, prompt: string, model: ModelId) {
  const id = newId();
  await db.insert(chats).values({ id, userId, title: titleFromPrompt(prompt), model });
  return id;
}

export async function updateChat(
  id: string,
  userId: string,
  patch: Partial<{ title: string; visibility: Visibility; model: ModelId }>,
) {
  const result = await db
    .update(chats)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(chats.id, id), eq(chats.userId, userId)));
  return result.rowsAffected > 0;
}

export async function deleteChat(id: string, userId: string) {
  const result = await db.delete(chats).where(and(eq(chats.id, id), eq(chats.userId, userId)));
  return result.rowsAffected > 0;
}

/** Copy a visible chat (messages + versions) into the viewer's account. */
export async function duplicateChat(id: string, viewerId: string) {
  const source = await getChatForViewer(id, viewerId);
  if (!source) return null;
  const newChatId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(chats).values({
      id: newChatId,
      userId: viewerId,
      title: source.isOwner ? `${source.title} (copy)` : source.title,
      model: source.model,
      forkedFromId: source.id,
    });
    if (source.messages.length) {
      await tx.insert(messages).values(
        source.messages.map((m) => ({
          id: newId(16),
          chatId: newChatId,
          role: m.role,
          content: m.content,
          status: m.status === "streaming" ? "done" : m.status,
          steps: m.steps,
          workedMs: m.workedMs,
          credits: m.credits,
          error: m.error,
          createdAt: new Date(m.createdAt),
        })),
      );
    }
    if (source.versions.length) {
      await tx.insert(versions).values(
        source.versions.map((v) => ({
          id: newId(16),
          chatId: newChatId,
          n: v.n,
          kind: v.kind,
          title: v.title,
          runtime: v.runtime,
          files: v.files,
          previewHtml: v.previewHtml,
          createdAt: new Date(v.createdAt),
        })),
      );
    }
  });
  return newChatId;
}

/** Restoring creates a new latest version with the old files, keeping history linear. */
export async function restoreVersion(chatId: string, userId: string, n: number) {
  const chat = await getOwnedChat(chatId, userId);
  if (!chat) return null;
  const all = await db.select().from(versions).where(eq(versions.chatId, chatId)).orderBy(asc(versions.n));
  const target = all.find((v) => v.n === n);
  if (!target) return null;
  const nextN = (all.at(-1)?.n ?? 0) + 1;
  const now = new Date();
  const versionRow = { ...target, id: newId(16), n: nextN, createdAt: now };
  const messageRow = {
    id: newId(16),
    chatId,
    role: "assistant" as const,
    content: `Restored v${n} as v${nextN}.`,
    status: "done" as const,
    steps: [
      {
        id: newId(8),
        kind: "version" as const,
        label: `Restored v${n}`,
        versionN: nextN,
        files: target.files.map((f) => f.path),
        done: true,
      },
    ],
    workedMs: null,
    credits: null,
    error: null,
    createdAt: now,
  };
  await db.batch([
    db.insert(versions).values(versionRow),
    db.insert(messages).values(messageRow),
    db.update(chats).set({ updatedAt: now }).where(eq(chats.id, chatId)),
  ]);
  return { version: toVersion(versionRow), message: toMessage(messageRow) };
}

export async function countGenerationsSince(userId: string, since: Date, keySource?: "server" | "user" | "none") {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        gte(generations.createdAt, since),
        keySource ? eq(generations.keySource, keySource) : undefined,
      ),
    );
  return Number(row?.n ?? 0);
}

export async function getUserFlags(userId: string) {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { isAnonymous: true } });
  return { isAnonymous: Boolean(row?.isAnonymous) };
}
