import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { env, githubEnabled } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me-dev-only-secret",
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  socialProviders: githubEnabled
    ? { github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! } }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // On by default (sign-in endpoints get Better Auth's stricter built-in rules).
  // The e2e suite signs in many guests from one IP, so it turns this off.
  rateLimit: { enabled: process.env.DISABLE_AUTH_RATE_LIMIT !== "1", window: 60, max: 30 },
  plugins: [
    anonymous({
      // A guest who signs in with GitHub keeps their chats.
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await db
          .update(schema.chats)
          .set({ userId: newUser.user.id })
          .where(eq(schema.chats.userId, anonymousUser.user.id));
      },
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Current session or null. Reads request headers, so call it behind <Suspense> or in handlers. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
