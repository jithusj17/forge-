"use client";

import { SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { useMemo } from "react";
import type { Version } from "@/lib/types";

// Generated React projects run in Sandpack's bundler iframe, which is served from a
// separate origin, so app code can't reach Forge's cookies or DOM.
export default function SandpackPreviewFrame({ version, reloadKey }: { version: Version; reloadKey: number }) {
  const files = useMemo(
    () => Object.fromEntries(version.files.map((f) => [f.path, { code: f.content }])),
    [version.files],
  );

  return (
    <SandpackProvider
      key={`${version.n}-${reloadKey}`}
      template="react-ts"
      files={files}
      customSetup={{ dependencies: { "lucide-react": "^1.0.0" } }}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
        recompileMode: "delayed",
        recompileDelay: 300,
      }}
      style={{ height: "100%" }}
    >
      <SandpackPreview
        style={{ height: "100%" }}
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  );
}
