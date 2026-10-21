import type { ModelId } from "./types";

export const MODELS: { id: ModelId; label: string; description: string }[] = [
  { id: "forge-mini", label: "Forge Mini", description: "Fast, for small edits" },
  { id: "forge-pro", label: "Forge Pro", description: "Balanced quality and speed" },
  { id: "forge-max", label: "Forge Max", description: "Best quality" },
  { id: "forge-max-fast", label: "Forge Max Fast", description: "Max quality, lower latency" },
];

export const DEFAULT_MODEL: ModelId = "forge-max";

export function modelLabel(id: ModelId) {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}
