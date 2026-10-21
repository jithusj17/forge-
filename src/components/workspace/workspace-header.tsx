"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Eye,
  Monitor,
  RotateCw,
  Smartphone,
  Star,
  Tablet,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { deleteChat, updateChat } from "@/lib/store";
import type { Chat } from "@/lib/types";
import type { Device, WorkspaceState } from "./workspace";

const DEVICES: { value: Device; icon: typeof Monitor; label: string }[] = [
  { value: "desktop", icon: Monitor, label: "Desktop" },
  { value: "tablet", icon: Tablet, label: "Tablet" },
  { value: "mobile", icon: Smartphone, label: "Mobile" },
];

export function WorkspaceHeader({ chat, state }: { chat: Chat; state: WorkspaceState }) {
  const router = useRouter();
  const version = chat.versions.find((v) => v.n === state.versionN);
  const isLatest = state.versionN === chat.versions.at(-1)?.n;
  const DeviceIcon = DEVICES.find((d) => d.value === state.device)!.icon;

  function cycleDevice() {
    const i = DEVICES.findIndex((d) => d.value === state.device);
    state.setDevice(DEVICES[(i + 1) % DEVICES.length].value);
  }

  function openInNewTab() {
    if (!version) return;
    const url = URL.createObjectURL(new Blob([version.previewHtml], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <header className="@container/chat-header relative z-20 grid h-[50px] w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 hairline-b lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {/* Breadcrumb */}
      <nav className="flex min-w-0 items-center gap-1">
        <Link href="/" className="rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-700" title="New chat">
          <Logo />
        </Link>
        <Link href="/" className="hidden h-7 items-center text-[13px] font-medium text-gray-900 hover:text-gray-1000 hover:underline sm:flex">
          Drafts
        </Link>
        <span aria-hidden className="hidden w-4 select-none text-center text-lg text-alpha-500 sm:block">
          /
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-gray-900">
          <Star className="size-4 shrink-0 text-gray-500" aria-hidden />
          <span className="truncate text-gray-1000" data-testid="chat-title">
            {chat.title}
          </span>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="size-5 rounded-md" aria-label="Chat options">
                <ChevronDown />
              </Button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuItem
                onSelect={() => {
                  const title = window.prompt("Rename chat", chat.title)?.trim();
                  if (title) updateChat(chat.id, (c) => ({ ...c, title }));
                }}
              >
                Rename
              </MenuItem>
              <MenuItem
                className="text-red-900"
                onSelect={() => {
                  if (!window.confirm(`Delete "${chat.title}"? This can't be undone.`)) return;
                  router.push("/");
                  deleteChat(chat.id);
                }}
              >
                <Trash2 className="text-red-900!" />
                Delete chat
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </nav>

      {/* View toggle + address bar */}
      <div className="hidden items-center justify-center gap-2 lg:flex">
        <SegmentedTabs
          value={state.view}
          onChange={state.setView}
          itemClassName="w-7 px-0"
          options={[
            { value: "preview", label: <Eye />, ariaLabel: "Show preview" },
            { value: "code", label: <Code2 />, ariaLabel: "Show code" },
          ]}
        />
        {state.view === "code" && !isLatest ? (
          <p className="w-[300px] truncate text-center text-label-13 text-blue-900">
            Old versions are read-only.{" "}
            <button className="underline" onClick={() => state.setVersionN(chat.versions.at(-1)!.n)}>
              Switch to latest
            </button>
          </p>
        ) : (
          <div className="flex h-7 w-[300px] items-center overflow-hidden rounded-md border border-alpha-400 bg-gray-100">
            <div className="flex items-center pl-1">
              <Button variant="ghost" size="icon-xs" className="text-gray-900" disabled aria-label="Back">
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon-xs" className="text-gray-900" disabled aria-label="Forward">
                <ChevronRight />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-6 rounded-md text-gray-900"
                onClick={cycleDevice}
                aria-label={`Device: ${state.device}`}
                title={`Device: ${state.device}`}
              >
                <DeviceIcon />
              </Button>
            </div>
            <input
              aria-label="Preview path"
              defaultValue="/"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent pl-2 pr-2 text-sm text-gray-1000 outline-none"
            />
            <div className="flex items-center pr-1">
              <Button variant="ghost" size="icon-xs" className="text-gray-900" onClick={openInNewTab} disabled={!version} aria-label="Open in new tab">
                <ExternalLink />
              </Button>
              <Button variant="ghost" size="icon-xs" className="text-gray-900" onClick={state.reload} disabled={!version} aria-label="Reload preview">
                <RotateCw />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <Button variant="secondary" size="sm" className="h-7" disabled title="Sharing arrives with accounts (phase 3)">
          Share
        </Button>
        <Button variant="default" size="sm" className="h-7" disabled title="Publishing arrives in phase 2">
          Publish
        </Button>
      </div>
    </header>
  );
}
