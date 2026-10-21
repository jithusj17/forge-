"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function ChatNotFound({ signedIn }: { signedIn: boolean }) {
  const { openSignIn } = useAuth();
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg-200 px-6 text-center">
      <div className="mb-4 flex h-28 w-40 flex-col gap-2 rounded-xl border border-alpha-400 bg-bg-100 p-3" aria-hidden>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-gray-500" />
          ))}
        </div>
        <span className="h-3 w-3/4 rounded-full border border-alpha-500" />
        <span className="h-3 w-1/2 rounded-full border border-alpha-500" />
        <span className="ml-auto h-3 w-2/5 rounded-full border border-alpha-500" />
      </div>
      <h1 className="text-label-16 font-medium text-gray-1000">Chat not found</h1>
      <p className="max-w-sm text-label-14 text-gray-900">
        This chat was deleted, is private, or belongs to another account.
      </p>
      <div className="mt-4 flex gap-2">
        {!signedIn && (
          <Button variant="secondary" onClick={openSignIn}>
            Sign in
          </Button>
        )}
        <Button variant="default" asChild>
          <Link href="/">Start a new chat</Link>
        </Button>
      </div>
    </div>
  );
}
