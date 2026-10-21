"use client";

import { AlertCircle, Copy, KeyRound, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { duplicateChatAction } from "@/app/actions";
import { useAuth } from "@/components/auth/auth-provider";
import { SettingsDialog } from "@/components/auth/settings-dialog";
import { Composer } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { useApiKey } from "@/lib/local-settings";
import type { Chat, Message } from "@/lib/types";
import { AssistantTurn } from "./assistant-turn";
import { timeAgo } from "./time";
import type { WorkspaceState } from "./workspace";

export function ChatPanel({ chat, state }: { chat: Chat; state: WorkspaceState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const last = chat.messages.at(-1);

  // Follow the stream while the user is near the bottom.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [last?.content, last?.steps?.length, chat.messages.length]);

  return (
    <div className="flex h-full min-w-0 flex-col bg-bg-200">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <ol className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-6 pt-8 text-label-13 leading-relaxed">
          {chat.messages.length === 0 && (
            <li className="py-10 text-center text-gray-900">Describe what you want to build to get started.</li>
          )}
          {chat.messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} message={m} />
            ) : (
              <AssistantTurn key={m.id} message={m} chat={chat} state={state} />
            ),
          )}
        </ol>
      </div>

      <div className="mx-auto w-full max-w-3xl px-2 pb-2">
        {state.error && (
          <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-red-700/40 bg-red-700/10 px-3 py-2 text-label-13 text-red-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{state.error}</span>
            <button aria-label="Dismiss" onClick={state.dismissError} className="text-red-900/80 hover:text-red-900">
              <X className="size-4" />
            </button>
          </div>
        )}
        {chat.isOwner ? <OwnerComposer chat={chat} state={state} /> : <ReadOnlyNotice chat={chat} />}
      </div>
    </div>
  );
}

interface Usage {
  dailyRemaining: number;
  serverKeyRemaining: number;
  isGuest: boolean;
}

function engineLabel(apiKey: string | null, usage: Usage | null) {
  if (apiKey) return "Claude (your key)";
  if (!usage) return "…";
  if (usage.serverKeyRemaining > 0) return `Claude (${usage.serverKeyRemaining} free)`;
  return "Demo mode";
}

function OwnerComposer({ chat, state }: { chat: Chat; state: WorkspaceState }) {
  const apiKey = useApiKey();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);

  // Refresh quota after each generation finishes.
  useEffect(() => {
    if (state.generating) return;
    let cancelled = false;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((u: Usage & { signedIn: boolean }) => !cancelled && u.signedIn && setUsage(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.generating]);
  return (
    <>
      <Composer
        placeholder={chat.versions.length ? "Ask for a change…" : "Describe what to build…"}
        busy={state.generating}
        onStop={state.stop}
        initialModel={chat.model}
        minHeight={40}
        onSubmit={(text, model) => state.send(text, model)}
      />
      <div className="flex items-center justify-between gap-3 whitespace-nowrap px-1 pt-1.5 text-label-12 text-gray-900">
        <span
          className="flex min-w-0 items-center gap-1.5"
          data-testid="engine-label"
          title={apiKey || usage?.serverKeyRemaining ? "Generations use Claude" : "No API key: generations use sample projects"}
        >
          <Sparkles className="size-3 shrink-0" />
          <span className="truncate">
            {engineLabel(apiKey, usage)}
            {usage && <span className="text-gray-700"> · {usage.dailyRemaining} left</span>}
          </span>
        </span>
        <button onClick={() => setSettingsOpen(true)} className="flex shrink-0 items-center gap-1 hover:text-gray-1000">
          <KeyRound className="size-3" />
          {apiKey ? "Change key" : "Use your key"}
        </button>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function ReadOnlyNotice({ chat }: { chat: Chat }) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [pending, startTransition] = useTransition();
  return (
    <div className="material-medium flex flex-col justify-between gap-3 rounded-[12px] border-blue-400 bg-blue-100 py-2 pl-3 pr-2 text-blue-900 sm:flex-row sm:items-center">
      <span className="text-label-13 leading-[1.4]">
        You&apos;re viewing a shared chat{chat.ownerName ? ` by ${chat.ownerName}` : ""}. Duplicate it to keep building.
      </span>
      <Button
        variant="default"
        size="sm"
        disabled={pending}
        onClick={async () => {
          if (!(await requireAuth("Sign in to duplicate this chat into your account."))) return;
          startTransition(async () => {
            const id = await duplicateChatAction(chat.id);
            if (id) router.push(`/chat/${id}`);
          });
        }}
      >
        <Copy />
        Duplicate
      </Button>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  const [now] = useState(() => Date.now());
  return (
    <li className="group flex flex-col items-end gap-2">
      <div className="max-w-[90%] origin-top-right rounded-[16px] border border-gray-200 bg-gray-200 px-3 py-1.5 text-gray-1000 sm:max-w-[80%]">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <span className="text-label-12 text-gray-900">{timeAgo(message.createdAt, now)}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-6 rounded-md text-gray-900"
          aria-label="Copy message"
          onClick={() => navigator.clipboard?.writeText(message.content)}
        >
          <Copy />
        </Button>
      </div>
    </li>
  );
}
