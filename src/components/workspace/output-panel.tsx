"use client";

import { Code2, LoaderCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import type { Chat, Version } from "@/lib/types";
import { CodeView } from "./code-view";
import type { Device, WorkspaceState } from "./workspace";

const DEVICE_FRAME: Record<Device, string> = {
  desktop: "h-full w-full",
  tablet: "my-6 h-[calc(100%-48px)] w-[820px] max-w-[calc(100%-48px)] rounded-xl border border-alpha-400 shadow-modal",
  mobile: "my-6 h-[calc(100%-48px)] max-h-[844px] w-[390px] max-w-[calc(100%-48px)] rounded-[28px] border border-alpha-400 shadow-modal",
};

export function OutputPanel({ chat, state }: { chat: Chat; state: WorkspaceState }) {
  const version = chat.versions.find((v) => v.n === state.versionN);
  const generating = chat.messages.at(-1)?.status === "streaming";

  return (
    <div className="relative flex h-full min-w-0 flex-col border-t border-alpha-400 bg-bg-100 xl:border-l xl:border-t-0">
      {!version ? (
        <EmptyOutput generating={generating} />
      ) : state.view === "code" ? (
        <CodeView version={version} state={state} />
      ) : (
        <PreviewFrame version={version} device={state.device} reloadKey={state.reloadKey} />
      )}
    </div>
  );
}

function PreviewFrame({ version, device, reloadKey }: { version: Version; device: Device; reloadKey: number }) {
  return (
    <div className="flex h-full w-full justify-center overflow-auto bg-gray-100/40">
      <div className={cn("overflow-hidden bg-white transition-[width,height,border-radius] duration-200 ease-forge", DEVICE_FRAME[device])}>
        {version.runtime === "react" ? (
          <SandpackPreviewFrame version={version} reloadKey={reloadKey} />
        ) : (
          // Demo projects: srcDoc + sandbox without allow-same-origin gives the frame an
          // opaque origin (no access to Forge's cookies, storage or DOM).
          <iframe
            key={`${version.n}-${reloadKey}`}
            title={`Preview v${version.n}`}
            srcDoc={version.previewHtml ?? ""}
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            className="h-full w-full select-none border-0"
          />
        )}
      </div>
    </div>
  );
}

const SandpackPreviewFrame = dynamic(() => import("./sandpack-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 bg-bg-100 text-label-13 text-gray-900">
      <LoaderCircle className="size-4 animate-spin" /> Starting preview…
    </div>
  ),
});

function EmptyOutput({ generating }: { generating: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-alpha-400 bg-bg-200">
        {generating ? <LoaderCircle className="size-4 animate-spin text-gray-900" /> : <Code2 className="size-4 text-gray-900" />}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-label-16 font-medium text-gray-1000">{generating ? "Building your app…" : "Nothing to preview yet"}</span>
        <span className="max-w-sm text-balance text-label-14 text-gray-900">
          {generating ? "The preview appears as soon as the first version is ready." : "Describe what you want in the chat to generate the first version."}
        </span>
      </div>
    </div>
  );
}
