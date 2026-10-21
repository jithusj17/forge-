import { describe, expect, it } from "vitest";
import { viteProjectFiles } from "@/lib/export-zip";
import type { Version } from "@/lib/types";

describe("viteProjectFiles", () => {
  it("wraps generated files in a runnable Vite project", () => {
    const version: Version = {
      n: 2,
      title: "x",
      runtime: "react",
      createdAt: 0,
      files: [
        { path: "/App.tsx", language: "tsx", content: "export default function App(){return null}" },
        { path: "/components/card.tsx", language: "tsx", content: "export const Card = () => null" },
      ],
    };
    const files = viteProjectFiles("My Cool App!", version);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(["package.json", "index.html", "vite.config.ts", "src/main.tsx", "src/App.tsx", "src/components/card.tsx"]),
    );
    expect(JSON.parse(files["package.json"]).name).toBe("my-cool-app");
    expect(files["src/main.tsx"]).toContain('import App from "./App"');
  });
});
