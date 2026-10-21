import { pickMockProject } from "@/lib/mock-templates";
import type { Message, Version } from "@/lib/types";
import type { Emit } from "./events";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

let counter = 0;
const stepId = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

export interface EngineInput {
  prompt: string;
  history: Message[];
  previous: Version | undefined;
  versionN: number;
  emit: Emit;
  signal?: AbortSignal;
}

export interface EngineResult {
  version: Omit<Version, "createdAt"> | null;
  usage?: { inputTokens: number; outputTokens: number; costUsd: number; model: string };
}

/**
 * Demo engine: no API key, no cost. Streams the same event protocol as the
 * Claude engine using canned projects, so the whole product works offline.
 */
export async function runMockEngine({ prompt, history, previous, versionN, emit, signal }: EngineInput): Promise<EngineResult> {
  const firstPrompt = history.find((m) => m.role === "user")?.content ?? prompt;
  const project = pickMockProject(prompt, previous?.kind ?? undefined, firstPrompt);
  const isFirst = !previous;

  const thought = stepId();
  emit({ type: "step", step: { id: thought, kind: "thought", label: "Thinking", done: false } });
  await sleep(900, signal);
  emit({ type: "step-update", id: thought, patch: { label: "Thought for 1s", done: true } });

  const explored = stepId();
  emit({ type: "step", step: { id: explored, kind: "explored", label: "Exploring codebase", done: false } });
  await sleep(600, signal);
  emit({
    type: "step-update",
    id: explored,
    patch: {
      label: "Explored codebase",
      files: previous ? previous.files.map((f) => f.path) : ["app/layout.tsx", "app/globals.css"],
      done: true,
    },
  });

  emit({
    type: "step",
    step: {
      id: stepId(),
      kind: "note",
      label: isFirst
        ? `Fresh project. I'll create a ${project.title.toLowerCase()}.`
        : `I'll update the ${project.title.toLowerCase()} based on your request.`,
      done: true,
    },
  });

  const versionStep = stepId();
  const written: string[] = [];
  emit({
    type: "step",
    step: {
      id: versionStep,
      kind: "version",
      label: `${isFirst ? "Created" : "Updated"} ${project.title.toLowerCase()}`,
      versionN,
      files: [],
      done: false,
    },
  });
  for (const file of project.files) {
    if (signal?.aborted) break;
    await sleep(300, signal);
    written.push(file.path);
    emit({ type: "step-update", id: versionStep, patch: { files: [...written] } });
  }

  const version: Omit<Version, "createdAt"> = {
    n: versionN,
    kind: project.kind,
    title: project.title,
    runtime: "html",
    files: project.files,
    previewHtml: project.previewHtml,
  };
  emit({ type: "step-update", id: versionStep, patch: { done: true } });

  const words = project.summary.split(/(\s+)/);
  for (let i = 0; i < words.length && !signal?.aborted; i += 6) {
    emit({ type: "text", delta: words.slice(i, i + 6).join("") });
    await sleep(40, signal);
  }

  return { version };
}
