"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useChat } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { useMediaQuery } from "@/lib/use-media-query";
import { ChatPanel } from "./chat-panel";
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
}

export function Workspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hydrated = useHydrated();
  const chat = useChat(id);
  const wide = useMediaQuery("(min-width: 1280px)");

  const [view, setView] = useState<OutputView>("preview");
  // A picked version is remembered together with the latest version at pick time, so a
  // newly generated version automatically takes over again.
  const [picked, setPicked] = useState<{ n: number; latest: number | null } | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"chat" | "output">("chat");

  const latest = chat?.versions.at(-1)?.n ?? null;
  const versionN = picked && picked.latest === latest ? picked.n : latest;
  const setPickedVersion = (n: number | null) => setPicked(n === null ? null : { n, latest });

  if (!hydrated) return <div className="h-dvh bg-bg-200" />;
  if (!chat) return <ChatNotFound />;

  const state: WorkspaceState = {
    view,
    setView,
    versionN,
    setVersionN: (n) => setPickedVersion(n === latest ? null : n),
    selectedFile,
    openFile: (path, n) => {
      if (n !== undefined) setPickedVersion(n === latest ? null : n);
      setSelectedFile(path);
      setView("code");
      setMobileTab("output");
    },
    device,
    setDevice,
    reloadKey,
    reload: () => setReloadKey((k) => k + 1),
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg-200">
      <WorkspaceHeader chat={chat} state={state} />

      {/* Only one layout is mounted, so there's a single composer and a single preview iframe. */}
      {!wide ? (
        // Below xl: one panel at a time.
        <div className="flex min-h-0 flex-1 flex-col">
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
        // xl and up: resizable split, chat 320px by default (280px–50%).
        <div className="flex min-h-0 flex-1">
          <Group className="h-full w-full">
            <Panel defaultSize={320} minSize={280} maxSize="50%">
              <ChatPanel chat={chat} state={state} />
            </Panel>
            <Separator className="group relative w-px bg-transparent outline-none">
              <span className="absolute inset-y-0 -left-px w-px bg-gray-500 opacity-0 transition-opacity duration-300 ease-forge group-hover:opacity-100 group-focus-visible:bg-blue-700 group-focus-visible:opacity-100 group-data-[separator=active]:opacity-100" />
            </Separator>
            <Panel minSize="30%">
              <OutputPanel chat={chat} state={state} />
            </Panel>
          </Group>
        </div>
      )}
    </div>
  );
}

function ChatNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg-200 px-6 text-center">
      <div className="mb-4 flex h-28 w-40 flex-col gap-2 rounded-xl border border-alpha-400 bg-bg-100 p-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-gray-500" />
          ))}
        </div>
        <span className="h-3 w-3/4 rounded-full border border-alpha-500" />
        <span className="h-3 w-1/2 rounded-full border border-alpha-500" />
        <span className="ml-auto h-3 w-2/5 rounded-full border border-alpha-500" />
      </div>
      <h1 className="text-label-16 font-medium text-gray-1000">Chat not found</h1>
      <p className="text-label-14 text-gray-900">This chat was deleted or only exists in another browser.</p>
      <Link href="/" className="mt-4 text-label-14 font-medium text-blue-900 hover:underline">
        Start a new chat
      </Link>
    </div>
  );
}
