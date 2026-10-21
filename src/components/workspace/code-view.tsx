"use client";

import { Check, ChevronDown, Copy, Folder } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ProjectFile, Version } from "@/lib/types";
import { FileIcon } from "./assistant-turn";
import type { WorkspaceState } from "./workspace";

type TreeNode = { name: string; path: string; children?: TreeNode[] };

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let level = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = i === parts.length - 1 ? { name: part, path } : { name: part, path, children: [] };
        level.push(node);
      }
      level = node.children ?? [];
    });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => Number(!!b.children) - Number(!!a.children) || a.name.localeCompare(b.name))
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n));
  return sort(root);
}

export function CodeView({ version, state }: { version: Version; state: WorkspaceState }) {
  const tree = useMemo(() => buildTree(version.files), [version.files]);
  const file = version.files.find((f) => f.path === state.selectedFile) ?? version.files[0];

  return (
    <div className="flex h-full min-h-0">
      <nav aria-label="Files" className="hidden w-56 shrink-0 overflow-y-auto border-r border-alpha-400 bg-bg-200 py-2 text-label-13 md:block">
        <Tree nodes={tree} depth={0} active={file.path} onOpen={(p) => state.openFile(p)} />
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-alpha-400 px-3">
          <span className="flex min-w-0 items-center gap-2 text-label-13 text-gray-900">
            <FileIcon path={file.path} />
            <span className="truncate">{file.path}</span>
          </span>
          <CopyButton text={file.content} />
        </div>
        <HighlightedCode file={file} />
      </div>
    </div>
  );
}

function Tree({ nodes, depth, active, onOpen }: { nodes: TreeNode[]; depth: number; active: string; onOpen: (path: string) => void }) {
  return (
    <ul>
      {nodes.map((node) =>
        node.children ? (
          <li key={node.path}>
            <div className="flex h-7 items-center gap-1.5 text-gray-900" style={{ paddingLeft: 12 + depth * 12 }}>
              <ChevronDown className="size-3.5" />
              <Folder className="size-3.5" />
              {node.name}
            </div>
            <Tree nodes={node.children} depth={depth + 1} active={active} onOpen={onOpen} />
          </li>
        ) : (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onOpen(node.path)}
              className={cn(
                "flex h-7 w-full items-center gap-1.5 pr-2 text-left hover:bg-alpha-200",
                node.path === active ? "bg-alpha-300 text-gray-1000" : "text-gray-900",
              )}
              style={{ paddingLeft: 12 + depth * 12 + 20 }}
            >
              <FileIcon path={node.path} />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function HighlightedCode({ file }: { file: ProjectFile }) {
  const [html, setHtml] = useState<{ path: string; content: string; html: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Shiki is loaded lazily so it stays out of the landing-page bundle.
    import("shiki/bundle/web").then(({ codeToHtml }) =>
      codeToHtml(file.content, {
        lang: file.language === "md" ? "markdown" : file.language,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: "light",
      }).then((out) => {
        if (!cancelled) setHtml({ path: file.path, content: file.content, html: out });
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [file.content, file.language, file.path]);

  const ready = html && html.path === file.path && html.content === file.content;

  return (
    <div className="forge-code min-h-0 flex-1 overflow-auto text-label-13-mono">
      {ready ? (
        <div dangerouslySetInnerHTML={{ __html: html.html }} />
      ) : (
        <pre className="px-4 py-3 text-gray-900">{file.content}</pre>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="size-6 rounded-md text-gray-900"
      aria-label="Copy file"
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
