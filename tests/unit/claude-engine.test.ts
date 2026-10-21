import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeProjectPath, runClaudeEngine } from "@/lib/engine/claude";
import type { GenerationEvent } from "@/lib/engine/events";

describe("normalizeProjectPath", () => {
  it("normalizes safe paths", () => {
    expect(normalizeProjectPath("App.tsx")).toBe("/App.tsx");
    expect(normalizeProjectPath("/components//card.tsx")).toBe("/components/card.tsx");
    expect(normalizeProjectPath("./lib/./data.ts")).toBe("/lib/data.ts");
  });
  it("rejects traversal, hidden files and unknown extensions", () => {
    expect(normalizeProjectPath("../secrets.ts")).toBeNull();
    expect(normalizeProjectPath("/a/../../b.ts")).toBeNull();
    expect(normalizeProjectPath("/.env")).toBeNull();
    expect(normalizeProjectPath("/node_modules/x.js")).toBeNull();
    expect(normalizeProjectPath("/run.sh")).toBeNull();
  });
});

// A fake Anthropic API speaking the real SSE wire format: turn 1 thinks and calls
// write_file, turn 2 answers with a summary.
type Sse = Record<string, unknown>;
const sse = (events: Sse[]) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");

function messageStart(id: string) {
  return {
    type: "message_start",
    message: {
      id,
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 1000, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    },
  };
}

const APP = 'export default function App() {\n  return <h1 className="p-8">Hi</h1>\n}\n';

const turn1 = sse([
  messageStart("msg_1"),
  { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } },
  { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature: "sig" } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_1", name: "write_file", input: {} } },
  { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"path": "/App.tsx", ' } },
  { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: `"content": ${JSON.stringify(APP)}}` } },
  { type: "content_block_stop", index: 1 },
  { type: "content_block_start", index: 2, content_block: { type: "tool_use", id: "toolu_2", name: "write_file", input: {} } },
  { type: "content_block_delta", index: 2, delta: { type: "input_json_delta", partial_json: '{"path": "../../etc/passwd.ts", "content": "x"}' } },
  { type: "content_block_stop", index: 2 },
  { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 200 } },
  { type: "message_stop" },
]);

const turn2 = sse([
  messageStart("msg_2"),
  { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Built a greeting in " } },
  { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "`/App.tsx`." } },
  { type: "content_block_stop", index: 0 },
  { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } },
  { type: "message_stop" },
]);

let server: Server;
const requests: { headers: IncomingMessage["headers"]; body: Record<string, unknown> }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      requests.push({ headers: req.headers, body: JSON.parse(raw) });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(requests.length === 1 ? turn1 : turn2);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  delete process.env.ANTHROPIC_BASE_URL;
  server.close();
});

describe("runClaudeEngine", () => {
  it("runs the tool loop, validates paths, streams events and returns a React version", async () => {
    const events: GenerationEvent[] = [];
    const result = await runClaudeEngine(
      { prompt: "Say hi", history: [], previous: undefined, versionN: 1, emit: (e) => events.push(e) },
      { apiKey: "sk-ant-test", modelId: "forge-max" },
    );

    // Request shape: Opus 5.5, cached system prompt, eager tool streaming, default fallback.
    const first = requests[0];
    expect(first.headers["x-api-key"]).toBe("sk-ant-test");
    expect(String(first.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(first.body.model).toBe("claude-opus-5-5");
    expect(first.body.fallbacks).toBe("default");
    expect(first.body.output_config).toEqual({ effort: "high" });
    expect((first.body.tools as { eager_input_streaming: boolean }[])[0].eager_input_streaming).toBe(true);

    // Turn 2 received one ok result and one rejected path.
    const toolResults = (requests[1].body.messages as { role: string; content: unknown }[]).at(-1)!.content as {
      tool_use_id: string;
      is_error?: boolean;
    }[];
    expect(toolResults.find((r) => r.tool_use_id === "toolu_1")?.is_error).toBeUndefined();
    expect(toolResults.find((r) => r.tool_use_id === "toolu_2")?.is_error).toBe(true);

    expect(result.version?.runtime).toBe("react");
    expect(result.version?.files).toEqual([{ path: "/App.tsx", language: "tsx", content: APP }]);
    expect(result.usage?.model).toBe("claude-opus-5-5");
    expect(result.usage?.costUsd).toBeGreaterThan(0);

    const text = events.filter((e) => e.type === "text").map((e) => (e as { delta: string }).delta).join("");
    expect(text).toBe("Built a greeting in `/App.tsx`.");
    expect(events.some((e) => e.type === "step" && e.step.kind === "thought")).toBe(true);
    expect(events.some((e) => e.type === "step-update" && e.patch.files?.includes("/App.tsx"))).toBe(true);
  });
});
