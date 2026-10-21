"use client";

import {
  BarChart3,
  Calculator,
  CalendarDays,
  Gamepad2,
  ImageIcon,
  ListTodo,
  Mail,
  RotateCw,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Composer, type ComposerHandle } from "@/components/composer/composer";
import { Button } from "@/components/ui/button";
import { createChat } from "@/lib/store";
import { sendPrompt } from "@/lib/mock-engine";
import type { ModelId } from "@/lib/types";

const SUGGESTIONS: { label: string; icon: LucideIcon; prompt: string }[] = [
  { label: "Contact Form", icon: Mail, prompt: "Build a contact form with name, email and message fields and validation" },
  { label: "Task List", icon: ListTodo, prompt: "Build a todo app with filters for active and completed tasks" },
  { label: "Loan Calculator", icon: Calculator, prompt: "Build a loan calculator with sliders for amount, rate and term" },
  { label: "Landing Page", icon: ImageIcon, prompt: "Create a landing page for a productivity startup" },
  { label: "Mini Game", icon: Gamepad2, prompt: "Make a simple memory card game" },
  { label: "Dashboard", icon: BarChart3, prompt: "Design an analytics dashboard with KPI cards and a chart" },
  { label: "Booking Page", icon: CalendarDays, prompt: "Build a booking page with a calendar and time slots" },
  { label: "Storefront", icon: ShoppingBag, prompt: "Create a storefront with a product grid and cart" },
];

export function Hero() {
  const router = useRouter();
  const composer = useRef<ComposerHandle>(null);
  const [page, setPage] = useState(0);
  const visible = Array.from({ length: 4 }, (_, i) => SUGGESTIONS[(page * 4 + i) % SUGGESTIONS.length]);

  function start(prompt: string, model: ModelId) {
    const chat = createChat(prompt, model);
    router.push(`/chat/${chat.id}`);
    void sendPrompt(chat.id, prompt);
  }

  return (
    <section className="relative mx-auto flex w-full flex-col gap-4 pt-24 lg:pt-40">
      <h1 className="text-balance text-center text-heading-24 text-gray-1000 md:text-heading-32">
        What do you want to build?
      </h1>
      <div className="mx-auto w-full max-w-[690px]">
        <Composer ref={composer} onSubmit={start} autoFocus />
        <div className="flex flex-wrap items-center justify-center gap-2 pb-2 pt-4">
          {visible.map(({ label, icon: Icon, prompt }) => (
            <Button key={label} variant="pill" size="sm" onClick={() => composer.current?.prefill(prompt)}>
              <Icon />
              {label}
            </Button>
          ))}
          <Button
            variant="pill"
            size="icon-sm"
            className="size-8"
            aria-label="Refresh suggestions"
            onClick={() => setPage((p) => p + 1)}
          >
            <RotateCw />
          </Button>
        </div>
      </div>
    </section>
  );
}
