import { describe, expect, it } from "vitest";
import { applyToMessage, readEvents, type GenerationEvent } from "@/lib/engine/events";
import type { Message } from "@/lib/types";

function streamOf(chunks: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const chunk of chunks) c.enqueue(enc.encode(chunk));
      c.close();
    },
  });
}

describe("readEvents", () => {
  it("parses NDJSON even when chunks split lines and multibyte characters", async () => {
    const events: GenerationEvent[] = [
      { type: "text", delta: "héllo " },
      { type: "text", delta: "wörld" },
      { type: "error", error: "x", code: "busy" },
    ];
    const raw = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    // Split mid-line and mid-character.
    const bytes = new TextEncoder().encode(raw);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < bytes.length; i += 5) c.enqueue(bytes.slice(i, i + 5));
        c.close();
      },
    });
    const out: GenerationEvent[] = [];
    for await (const e of readEvents(stream)) out.push(e);
    expect(out).toEqual(events);
  });

  it("accepts a final line without a trailing newline", async () => {
    const out: GenerationEvent[] = [];
    for await (const e of readEvents(streamOf(['{"type":"text","delta":"a"}']))) out.push(e);
    expect(out).toEqual([{ type: "text", delta: "a" }]);
  });
});

describe("applyToMessage", () => {
  const base: Message = { id: "m", role: "assistant", content: "", createdAt: 0, steps: [] };

  it("adds and updates steps and appends text", () => {
    let m = applyToMessage(base, { type: "step", step: { id: "s1", kind: "thought", label: "Thinking", done: false } });
    m = applyToMessage(m, { type: "step-update", id: "s1", patch: { label: "Thought for 2s", done: true } });
    m = applyToMessage(m, { type: "text", delta: "Hi" });
    m = applyToMessage(m, { type: "text", delta: " there" });
    expect(m.steps).toEqual([{ id: "s1", kind: "thought", label: "Thought for 2s", done: true }]);
    expect(m.content).toBe("Hi there");
  });

  it("replaces the message on done and ignores unrelated events", () => {
    const final: Message = { ...base, content: "final", status: "done" };
    expect(applyToMessage(base, { type: "done", message: final })).toBe(final);
    expect(applyToMessage(base, { type: "error", error: "x" })).toBe(base);
  });
});
