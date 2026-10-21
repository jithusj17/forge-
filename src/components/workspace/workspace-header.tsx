"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Link2,
  Lock,
  Monitor,
  PanelLeft,
  Pencil,
  RotateCw,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChatAction, duplicateChatAction, renameChatAction, setVisibilityAction } from "@/app/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { downloadVersionZip } from "@/lib/export-zip";
import type { Chat, Visibility } from "@/lib/types";
import type { Device, WorkspaceState } from "./workspace";

const DEVICES: { value: Device; icon: typeof Monitor }[] = [
  { value: "desktop", icon: Monitor },
  { value: "tablet", icon: Tablet },
  { value: "mobile", icon: Smartphone },
];

const VISIBILITY: { value: Visibility; label: string; hint: string; icon: typeof Lock }[] = [
  { value: "private", label: "Private", hint: "Only you can open it", icon: Lock },
  { value: "unlisted", label: "Unlisted", hint: "Anyone with the link can view", icon: Link2 },
  { value: "public", label: "Public", hint: "Anyone can view and duplicate", icon: Globe },
];

export function WorkspaceHeader({ chat, state, signedIn }: { chat: Chat; state: WorkspaceState; signedIn: boolean }) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [busy, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const version = chat.versions.find((v) => v.n === state.versionN);
  const isLatest = state.versionN === chat.versions.at(-1)?.n;
  const DeviceIcon = DEVICES.find((d) => d.value === state.device)!.icon;
  const vis = VISIBILITY.find((v) => v.value === chat.visibility)!;

  function cycleDevice() {
    const i = DEVICES.findIndex((d) => d.value === state.device);
    state.setDevice(DEVICES[(i + 1) % DEVICES.length].value);
  }

  function openInNewTab() {
    if (!version?.previewHtml) return;
    const url = URL.createObjectURL(new Blob([version.previewHtml], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function setVisibility(next: Visibility) {
    state.setChat((c) => ({ ...c, visibility: next }));
    startTransition(async () => {
      await setVisibilityAction(chat.id, next);
    });
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(`${window.location.origin}/chat/${chat.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function duplicate() {
    if (!(await requireAuth("Sign in to duplicate this chat into your account."))) return;
    startTransition(async () => {
      const id = await duplicateChatAction(chat.id);
      if (id) router.push(`/chat/${id}`);
    });
  }

  return (
    <header className="@container/chat-header relative z-20 grid h-[50px] w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 hairline-b lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {/* Breadcrumb */}
      <nav className="flex min-w-0 items-center gap-1">
        {signedIn && (
          <Button variant="ghost" size="icon-sm" aria-label="Chat history" onClick={state.toggleSidebar}>
            <PanelLeft />
          </Button>
        )}
        <Link href="/" className="rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-700" title="New chat">
          <Logo />
        </Link>
        <span aria-hidden className="hidden w-4 select-none text-center text-lg text-alpha-500 sm:block">
          /
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium">
          <span className="truncate text-gray-1000" data-testid="chat-title">
            {chat.title}
          </span>
          {!chat.isOwner && chat.ownerName && <span className="hidden truncate text-gray-900 sm:inline">by {chat.ownerName}</span>}
          {chat.isOwner && (
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
                    if (!title) return;
                    state.setChat((c) => ({ ...c, title }));
                    startTransition(async () => {
                      await renameChatAction(chat.id, title);
                      router.refresh();
                    });
                  }}
                >
                  <Pencil />
                  Rename
                </MenuItem>
                <MenuItem onSelect={duplicate}>
                  <Copy />
                  Duplicate
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  className="text-red-900"
                  onSelect={() => {
                    if (!window.confirm(`Delete "${chat.title}"? This can't be undone.`)) return;
                    startTransition(async () => {
                      await deleteChatAction(chat.id);
                      router.push("/");
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="text-red-900!" />
                  Delete chat
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
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
        {version && !isLatest ? (
          <p className="w-[300px] truncate text-center text-label-13 text-blue-900">
            Viewing v{state.versionN}.{" "}
            <button className="underline" onClick={() => state.setVersionN(chat.versions.at(-1)!.n)}>
              Back to latest
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
            <span className="min-w-0 flex-1 truncate pl-2 text-sm text-gray-1000">
              {version ? `/  ·  v${version.n}` : "/"}
            </span>
            <div className="flex items-center pr-1">
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-gray-900"
                onClick={openInNewTab}
                disabled={!version?.previewHtml}
                aria-label="Open in new tab"
                title={version?.runtime === "react" ? "Download the project to run it outside Forge" : undefined}
              >
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
        {version && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Download project as ZIP"
            title="Download project"
            onClick={() => void downloadVersionZip(chat.title, version)}
          >
            <Download />
          </Button>
        )}
        {chat.isOwner ? (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-7" disabled={busy}>
                <vis.icon />
                Share
              </Button>
            </MenuTrigger>
            <MenuContent align="end" className="w-72">
              <p className="px-2.5 pb-1 pt-1.5 text-label-12 font-medium text-gray-900">Who can view this chat</p>
              {VISIBILITY.map((v) => (
                <MenuItem key={v.value} onSelect={() => setVisibility(v.value)} className="h-auto py-2">
                  <v.icon />
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{v.label}</span>
                    <span className="text-label-12 text-gray-900">{v.hint}</span>
                  </span>
                  {chat.visibility === v.value && <Check className="text-gray-1000!" />}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem
                disabled={chat.visibility === "private"}
                onSelect={(e) => {
                  e.preventDefault();
                  void copyLink();
                }}
              >
                {copied ? <Check /> : <Link2 />}
                {copied ? "Link copied" : "Copy link"}
              </MenuItem>
            </MenuContent>
          </Menu>
        ) : (
          <Button variant="default" size="sm" className="h-7" onClick={duplicate} disabled={busy}>
            <Copy />
            Duplicate
          </Button>
        )}
        <UserMenu compact />
      </div>
    </header>
  );
}
