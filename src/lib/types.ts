export type ModelId = "forge-mini" | "forge-pro" | "forge-max" | "forge-max-fast";

export interface ProjectFile {
  path: string;
  language: "tsx" | "ts" | "css" | "json" | "html";
  content: string;
}

export interface Version {
  n: number;
  /** Mock-engine project template; follow-ups keep it unless the prompt asks for something else. */
  kind?: string;
  title: string;
  files: ProjectFile[];
  /** Self-contained HTML rendered in the sandboxed preview iframe. */
  previewHtml: string;
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
  status?: "streaming" | "done";
  steps?: Step[];
  workedMs?: number;
  credits?: number;
}

export interface Chat {
  id: string;
  title: string;
  model: ModelId;
  createdAt: number;
  messages: Message[];
  versions: Version[];
}
