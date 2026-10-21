import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/cn";

// Original mark: an anvil-like wedge. Placeholder until a real logo exists.
export function Logo({ className, withWordmark = false }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-gray-1000", className)}>
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <path d="M3 6h14l4 4H9v8H5V10L3 6Z" fill="currentColor" />
        <path d="M11 14h6v4h-6z" fill="currentColor" opacity="0.55" />
      </svg>
      {withWordmark && <span className="text-heading-16">{BRAND.name}</span>}
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
