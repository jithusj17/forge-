import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ProjectFile, Version } from "@/lib/types";
import type { EngineInput, EngineResult } from "./mock";
import { CLAUDE_MODELS, costUsd } from "./models";
import type { ModelId } from "@/lib/types";

const MAX_ITERATIONS = 6;
const MAX_FILES = 12;
const MAX_FILE_BYTES = 120_000;
const ALLOWED_EXT = /\.(tsx|ts|jsx|js|css|json|md)$/;

export class EngineError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_api_key" | "upstream" | "refused",
  ) {
    super(message);
  }
}

// Stable prefix (tools + system) so prompt caching hits across turns.
const SYSTEM_PROMPT = `You are Forge, an expert front-end engineer who builds small, polished, working web apps from a description.

How your output runs:
- The project runs in a Sandpack "react-ts" sandbox. The entry file is /App.tsx and must default-export the root component.
- Style with Tailwind CSS utility classes (Tailwind is loaded globally). Do not import CSS frameworks.
- Available packages: react, react-dom, lucide-react. Do not import anything else and do not call external APIs that need keys; use realistic local sample data instead.
- Keep the project small and readable: at most ${MAX_FILES} files, components under /components/, helpers under /lib/.

How to work:
- Create or replace files only with the write_file tool. Always write complete file contents, never diffs or placeholders.
- On follow-up requests you receive the current files. Rewrite only the files that need to change.
- Make it look intentional: good spacing, clear hierarchy, accessible markup (labels, alt text, focus states), responsive layout.
- When the files are written, reply with a short summary (2-4 sentences) of what you built or changed, naming key files in backticks. Do not repeat code in the summary.`;

const WriteFileInput = z.object({
  path: z.string().min(2).max(120),
  content: z.string().max(MAX_FILE_BYTES),
});

const TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  {
    name: "write_file",
    description:
      "Create or overwrite one file in the project. Paths are absolute from the project root, e.g. /App.tsx or /components/header.tsx.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute project path starting with /" },
        content: { type: "string", description: "Complete file contents" },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },
];

/** Normalize a model-supplied path; null if it escapes the project or has a disallowed type. */
export function normalizeProjectPath(raw: string): string | null {
  const parts: string[] = [];
  for (const seg of raw.replace(/\\/g, "/").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") return null;
    parts.push(seg);
  }
  const path = "/" + parts.join("/");
  if (parts.length === 0 || !ALLOWED_EXT.test(path)) return null;
  if (parts.some((p) => p.startsWith(".") || p === "node_modules")) return null;
  return path;
}

function languageOf(path: string): ProjectFile["language"] {
  const ext = path.split(".").at(-1) as ProjectFile["language"];
  return ext;
}

