import type { ModelId } from "@/lib/types";

type Effort = "low" | "medium" | "high";

export interface ClaudeModelConfig {
  model: "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";
  effort: Effort;
  /** Server-side refusal fallback ("default" routing); not offered for Haiku. */
  fallback: boolean;
  /** USD per million tokens, for the per-turn cost shown in the chat. */
  price: { input: number; output: number };
}

// The picker's tiers map onto real Claude models. Forge Max (the default) is Claude Opus 5.5.
export const CLAUDE_MODELS: Record<ModelId, ClaudeModelConfig> = {
  "forge-max": { model: "claude-opus-5-5", effort: "high", fallback: true, price: { input: 4, output: 20 } },
  "forge-max-fast": { model: "claude-opus-5-5", effort: "low", fallback: true, price: { input: 4, output: 20 } },
  "forge-pro": { model: "claude-sonnet-5-5", effort: "medium", fallback: true, price: { input: 2, output: 10 } },
  "forge-mini": { model: "claude-haiku-5-5", effort: "medium", fallback: false, price: { input: 0.1, output: 0.5 } },
};

export function costUsd(config: ClaudeModelConfig, inputTokens: number, outputTokens: number) {
  return (inputTokens * config.price.input + outputTokens * config.price.output) / 1_000_000;
}
