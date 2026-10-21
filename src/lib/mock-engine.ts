"use client";

import { pickMockProject } from "./mock-templates";
import { appendMessage, getChat, newId, updateChat, updateMessage } from "./store";
import type { Step } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One generation in flight per chat; a second submit while streaming is ignored.
const running = new Set<string>();

export function isGenerating(chatId: string) {
  return running.has(chatId);
}

/**
 * Phase 1 mock of the generation protocol. The real engine (phase 2) will stream the
 * same shape from the server: step events, file writes for a new version, then prose.
 */
export async function sendPrompt(chatId: string, prompt: string) {
  if (running.has(chatId)) return;
  const chat = getChat(chatId);
  if (!chat) return;
  running.add(chatId);

  try {
    appendMessage(chatId, { id: newId(16), role: "user", content: prompt, createdAt: Date.now() });

    const assistantId = newId(16);
    const startedAt = Date.now();
    appendMessage(chatId, {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: startedAt,
      status: "streaming",
      steps: [],
    });

    const previous = chat.versions.at(-1);
    const firstPrompt = chat.messages.find((m) => m.role === "user")?.content ?? prompt;
    const project = pickMockProject(prompt, previous?.kind, firstPrompt);
    const isFirst = chat.versions.length === 0;
    const versionN = chat.versions.length + 1;

    const pushStep = (step: Step) =>
      updateMessage(chatId, assistantId, (m) => ({ ...m, steps: [...(m.steps ?? []), step] }));
    const finishStep = (id: string, patch: Partial<Step> = {}) =>
      updateMessage(chatId, assistantId, (m) => ({
        ...m,
        steps: (m.steps ?? []).map((s) => (s.id === id ? { ...s, ...patch, done: true } : s)),
      }));

    const thought = newId(8);
    pushStep({ id: thought, kind: "thought", label: "Thinking", done: false });
    await sleep(1100);
    finishStep(thought, { label: "Thought for 1s" });

    const explored = newId(8);
    pushStep({ id: explored, kind: "explored", label: "Exploring codebase", done: false });
    await sleep(700);
    finishStep(explored, {
      label: "Explored codebase",
      files: isFirst ? ["app/layout.tsx", "app/globals.css"] : chat.versions.at(-1)!.files.map((f) => f.path),
    });

    pushStep({
      id: newId(8),
      kind: "note",
      label: isFirst
        ? `Fresh project. I'll create a ${project.title.toLowerCase()}.`
        : `I'll update the ${project.title.toLowerCase()} based on your request.`,
      done: true,
    });
    await sleep(400);

    const versionStep = newId(8);
    pushStep({
      id: versionStep,
      kind: "version",
      label: `${isFirst ? "Created" : "Updated"} ${project.title.toLowerCase()}`,
      versionN,
      files: [],
      done: false,
    });
    for (const file of project.files) {
      await sleep(350);
      updateMessage(chatId, assistantId, (m) => ({
        ...m,
        steps: (m.steps ?? []).map((s) =>
          s.id === versionStep ? { ...s, files: [...(s.files ?? []), file.path] } : s,
        ),
      }));
    }
    updateChat(chatId, (c) => ({
      ...c,
      versions: [
        ...c.versions,
        {
          n: versionN,
          kind: project.kind,
          title: project.title,
          files: project.files,
          previewHtml: project.previewHtml,
          createdAt: Date.now(),
        },
      ],
    }));
    finishStep(versionStep);

    // Stream the summary a few words at a time.
    const words = project.summary.split(/(\s+)/);
    let text = "";
    for (let i = 0; i < words.length; i += 6) {
      text += words.slice(i, i + 6).join("");
      const snapshot = text;
      updateMessage(chatId, assistantId, (m) => ({ ...m, content: snapshot }));
      await sleep(45);
    }

    updateMessage(chatId, assistantId, (m) => ({
      ...m,
      status: "done",
      workedMs: Date.now() - startedAt,
      credits: Math.round((0.08 + Math.random() * 0.2) * 1000) / 1000,
    }));
  } finally {
    running.delete(chatId);
  }
}