function stepId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function runClaudeEngine(
  { prompt, history, previous, versionN, emit, signal }: EngineInput,
  opts: { apiKey: string; modelId: ModelId },
): Promise<EngineResult> {
  const config = CLAUDE_MODELS[opts.modelId];
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 2 });

  // Previous React files are the starting point; demo (html) versions aren't React, so start fresh.
  const files = new Map<string, string>(
    previous?.runtime === "react" ? previous.files.map((f) => [f.path, f.content]) : [],
  );

  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of history) {
    if (m.status === "error" || !m.content.trim()) continue;
    messages.push({ role: m.role, content: m.content });
  }
  const currentFiles = [...files.entries()]
    .map(([path, content]) => `<file path="${path}">\n${content}\n</file>`)
    .join("\n");
  messages.push({
    role: "user",
    content: currentFiles ? `<current_files>\n${currentFiles}\n</current_files>\n\n${prompt}` : prompt,
  });

  emit({
    type: "step",
    step: {
      id: stepId(),
      kind: "explored",
      label: files.size ? "Explored codebase" : "Fresh project",
      files: [...files.keys()],
      done: true,
    },
  });

  let thinking: { id: string; startedAt: number } | null = null;
  let versionStep: string | null = null;
  const written: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let costTotal = 0;

  const closeThinking = () => {
    if (!thinking) return;
    const secs = Math.max(1, Math.round((Date.now() - thinking.startedAt) / 1000));
    emit({ type: "step-update", id: thinking.id, patch: { label: `Thought for ${secs}s`, done: true } });
    thinking = null;
  };

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const stream = client.beta.messages.stream(
        {
          model: config.model,
          max_tokens: 64000,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          tools: TOOLS,
          messages,
          output_config: { effort: config.effort },
          ...(config.fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        },
        { signal },
      );

      // Partial tool input per content-block index, to surface file names while they stream.
      const toolJson = new Map<number, string>();

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "thinking" && !thinking) {
            thinking = { id: stepId(), startedAt: Date.now() };
            emit({ type: "step", step: { id: thinking.id, kind: "thought", label: "Thinking", done: false } });
          } else if (block.type === "tool_use") {
            closeThinking();
            toolJson.set(event.index, "");
            if (!versionStep) {
              versionStep = stepId();
              emit({
                type: "step",
                step: {
                  id: versionStep,
                  kind: "version",
                  label: previous ? "Updating project" : "Creating project",
                  versionN,
                  files: [],
                  done: false,
                },
              });
            }
          } else if (block.type === "text") {
            closeThinking();
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            emit({ type: "text", delta: event.delta.text });
          } else if (event.delta.type === "input_json_delta" && toolJson.has(event.index)) {
            const acc = toolJson.get(event.index)! + event.delta.partial_json;
            toolJson.set(event.index, acc);
            // Show the file as soon as its path has streamed in.
            const m = /"path"\s*:\s*"([^"]+)"/.exec(acc);
            const path = m ? normalizeProjectPath(m[1]) : null;
            if (path && versionStep && !written.includes(path)) {
              written.push(path);
              emit({ type: "step-update", id: versionStep, patch: { files: [...written] } });
            }
          }
        }
      }

      const message = await stream.finalMessage();
      closeThinking();

      const usage = message.usage;
      const billedInput =
        usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1;
      inputTokens += usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
      outputTokens += usage.output_tokens;
      costTotal += costUsd(config, billedInput, usage.output_tokens);

      if (message.stop_reason === "refusal") {
        throw new EngineError("The model declined this request. Try rephrasing it.", "refused");
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }

      const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) break; // end_turn (or max_tokens on plain text)
      if (message.stop_reason === "max_tokens") {
        throw new EngineError("The response was cut off while writing a file. Try a smaller request.", "upstream");
      }

      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const tool of toolUses) {
        const parsed = WriteFileInput.safeParse(tool.input);
        const path = parsed.success ? normalizeProjectPath(parsed.data.path) : null;
        if (!parsed.success || !path) {
          results.push({
            type: "tool_result",
            tool_use_id: tool.id,
            is_error: true,
            content: parsed.success
              ? `Rejected path "${parsed.data.path}". Use an absolute path like /App.tsx with a .tsx/.ts/.css/.json extension.`
              : "Invalid input: expected { path: string, content: string }.",
          });
          continue;
        }
        if (!files.has(path) && files.size >= MAX_FILES) {
          results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: `File limit (${MAX_FILES}) reached.` });
          continue;
        }
        files.set(path, parsed.data.content);
        if (!written.includes(path)) written.push(path);
        results.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: `Wrote ${path} (${parsed.data.content.split("\n").length} lines).`,
        });
      }
      if (versionStep) emit({ type: "step-update", id: versionStep, patch: { files: [...written] } });
      messages.push({ role: "user", content: results });
    }
  } catch (err) {
    if (err instanceof EngineError) throw err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new EngineError("That API key was rejected by Anthropic. Check it in Settings.", "invalid_api_key");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new EngineError("Claude is rate limiting this key right now. Try again in a minute.", "upstream");
    }
    if (err instanceof Anthropic.APIUserAbortError) {
      throw new EngineError("Generation stopped.", "upstream");
    }
    if (err instanceof Anthropic.APIError) {
      throw new EngineError(`Claude API error (${err.status ?? "network"}). Please try again.`, "upstream");
    }
    throw err;
  }

  const usage = { inputTokens, outputTokens, costUsd: costTotal, model: config.model };
  if (!versionStep || written.length === 0) return { version: null, usage };

  emit({
    type: "step-update",
    id: versionStep,
    patch: { label: previous ? "Updated project" : "Created project", done: true },
  });

  if (!files.has("/App.tsx")) {
    throw new EngineError("The generated project is missing /App.tsx. Try again.", "upstream");
  }

  const version: Omit<Version, "createdAt"> = {
    n: versionN,
    kind: "react",
    title: prompt.slice(0, 60),
    runtime: "react",
    files: [...files.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, content]) => ({ path, language: languageOf(path), content })),
    previewHtml: null,
  };
  return { version, usage };
}
