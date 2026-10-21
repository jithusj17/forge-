"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export function PromptEditor({
  placeholder,
  autoFocus,
  minHeight,
  onEnter,
  onReady,
}: {
  placeholder: string;
  autoFocus?: boolean;
  minHeight: number;
  onEnter: () => void;
  onReady: (editor: Editor | null) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        "aria-multiline": "true",
        role: "textbox",
        spellcheck: "false",
        class: "max-h-[330px] overflow-y-auto text-label-14 leading-6",
        style: `min-height:${minHeight}px`,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          onEnter();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    onReady(editor);
    return () => onReady(null);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}
