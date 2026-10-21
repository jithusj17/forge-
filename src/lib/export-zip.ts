"use client";

import type { Version } from "@/lib/types";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "project";

/** Files for a runnable Vite + React project wrapping the generated sources. */
export function viteProjectFiles(name: string, version: Version): Record<string, string> {
  const out: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: slug(name),
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "lucide-react": "^1.0.0" },
        devDependencies: { vite: "^7.0.0", "@vitejs/plugin-react": "^5.0.0", typescript: "^5.6.0", "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0" },
      },
      null,
      2,
    ),
    "vite.config.ts": `import { defineConfig } from "vite"\nimport react from "@vitejs/plugin-react"\n\nexport default defineConfig({ plugins: [react()] })\n`,
    "index.html": `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${name.replace(/</g, "")}</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`,
    "src/main.tsx": `import { StrictMode } from "react"\nimport { createRoot } from "react-dom/client"\nimport App from "./App"\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n`,
    "README.md": `# ${name}\n\nGenerated with Forge (v${version.n}).\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  };
  for (const f of version.files) out[`src/${f.path.replace(/^\/+/, "")}`] = f.content;
  return out;
}

export async function downloadVersionZip(name: string, version: Version) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  if (version.runtime === "react") {
    for (const [path, content] of Object.entries(viteProjectFiles(name, version))) zip.file(path, content);
  } else {
    if (version.previewHtml) zip.file("index.html", version.previewHtml);
    for (const f of version.files) zip.file(`source/${f.path}`, f.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(name)}-v${version.n}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
