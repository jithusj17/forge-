import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { countGenerationsSince, getOwnedChat, toMessage, toVersion } from "@/lib/chats";
import { runClaudeEngine, EngineError } from "@/lib/engine/claude";
import { applyToMessage, type GenerationErrorCode, type GenerationEvent } from "@/lib/engine/events";
import { runMockEngine, type EngineResult } from "@/lib/engine/mock";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import type { Message } from "@/lib/types";

// Claude turns can take minutes; allow up to 5 minutes on Vercel.
export const maxDuration = 300;

const Body = z.object({
  prompt: z.string().trim().min(1).max(4000),
  model: z.enum(["forge-mini", "forge-pro", "forge-max", "forge-max-fast"]),
  /** "demo" forces the free mock engine even when a key is available. */
  engine: z.enum(["auto", "demo"]).default("auto"),
});

const GUEST_DAILY_LIMIT = 20;
const STALE_STREAM_MS = 6 * 60 * 1000;

function jsonError(status: number, error: string, code: GenerationErrorCode) {
  return Response.json({ type: "error", error, code } satisfies GenerationEvent, { status });
}

export async function POST(request: Request, ctx: RouteContext<"/api/chats/[id]/generate">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in to generate.", "unauthorized");
  const userId = session.user.id;
  const isGuest = Boolean(session.user.isAnonymous);

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Invalid request.", "upstream");
  const { prompt, model, engine } = parsed.data;

  const chat = await getOwnedChat(id, userId);
  if (!chat) return jsonError(404, "Chat not found.", "not_found");

  // One generation at a time per chat (ignore a stale row left by a crashed run).
  const [last] = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.chatId, id))
    .orderBy(desc(schema.messages.createdAt))
    .limit(1);
  if (last?.status === "streaming" && Date.now() - last.createdAt.getTime() < STALE_STREAM_MS) {
    return jsonError(409, "A generation is already running for this chat.", "busy");
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedToday = await countGenerationsSince(userId, dayAgo);
  const dailyLimit = isGuest ? Math.min(GUEST_DAILY_LIMIT, env.DAILY_GENERATION_LIMIT) : env.DAILY_GENERATION_LIMIT;
  if (usedToday >= dailyLimit) {
    return jsonError(429, `Daily limit reached (${dailyLimit} generations). Try again tomorrow.`, "rate_limited");
  }

  // Key selection: the visitor's own key > the server key (signed-in, capped) > free demo engine.
  const userKey = request.headers.get("x-anthropic-key")?.trim() || null;
  let keySource: "user" | "server" | "none" = "none";
  let apiKey: string | null = null;
  if (engine === "auto") {
    if (userKey) {
      keySource = "user";
      apiKey = userKey;
    } else if (env.ANTHROPIC_API_KEY && !isGuest) {
      const serverUsed = await countGenerationsSince(userId, dayAgo, "server");
      if (serverUsed < env.SERVER_KEY_DAILY_LIMIT) {
        keySource = "server";
        apiKey = env.ANTHROPIC_API_KEY;
      }
    }
  }

  const history = (
    await db.select().from(schema.messages).where(eq(schema.messages.chatId, id)).orderBy(schema.messages.createdAt)
  ).map(toMessage);
  const [previousRow] = await db
    .select()
    .from(schema.versions)
    .where(eq(schema.versions.chatId, id))
    .orderBy(desc(schema.versions.n))
    .limit(1);
  const previous = previousRow ? toVersion(previousRow) : undefined;
  const versionN = (previous?.n ?? 0) + 1;

  const startedAt = Date.now();
  const userMessage: Message = { id: newId(16), role: "user", content: prompt, createdAt: startedAt };
  let assistant: Message = {
    id: newId(16),
    role: "assistant",
    content: "",
    createdAt: startedAt + 1,
    status: "streaming",
    steps: [],
  };

  await db.batch([
    db.insert(schema.messages).values({ ...userMessage, chatId: id, createdAt: new Date(userMessage.createdAt), status: null }),
    db
      .insert(schema.messages)
      .values({ ...assistant, chatId: id, createdAt: new Date(assistant.createdAt), status: "streaming" }),
    db.update(schema.chats).set({ model, updatedAt: new Date() }).where(eq(schema.chats.id, id)),
  ]);

  const encoder = new TextEncoder();
  // Stop button / closed tab: the client cancels the response, which aborts the engine.
  const abort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      abort.abort();
    },
    async start(controller) {
      let open = true;
      const emit = (event: GenerationEvent) => {
        if (event.type !== "user" && event.type !== "assistant") assistant = applyToMessage(assistant, event);
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false; // client went away; keep generating so the result is saved
        }
      };

      emit({ type: "user", message: userMessage });
      emit({ type: "assistant", message: assistant });

      let result: EngineResult = { version: null };
      let failure: { error: string; code: GenerationErrorCode } | null = null;
      try {
        const input = { prompt, history, previous, versionN, emit, signal: abort.signal };
        result =
          apiKey !== null
            ? await runClaudeEngine(input, { apiKey, modelId: model })
            : await runMockEngine(input);
      } catch (err) {
        failure =
          err instanceof EngineError
            ? { error: err.message, code: err.code }
            : { error: "Something went wrong while generating.", code: "upstream" };
        if (!(err instanceof EngineError)) console.error("generation failed", err);
      }

      const now = new Date();
      const stopped = abort.signal.aborted;
      if (stopped) failure = null; // a user stop is not an error
      const finished: Message = {
        ...assistant,
        status: failure ? "error" : "done",
        error: failure?.error ?? (stopped ? "Stopped." : null),
        content: assistant.content || (failure ? "" : result.version ? "" : "I couldn't produce any files for that request."),
        steps: (assistant.steps ?? []).map((s) => ({ ...s, done: true })),
        workedMs: Date.now() - startedAt,
        credits: result.usage ? Math.round(result.usage.costUsd * 10000) / 10000 : 0,
      };

      const writes = [
        db
          .update(schema.messages)
          .set({
            content: finished.content,
            status: finished.status,
            steps: finished.steps,
            workedMs: finished.workedMs,
            credits: finished.credits,
            error: finished.error,
          })
          .where(and(eq(schema.messages.id, assistant.id), eq(schema.messages.chatId, id))),
        db.insert(schema.generations).values({
          id: newId(16),
          userId,
          chatId: id,
          engine: apiKey ? "claude" : "mock",
          keySource,
          model: result.usage?.model ?? null,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
        }),
        db.update(schema.chats).set({ updatedAt: now }).where(eq(schema.chats.id, id)),
      ] as const;

      if (result.version && !failure) {
        const version = { ...result.version, createdAt: now.getTime() };
        await db.batch([
          db.insert(schema.versions).values({
            id: newId(16),
            chatId: id,
            n: version.n,
            kind: version.kind ?? null,
            title: version.title,
            runtime: version.runtime,
            files: version.files,
            previewHtml: version.previewHtml ?? null,
            createdAt: now,
          }),
          ...writes,
        ]);
        emit({ type: "version", version });
      } else {
        await db.batch([...writes]);
      }

      if (failure) emit({ type: "error", ...failure });
      emit({ type: "done", message: finished });
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-forge-engine": apiKey ? `claude:${keySource}` : "demo",
    },
  });
}
