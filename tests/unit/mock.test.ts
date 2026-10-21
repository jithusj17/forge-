import { describe, expect, it } from "vitest";
import type { GenerationEvent } from "@/lib/engine/events";
import { runMockEngine } from "@/lib/engine/mock";
import { pickMockProject } from "@/lib/mock-templates";

describe("pickMockProject", () => {
  it("chooses a template from the prompt", () => {
    expect(pickMockProject("a contact form").kind).toBe("contact-form");
    expect(pickMockProject("todo list app").kind).toBe("todo");
    expect(pickMockProject("mortgage calculator").kind).toBe("calculator");
    expect(pickMockProject("something else entirely").kind).toBe("landing");
  });

  it("keeps iterating on the current project for vague follow-ups", () => {
    expect(pickMockProject("make it blue", "todo").kind).toBe("todo");
    expect(pickMockProject("now add a contact form", "todo").kind).toBe("contact-form");
  });

  it("escapes prompt text that lands in HTML", () => {
    const p = pickMockProject('<img src=x onerror="alert(1)">');
    expect(p.previewHtml).not.toContain("<img src=x");
  });
});

describe("runMockEngine", () => {
  it("streams steps and returns an html version", async () => {
    const events: GenerationEvent[] = [];
    const { version } = await runMockEngine({
      prompt: "Build a contact form",
      history: [],
      previous: undefined,
      versionN: 1,
      emit: (e) => events.push(e),
    });
    expect(version?.runtime).toBe("html");
    expect(version?.n).toBe(1);
    expect(version?.files.map((f) => f.path)).toContain("components/contact-form.tsx");
    expect(events.some((e) => e.type === "step" && e.step.kind === "version")).toBe(true);
    expect(events.filter((e) => e.type === "text").length).toBeGreaterThan(0);
  }, 15_000);
});
