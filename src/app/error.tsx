"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg-200 px-6 text-center">
      <h1 className="text-heading-24 text-gray-1000">Something went wrong</h1>
      <p className="max-w-md text-copy-14 text-gray-900">
        An unexpected error occurred. Try again, or head back to the start.
        {error.digest && <span className="mt-1 block text-label-12 text-gray-700">Reference: {error.digest}</span>}
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Button variant="default" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
