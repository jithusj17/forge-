"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef } from "react";
import { Composer } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { isGenerating, sendPrompt } from "@/lib/mock-engine";
import { updateChat } from "@/lib/store";
import type { Chat, Message } from "@/lib/types";
import { AssistantTurn } from "./assistant-turn";
import { timeAgo } from "./time";
import type { WorkspaceState } from "./workspace";

export function ChatPanel({ chat, state }: { chat: Chat; state: WorkspaceState }) {
  const scroller = useRef<HTMLDivElement>(null);
  const last = chat.messages.at(-1);
  const busy = last?.role === "assistant" && last.status === "streaming";

  // Follow the stream while the user is near the bottom.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [last?.content, last?.steps?.length]);

  return (
    <div className="flex h-full min-w-0 flex-col bg-bg-200">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <ol className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pb-6 pt-8 text-label-13 leading-relaxed">
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
        <Composer
          placeholder={chat.versions.length ? "Ask for a change…" : "Describe what to build…"}
          busy={busy}
          initialModel={chat.model}
          minHeight={40}
          onSubmit={(text, model) => {
            if (isGenerating(chat.id)) return;
            if (model !== chat.model) updateChat(chat.id, (c) => ({ ...c, model }));
            void sendPrompt(chat.id, text);
          }}
        />
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <li className="group flex flex-col items-end gap-2">
      <div className="max-w-[90%] origin-top-right rounded-[16px] border border-gray-200 bg-gray-200 px-3 py-1.5 text-gray-1000 sm:max-w-[80%]">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <span className="text-label-12 text-gray-900">{timeAgo(message.createdAt)}</span>
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
