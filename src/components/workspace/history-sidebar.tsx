"use client";

import { MessageSquare, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ChatSummary } from "@/lib/types";
import { timeAgo } from "./time";

function groupLabel(ts: number, now: number) {
  const days = (now - ts) / 86_400_000;
  if (days < 1) return "Today";
  if (days < 7) return "Previous 7 days";
  return "Older";
}

export function HistorySidebar({
  open,
  onClose,
  chats,
  activeId,
}: {
  open: boolean;
  onClose: () => void;
  chats: ChatSummary[];
  activeId: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Captured once per mount so render stays pure.
  const [now] = useState(() => Date.now());
  const groups: { label: string; items: ChatSummary[] }[] = [];
  for (const c of chats) {
    const label = groupLabel(c.updatedAt, now);
    const g = groups.at(-1);
    if (g?.label === label) g.items.push(c);
    else groups.push({ label, items: [c] });
  }

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-30 bg-black/30 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Chat history"
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "absolute inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-alpha-400 bg-bg-100 shadow-modal transition-transform duration-200 ease-forge",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <Button variant="secondary" size="sm" className="flex-1 justify-start" asChild>
            <Link href="/" onClick={onClose}>
              <Plus />
              New chat
            </Link>
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Close history" onClick={onClose}>
            <X />
          </Button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {chats.length === 0 && <p className="px-2 py-4 text-label-13 text-gray-900">No chats yet.</p>}
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <h3 className="px-2 pb-1 pt-2 text-label-12 font-medium text-gray-900">{g.label}</h3>
              <ul>
                {g.items.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/chat/${c.id}`}
                      onClick={onClose}
                      aria-current={c.id === activeId ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-label-13 hover:bg-alpha-200",
                        c.id === activeId ? "bg-alpha-300 text-gray-1000" : "text-gray-900",
                      )}
                    >
                      <MessageSquare className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span className="shrink-0 text-label-12 text-gray-700">{timeAgo(c.updatedAt, now)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
