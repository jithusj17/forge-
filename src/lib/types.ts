export type ModelId = "forge-mini" | "forge-pro" | "forge-max" | "forge-max-fast";

export type Visibility = "private" | "unlisted" | "public";

export interface ProjectFile {
  path: string;
  language: "tsx" | "ts" | "jsx" | "js" | "css" | "json" | "html" | "md";
  content: string;
}

export type Runtime = "html" | "react";

export interface Version {
  n: number;
  /** Mock-engine project template; follow-ups keep it unless the prompt asks for something else. */
  kind?: string | null;
  title: string;
  /** "html": previewHtml rendered in a sandboxed iframe · "react": files run in Sandpack. */
  runtime: Runtime;
  files: ProjectFile[];
  previewHtml?: string | null;
  createdAt: number;
}

export type StepKind = "thought" | "explored" | "note" | "version";

export interface Step {
  id: string;
  kind: StepKind;
  label: string;
  /** Files read (explored) or written (version). */
  files?: string[];
  versionN?: number;
  done: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status?: "streaming" | "done" | "error" | null;
  steps?: Step[] | null;
  workedMs?: number | null;
  credits?: number | null;
  error?: string | null;
}

/** Chat as sent to the client. */
export interface Chat {
  id: string;
  title: string;
  model: ModelId;
  visibility: Visibility;
  createdAt: number;
  messages: Message[];
  versions: Version[];
  /** True when the viewer owns the chat (false for shared read-only views). */
  isOwner: boolean;
  ownerName?: string | null;
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
}
