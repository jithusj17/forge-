import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg-200 px-6 text-center">
      <p className="text-label-13-mono text-gray-900">404</p>
      <h1 className="text-heading-24 text-gray-1000">Page not found</h1>
      <p className="max-w-md text-copy-14 text-gray-900">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button variant="default" asChild className="mt-2">
        <Link href="/">Start building</Link>
      </Button>
    </div>
  );
}
