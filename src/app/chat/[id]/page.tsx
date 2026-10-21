import { Suspense } from "react";
import { Workspace } from "@/components/workspace/workspace";

// Params are awaited inside <Suspense> so the route can still prerender a static shell
// (required with cacheComponents; see node_modules/next/dist/docs migrating-to-cache-components).
export default function ChatPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg-200" />}>
      <Workspace params={params} />
    </Suspense>
  );
}
