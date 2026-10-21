"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { setApiKey, useApiKey } from "@/lib/local-settings";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const saved = useApiKey();
  const [draft, setDraft] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const value = draft ?? saved ?? "";
  const looksValid = !value || value.startsWith("sk-ant-");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setDraft(null);
      }}
      title="Settings"
      description="Use your own Anthropic API key to generate real apps with Claude."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApiKey(value);
          onOpenChange(false);
          setDraft(null);
        }}
      >
        <label htmlFor="api-key" className="text-label-13 font-medium text-gray-1000">
          Anthropic API key
        </label>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-400 bg-bg-300 px-3 focus-within:border-gray-500">
          <KeyRound className="size-4 shrink-0 text-gray-900" />
          <input
            id="api-key"
            type={reveal ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-label-14 text-gray-1000 outline-none placeholder:text-gray-700"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide key" : "Show key"}
            className="text-gray-900 hover:text-gray-1000"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {!looksValid && <p className="text-label-12 text-amber-700">Anthropic keys usually start with “sk-ant-”.</p>}
        <p className="text-label-12 leading-relaxed text-gray-900">
          Stored only in this browser and sent over HTTPS with each generation. It is never saved on our servers. Without a
          key, Forge runs in free demo mode with sample projects.
        </p>
        <div className="mt-2 flex justify-between gap-2">
          <Button
            variant="ghost"
            disabled={!saved}
            onClick={() => {
              setApiKey(null);
              setDraft(null);
            }}
          >
            Remove key
          </Button>
          <Button type="submit" variant="default">
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
