import "server-only";
import { z } from "zod";

// Validated server environment. Everything optional has a safe local default so
// `npm run dev` works with zero configuration.
const schema = z.object({
  DATABASE_URL: z.string().default("file:./data/forge.db"),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  /** Optional server-side key. Without it, visitors bring their own key or use demo mode. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Generations per user per day that may use the server key (cost guard). */
  SERVER_KEY_DAILY_LIMIT: z.coerce.number().int().min(0).default(5),
  /** Generations per user per day in total (abuse guard). */
  DAILY_GENERATION_LIMIT: z.coerce.number().int().min(1).default(50),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = parsed.data;

export const githubEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
