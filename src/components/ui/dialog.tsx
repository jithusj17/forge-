"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <D.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-bg-100 p-6 shadow-modal outline-none",
            className,
          )}
        >
          <D.Title className="text-heading-16 text-gray-1000">{title}</D.Title>
          {description && <D.Description className="mt-1 text-copy-14 text-gray-900">{description}</D.Description>}
          <div className="mt-5">{children}</div>
          <D.Close
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-1 text-gray-900 hover:bg-alpha-300 hover:text-gray-1000"
          >
            <X className="size-4" />
          </D.Close>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
