"use client";

import { DropdownMenu } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuSub = DropdownMenu.Sub;

export function MenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-xl bg-bg-100 p-1 text-label-14 shadow-menu",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-gray-1000 outline-none",
        "data-[highlighted]:bg-alpha-200 data-[disabled]:cursor-not-allowed data-[disabled]:text-gray-700 [&_svg]:size-4 [&_svg]:text-gray-900",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({ className }: { className?: string }) {
  return <DropdownMenu.Separator className={cn("-mx-1 my-1 h-px bg-alpha-400", className)} />;
}
