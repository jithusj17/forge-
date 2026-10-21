"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { ArrowUp, Mic, Paperclip, Square, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { DEFAULT_MODEL } from "@/lib/models";
import type { ModelId } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";
import { ModelPicker } from "./model-picker";
import { PromptEditor } from "./prompt-editor";

export interface ComposerHandle {
  /** Replace the prompt text, focus the editor and play the prefill highlight. */
  prefill: (text: string) => void;
  focus: () => void;
}

export interface ComposerProps {
  onSubmit: (text: string, model: ModelId) => void;
  placeholder?: string;
  busy?: boolean;
  onStop?: () => void;
  initialModel?: ModelId;
  autoFocus?: boolean;
  className?: string;
  minHeight?: number;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { onSubmit, placeholder = "Ask Forge to build…", busy, onStop, initialModel = DEFAULT_MODEL, autoFocus, className, minHeight = 54 },
  ref,
) {
  const [model, setModel] = useState<ModelId>(initialModel);
  const [dragging, setDragging] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [flash, setFlash] = useState(0);
  // The editor's keydown handler is created once; route it to the latest submit().
  const submitRef = useRef<() => void>(() => {});
  // Tiptap reads Math.random() while rendering, which can't run during prerender,
  // so the editor mounts after hydration and hands its instance up.
  const hydrated = useHydrated();
  const [editor, setEditor] = useState<Editor | null>(null);

  const isEmpty = useEditorState({
    editor,
    selector: ({ editor: e }) => !e || e.getText().trim().length === 0,
  });

  function submit() {
    if (!editor || busy) return;
    const text = editor.getText({ blockSeparator: "\n" }).trim();
    if (!text) return;
    onSubmit(text, model);
    editor.commands.clearContent(true);
    setAttachments([]);
  }
  useEffect(() => {
    submitRef.current = submit;
  });

  useImperativeHandle(ref, () => ({
    prefill(text) {
      editor?.chain().setContent(`<p>${text.replace(/[<>&]/g, "")}</p>`).focus("end").run();
      setFlash((n) => n + 1);
    },
    focus() {
      editor?.commands.focus("end");
    },
  }));

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) setAttachments((prev) => [...prev, ...files].slice(0, 5));
  }

  const canSend = !isEmpty && !busy;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onClick={() => editor?.commands.focus()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        "@container/composer relative cursor-text rounded-xl border border-gray-400 bg-bg-300 p-3 shadow-medium",
        "transition-[border-color] duration-200 ease-forge focus-within:border-gray-500",
        className,
      )}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex h-7 items-center gap-1.5 rounded-md border border-alpha-400 bg-gray-100 pl-2 pr-1 text-label-12 text-gray-1000"
            >
              <Paperclip className="size-3.5 text-gray-900" />
              <span className="max-w-40 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                className="rounded p-0.5 text-gray-900 hover:bg-alpha-400 hover:text-gray-1000"
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachments((prev) => prev.filter((_, j) => j !== i));
                }}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {flash > 0 && (
        // Keyed overlay replays the highlight without remounting the editor.
        <span
          key={flash}
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-[forge-prefill_600ms_var(--ease-forge)_forwards] rounded-[inherit]"
        />
      )}
      <div className="forge-editor relative w-full pb-2">
        {hydrated ? (
          <>
            <PromptEditor
              placeholder={placeholder}
              autoFocus={autoFocus}
              minHeight={minHeight}
              onEnter={() => submitRef.current()}
              onReady={setEditor}
            />
            {!editor && (
              <p className="text-label-14 leading-6 text-gray-900" style={{ minHeight }}>
                {placeholder}
              </p>
            )}
          </>
        ) : (
          <p className="text-label-14 leading-6 text-gray-900" style={{ minHeight }}>
            {placeholder}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex flex-1 items-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <ModelPicker value={model} onChange={setModel} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Voice input" className="text-gray-900 hover:text-gray-1000">
            <Mic />
          </Button>
          {busy && onStop ? (
            <Button variant="default" size="icon-sm" aria-label="Stop generating" onClick={onStop}>
              <Square className="size-3! fill-current" />
            </Button>
          ) : (
            <Button type="submit" variant="default" size="icon-sm" aria-label="Send" disabled={!canSend}>
              <ArrowUp />
            </Button>
          )}
        </div>
      </div>

      <div
        aria-hidden={!dragging}
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-[inherit] border border-dashed border-gray-500 bg-gray-100 text-label-14 font-medium text-gray-1000 transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <Paperclip className="size-4" />
        Drop to attach
      </div>
    </form>
  );
});
