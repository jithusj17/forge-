"use client";

import { readEvents, type GenerationEvent } from "@/lib/engine/events";
import { getApiKey } from "@/lib/local-settings";
import type { ModelId } from "@/lib/types";

/** Start a generation and feed every streamed event to `onEvent`. */
export async function streamGeneration(
  chatId: string,
  body: { prompt: string; model: ModelId; engine?: "auto" | "demo" },
  onEvent: (event: GenerationEvent) => void,
  signal?: AbortSignal,
) {
  const apiKey = getApiKey();
  let res: Response;
  try {
    res = await fetch(`/api/chats/${chatId}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(apiKey ? { "x-anthropic-key": apiKey } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    onEvent({ type: "error", error: "Network error. Check your connection and try again.", code: "upstream" });
    return;
  }

  if (!res.ok || !res.body) {
    const payload = (await res.json().catch(() => null)) as GenerationEvent | null;
    onEvent(
      payload?.type === "error" ? payload : { type: "error", error: `Request failed (${res.status}).`, code: "upstream" },
    );
    return;
  }

  try {
    for await (const event of readEvents(res.body)) onEvent(event);
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      onEvent({ type: "error", error: "The connection dropped. Your result is saved; reload to see it.", code: "upstream" });
    }
  }
}

/** Hand a prompt from the landing page to the new chat's workspace. */
const PENDING = "forge:pending";
export function setPendingPrompt(chatId: string, prompt: string, model: ModelId) {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify({ chatId, prompt, model }));
  } catch {
    // ignore: the user can resend from the workspace
  }
}
export function takePendingPrompt(chatId: string): { prompt: string; model: ModelId } | null {
  try {
    const raw = sessionStorage.getItem(PENDING);
    if (!raw) return null;
    const pending = JSON.parse(raw) as { chatId: string; prompt: string; model: ModelId };
    if (pending.chatId !== chatId) return null;
    sessionStorage.removeItem(PENDING);
    return pending;
  } catch {
    return null;
  }
}
