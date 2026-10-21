import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatNotFound } from "@/components/workspace/chat-not-found";
import { Workspace } from "@/components/workspace/workspace";
import { getSession } from "@/lib/auth";
import { getChatForViewer, listChats } from "@/lib/chats";

// Chats are user content: shared links work, but search engines shouldn't index them.
export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };

// The session and params are request data, so they're read inside <Suspense>
// (Cache Components; see node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg-200" />}>
      <ChatLoader params={params} />
    </Suspense>
  );
}

async function ChatLoader({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  const viewerId = session?.user.id ?? null;
  const [chat, history] = await Promise.all([
    getChatForViewer(id, viewerId),
    viewerId ? listChats(viewerId) : Promise.resolve([]),
  ]);
  if (!chat) return <ChatNotFound signedIn={Boolean(session)} />;
  return <Workspace key={chat.id} initialChat={chat} history={history} signedIn={Boolean(session)} />;
}
