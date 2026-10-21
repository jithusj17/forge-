import type { Message, Step, Version } from "@/lib/types";

/**
 * Generation stream protocol: the route handler writes one JSON event per line
 * (NDJSON); the client applies them to its local copy of the chat.
 */
export type GenerationEvent =
  | { type: "user"; message: Message }
  | { type: "assistant"; message: Message }
  | { type: "step"; step: Step }
  | { type: "step-update"; id: string; patch: Partial<Step> }
  | { type: "text"; delta: string }
  | { type: "version"; version: Version }
  | { type: "done"; message: Message }
  | { type: "error"; error: string; code?: GenerationErrorCode };

export type GenerationErrorCode =
  | "unauthorized"
  | "not_found"
  | "rate_limited"
  | "busy"
  | "invalid_api_key"
  | "upstream"
  | "refused";

export type Emit = (event: GenerationEvent) => void;

/** Parse an NDJSON byte stream into events. Tolerates chunks that split lines. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<GenerationEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as GenerationEvent;
    }
    if (done) break;
  }
  if (buffer.trim()) yield JSON.parse(buffer) as GenerationEvent;
}

/** Apply an event to an assistant message (pure; shared by server persistence and client UI). */
export function applyToMessage(message: Message, event: GenerationEvent): Message {
  switch (event.type) {
    case "step":
      return { ...message, steps: [...(message.steps ?? []), event.step] };
    case "step-update":
      return {
        ...message,
        steps: (message.steps ?? []).map((s) => (s.id === event.id ? { ...s, ...event.patch } : s)),
      };
    case "text":
      return { ...message, content: message.content + event.delta };
    case "done":
      return event.message;
    default:
      return message;
  }
}
