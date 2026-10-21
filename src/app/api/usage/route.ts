import { getSession } from "@/lib/auth";
import { countGenerationsSince } from "@/lib/chats";
import { env } from "@/lib/env";

/** What the composer shows: which engine you'll get and how much quota is left today. */
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ signedIn: false }, { headers: { "cache-control": "no-store" } });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const isGuest = Boolean(session.user.isAnonymous);
  const [used, serverUsed] = await Promise.all([
    countGenerationsSince(session.user.id, dayAgo),
    countGenerationsSince(session.user.id, dayAgo, "server"),
  ]);
  const dailyLimit = isGuest ? Math.min(20, env.DAILY_GENERATION_LIMIT) : env.DAILY_GENERATION_LIMIT;
  const serverKey = Boolean(env.ANTHROPIC_API_KEY) && !isGuest;

  return Response.json(
    {
      signedIn: true,
      isGuest,
      dailyRemaining: Math.max(0, dailyLimit - used),
      serverKeyRemaining: serverKey ? Math.max(0, env.SERVER_KEY_DAILY_LIMIT - serverUsed) : 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
