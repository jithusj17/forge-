"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
}

// Raised-pill segmented control used for Preview/Code and Chat/Preview switching.
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
  itemClassName,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "relative flex h-7 rounded-[6px] border border-gray-300 bg-gray-100 text-label-14 font-medium",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-1 cursor-pointer items-center justify-center px-2.5 outline-none transition-colors duration-300 ease-forge [&_svg]:size-4",
              active ? "text-gray-1000" : "text-gray-900 hover:text-gray-1000",
              itemClassName,
            )}
          >
            {active && (
              <span className="absolute inset-px rounded-[5px] bg-bg-100 shadow-medium" aria-hidden />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
