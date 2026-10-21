"use client";

import {
  AlertCircle,
  Braces,
  History,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileCode2,
  FileType,
  Globe,
  Hexagon,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  RotateCw,
  Search,
} from "lucide-react";
import { useState, useTransition } from "react";
import { restoreVersionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import type { Chat, Message, Step } from "@/lib/types";
import { formatDuration, timeAgo } from "./time";
import type { WorkspaceState } from "./workspace";

export function AssistantTurn({ message, chat, state }: { message: Message; chat: Chat; state: WorkspaceState }) {
  const streaming = message.status === "streaming";
  const [now] = useState(() => Date.now());
  // Open while working; collapsed afterwards unless the user expands it.
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = open ?? streaming;
  const steps = message.steps ?? [];

  return (
    <li className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-alpha-400 pb-2">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setOpen(!expanded)}
          className="group/trigger flex min-w-0 items-center gap-1.5 text-gray-900 hover:text-gray-1000"
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {streaming && <LoaderCircle className="size-3.5 animate-spin" />}
          <span className="truncate">
            {streaming ? "Working…" : `Worked for ${formatDuration(message.workedMs ?? 0)}`}
          </span>
        </button>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="size-6 rounded-md text-gray-900" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuItem disabled>
              <RotateCw />
              Retry
            </MenuItem>
            <MenuItem onSelect={() => navigator.clipboard?.writeText(message.content)}>
              <Copy />
              Copy
            </MenuItem>
            <MenuItem onSelect={() => navigator.clipboard?.writeText(`${location.origin}/chat/${chat.id}`)}>
              <Link2 />
              Copy Link
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} chat={chat} state={state} />
          ))}
          {!streaming && (
            <div className="flex items-center justify-between pt-1 text-gray-900">
              <span className="flex items-center gap-1.5">
                <Hexagon className="size-3.5" />
                used <span className="text-gray-1000">{message.credits?.toFixed(3)}</span> credits
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {timeAgo(message.createdAt, now)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* When collapsed, keep the latest version card visible: it's the main artifact of the turn. */}
      {!expanded &&
        steps
          .filter((s) => s.kind === "version")
          .map((s) => <VersionCard key={s.id} step={s} chat={chat} state={state} />)}

      {message.content && <p className="whitespace-pre-wrap text-gray-1000">{renderInlineCode(message.content)}</p>}
      {message.error && (
        <p className={cn("flex items-center gap-1.5", message.status === "error" ? "text-red-900" : "text-gray-900")}>
          {message.status === "error" && <AlertCircle className="size-3.5" />}
          {message.error}
        </p>
      )}
    </li>
  );
}

function StepRow({ step, chat, state }: { step: Step; chat: Chat; state: WorkspaceState }) {
  if (step.kind === "note") return <p className="text-gray-1000">{step.label}</p>;
  if (step.kind === "version") return <VersionCard step={step} chat={chat} state={state} />;

  const Icon = step.kind === "thought" ? Brain : Search;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-gray-900">
        {step.done ? <Icon className="size-3.5" /> : <LoaderCircle className="size-3.5 animate-spin" />}
        <span className={cn(!step.done && "animate-pulse")}>{step.label}</span>
      </div>
      {step.files && step.files.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-5.5 text-gray-900">
          Reading files
          {step.files.map((f) => (
            <span key={f} className="inline-flex h-6 items-center gap-1 rounded-md border border-alpha-400 bg-gray-100 px-1.5 text-gray-1000">
              <FileIcon path={f} />
              {f.split("/").at(-1)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionCard({ step, chat, state }: { step: Step; chat: Chat; state: WorkspaceState }) {
  const [open, setOpen] = useState(false);
  const [restoring, startRestore] = useTransition();
  const selected = state.versionN === step.versionN;
  const exists = chat.versions.some((v) => v.n === step.versionN);
  const latest = chat.versions.at(-1)?.n;
  const canRestore = chat.isOwner && exists && step.done && step.versionN !== latest && !state.generating;

  return (
    <div className={cn("rounded-lg border bg-bg-100 transition-colors", selected ? "border-gray-500" : "border-alpha-400")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" aria-label={open ? "Hide files" : "Show files"} onClick={() => setOpen(!open)} className="text-gray-900 hover:text-gray-1000">
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>
        <button
          type="button"
          disabled={!exists}
          onClick={() => {
            if (step.versionN) state.setVersionN(step.versionN);
            state.setView("preview");
          }}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
        >
          {step.done ? <Globe className="size-4 shrink-0 text-gray-900" /> : <LoaderCircle className="size-4 shrink-0 animate-spin text-gray-900" />}
          <span className="truncate font-medium text-gray-1000">{step.label}</span>
          <span className="text-gray-900">v{step.versionN}</span>
        </button>
        {canRestore && (
          <Button
            variant="ghost"
            size="xs"
            className="h-6 text-gray-900"
            disabled={restoring}
            title={`Make v${step.versionN} the latest version`}
            onClick={() =>
              startRestore(async () => {
                const result = await restoreVersionAction(chat.id, step.versionN!);
                if (result)
                  state.setChat((c) => ({
                    ...c,
                    messages: [...c.messages, result.message],
                    versions: [...c.versions, result.version],
                  }));
              })
            }
          >
            <History />
            Restore
          </Button>
        )}
      </div>
      {(open || !step.done) && step.files && step.files.length > 0 && (
        <ul className="flex flex-col px-1.5 pb-1.5">
          {step.files.map((path) => (
            <li key={path}>
              <button
                type="button"
                disabled={!exists}
                onClick={() => state.openFile(path, step.versionN)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-alpha-200",
                  selected && state.view === "code" && state.selectedFile === path && "bg-alpha-200",
                )}
              >
                <FileIcon path={path} />
                <span className="shrink-0 text-gray-1000">{path.split("/").at(-1)}</span>
                <span className="min-w-0 truncate text-gray-900">{path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FileIcon({ path, className }: { path: string; className?: string }) {
  const ext = path.split(".").at(-1);
  const Icon = ext === "json" ? Braces : ext === "css" ? FileType : FileCode2;
  return <Icon className={cn("size-3.5 shrink-0 text-gray-900", className)} />;
}

// Render `code` spans in assistant prose.
function renderInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded-[0.375rem] border border-alpha-400 bg-gray-100 px-1 py-[0.15rem] text-label-13-mono">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
