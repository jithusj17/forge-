"use client";

import { Check, ChevronDown, ChevronRight, Hexagon, Plus, Search, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { MODELS, modelLabel } from "@/lib/models";
import type { ModelId } from "@/lib/types";

export function ModelPicker({ value, onChange }: { value: ModelId; onChange: (id: ModelId) => void }) {
  const [query, setQuery] = useState("");
  const visible = MODELS.filter((m) => m.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Menu onOpenChange={(open) => !open && setQuery("")}>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          aria-label={`Select model, current model: ${modelLabel(value)}`}
          className="h-7 max-w-56 text-gray-900 hover:text-gray-1000 sm:text-[13px]"
        >
          <Hexagon />
          <span className="hidden truncate @sm/composer:inline">{modelLabel(value)}</span>
          <ChevronDown className="size-3.5!" />
        </Button>
      </MenuTrigger>
      <MenuContent align="start" className="w-72 p-0">
        <div className="flex h-10 items-center gap-2 border-b border-alpha-400 px-3 text-gray-900">
          <Search className="size-4" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Keep typing inside the search box instead of triggering menu typeahead.
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Search models"
            className="h-full flex-1 bg-transparent text-label-14 text-gray-1000 outline-none placeholder:text-gray-900"
          />
        </div>
        <div className="p-1">
          {visible.map((m) => (
            <MenuItem key={m.id} onSelect={() => onChange(m.id)}>
              {m.id === "forge-max-fast" ? <Zap /> : <Hexagon />}
              <span className="flex-1 font-medium">{m.label}</span>
              {m.id === value && <Check className="text-gray-1000!" />}
            </MenuItem>
          ))}
          {visible.length === 0 && <div className="px-2.5 py-2 text-gray-900">No models found</div>}
        </div>
        <MenuSeparator className="mx-0 my-0" />
        <div className="p-1">
          <MenuItem disabled>
            <Plus />
            <span className="flex-1 font-medium">Add models</span>
            <ChevronRight />
          </MenuItem>
        </div>
      </MenuContent>
    </Menu>
  );
}
