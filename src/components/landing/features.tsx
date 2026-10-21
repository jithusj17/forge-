import { Blocks, Code2, GitBranch, Paintbrush, Rocket, Sparkles } from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "Prompt. Build. Ship.", body: "Describe what you want and get a working app with live preview." },
  { icon: Code2, title: "Real code", body: "Every version is plain React and TypeScript you can read and export." },
  { icon: GitBranch, title: "Versions built in", body: "Each change is a new version you can compare or roll back." },
  { icon: Paintbrush, title: "Design tokens", body: "Consistent colors, type and spacing across everything you make." },
  { icon: Blocks, title: "Start from templates", body: "Fork community templates instead of starting from a blank page." },
  { icon: Rocket, title: "One-click publish", body: "Share a live link to your app when it's ready." },
];

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-[1264px] px-4 md:px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-alpha-400 bg-alpha-400 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-2 bg-bg-200 p-6">
            <Icon className="size-5 text-gray-900" />
            <h3 className="text-heading-16 text-gray-1000">{title}</h3>
            <p className="text-copy-14 text-gray-900">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
