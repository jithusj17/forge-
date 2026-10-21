"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { applyToMessage, type GenerationEvent } from "@/lib/engine/events";
import { streamGeneration, takePendingPrompt } from "@/lib/generate-client";
import { useMediaQuery } from "@/lib/use-media-query";
import type { Chat, ChatSummary, ModelId } from "@/lib/types";
import { ChatPanel } from "./chat-panel";
import { HistorySidebar } from "./history-sidebar";
import { OutputPanel } from "./output-panel";
import { WorkspaceHeader } from "./workspace-header";

export type OutputView = "preview" | "code";
export type Device = "desktop" | "tablet" | "mobile";

export interface WorkspaceState {
  view: OutputView;
  setView: (v: OutputView) => void;
  versionN: number | null;
  setVersionN: (n: number) => void;
  selectedFile: string | null;
  openFile: (path: string, versionN?: number) => void;
  device: Device;
  setDevice: (d: Device) => void;
  reloadKey: number;
  reload: () => void;
  generating: boolean;
  send: (prompt: string, model: ModelId) => void;
  stop: () => void;
  error: string | null;
  dismissError: () => void;
  setChat: (update: (chat: Chat) => Chat) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

function applyEvent(chat: Chat, event: GenerationEvent, assistantId: string | null): Chat {
  switch (event.type) {
    case "user":
    case "assistant":
      return { ...chat, messages: [...chat.messages, event.message] };
    case "version":
      return { ...chat, versions: [...chat.versions, event.version] };
    case "step":
    case "step-update":
    case "text":
    case "done":
      return {
        ...chat,
        messages: chat.messages.map((m) => (m.id === assistantId ? applyToMessage(m, event) : m)),
      };
    default:
      return chat;
  }
}

export function Workspace({
  initialChat,
  history,
  signedIn,
}: {
  initialChat: Chat;
  history: ChatSummary[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [chat, setChatState] = useState(initialChat);
  const wide = useMediaQuery("(min-width: 1280px)");

  const [view, setView] = useState<OutputView>("preview");
  const [picked, setPicked] = useState<{ n: number; latest: number | null } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"chat" | "output">("chat");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const latest = chat.versions.at(-1)?.n ?? null;
  // A picked version sticks only until a newer version is generated.
  const versionN = picked && picked.latest === latest ? picked.n : latest;
  const setPickedVersion = (n: number | null) => setPicked(n === null || n === latest ? null : { n, latest });

  const send = useCallback(
    async (prompt: string, model: ModelId) => {
      if (abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setGenerating(true);
      setError(null);
      let assistantId: string | null = null;
      await streamGeneration(
        chat.id,
        { prompt, model },
        (event) => {
          if (event.type === "assistant") assistantId = event.message.id;
          if (event.type === "error") setError(event.error);
          if (event.type === "version") setView("preview");
          setChatState((c) => applyEvent(c, event, assistantId));
        },
        controller.signal,
      );
      abortRef.current = null;
      setGenerating(false);
      router.refresh(); // reorder the history sidebar
    },
    [chat.id, router],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // Prompt submitted on the landing page: start it once the workspace mounts.
  const startedPending = useRef(false);
  useEffect(() => {
    if (startedPending.current || !initialChat.isOwner) return;
    startedPending.current = true;
    const pending = takePendingPrompt(initialChat.id);
    if (pending) queueMicrotask(() => void send(pending.prompt, pending.model));
  }, [initialChat.id, initialChat.isOwner, send]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const state: WorkspaceState = {
    view,
    setView,
    versionN,
    setVersionN: (n) => setPickedVersion(n),
    selectedFile,
    openFile: (path, n) => {
      if (n !== undefined) setPickedVersion(n);
      setSelectedFile(path);
      setView("code");
      setMobileTab("output");
    },
    device,
    setDevice,
    reloadKey,
    reload: () => setReloadKey((k) => k + 1),
    generating,
    send: (p, m) => void send(p, m),
    stop,
    error,
    dismissError: () => setError(null),
    setChat: (update) => setChatState(update),
    sidebarOpen,
    toggleSidebar: () => setSidebarOpen((o) => !o),
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-200">
      <WorkspaceHeader chat={chat} state={state} signedIn={signedIn} />

      <div className="relative flex min-h-0 flex-1">
        {signedIn && (
          <HistorySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} chats={history} activeId={chat.id} />
        )}

        {/* Only one layout is mounted, so there's a single composer and a single preview. */}
        {!wide ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <SegmentedTabs
              className="m-2 shrink-0"
              value={mobileTab}
              onChange={setMobileTab}
              options={[
                { value: "chat", label: "Chat" },
                { value: "output", label: view === "code" ? "Code" : "Preview" },
              ]}
            />
            <div className="relative min-h-0 flex-1">
              {mobileTab === "chat" ? <ChatPanel chat={chat} state={state} /> : <OutputPanel chat={chat} state={state} />}
            </div>
          </div>
        ) : (
          <Group className="h-full min-w-0 flex-1">
            <Panel defaultSize={360} minSize={280} maxSize="50%">
              <ChatPanel chat={chat} state={state} />
            </Panel>
            <Separator className="group relative w-px bg-transparent outline-none">
              <span className="absolute inset-y-0 -left-px w-px bg-gray-500 opacity-0 transition-opacity duration-300 ease-forge group-hover:opacity-100 group-focus-visible:bg-blue-700 group-focus-visible:opacity-100" />
            </Separator>
            <Panel minSize="30%">
              <OutputPanel chat={chat} state={state} />
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
}
