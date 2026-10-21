import { BarChart3, Gamepad2, Heart, LayoutGrid, PanelsTopLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder community templates. Thumbnails are generated gradients so no third-party
// screenshots ship with the app.
const TEMPLATES = [
  { title: "Image Generation Playground", author: "maya", views: "6.7K", likes: 748, hue: 260 },
  { title: "SaaS Billing Landing Page", author: "devon", views: "14.7K", likes: 2100, hue: 30 },
  { title: "3D Photo Gallery", author: "kai", views: "3.6K", likes: 890, hue: 200 },
  { title: "AI Platform Marketing Site", author: "rin", views: "9.9K", likes: 1500, hue: 150 },
  { title: "Creative Studio", author: "maya", views: "1.1K", likes: 117, hue: 330 },
  { title: "Smart Home Dashboard", author: "ola", views: "222", likes: 81, hue: 90 },
];

const CATEGORIES = [
  { label: "Apps and Games", icon: Gamepad2 },
  { label: "Landing Pages", icon: PanelsTopLeft },
  { label: "Components", icon: LayoutGrid },
  { label: "Dashboards", icon: BarChart3 },
];

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function TemplateGrid() {
  return (
    <section id="templates" className="@container/page-layout mx-auto w-full max-w-[1264px] px-4 md:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-heading-24 text-gray-1000">Start with a template</h2>
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {CATEGORIES.map(({ label, icon: Icon }) => (
              <Button key={label} variant="pill" size="sm">
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 @lg/page-layout:grid-cols-2 @5xl/page-layout:grid-cols-3">
          {TEMPLATES.map((t) => (
            <article key={t.title} className="group flex flex-col gap-3">
              <div
                className="aspect-[16/9] overflow-hidden rounded-lg border border-alpha-400 transition-transform duration-200 ease-forge group-hover:-translate-y-0.5"
                style={{
                  background: `radial-gradient(120% 90% at 20% 10%, hsl(${t.hue} 70% 60% / .55), transparent 60%), radial-gradient(90% 80% at 90% 90%, hsl(${(t.hue + 60) % 360} 70% 55% / .45), transparent 60%), var(--bg-300)`,
                }}
              >
                <div className="m-4 h-3 w-1/3 rounded-full bg-alpha-500" />
                <div className="mx-4 h-2 w-1/2 rounded-full bg-alpha-400" />
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-label-13 font-medium text-white"
                  style={{ background: `hsl(${t.hue} 45% 45%)` }}
                  aria-hidden
                >
                  {t.author[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-label-14 font-medium text-gray-1000">{t.title}</h3>
                  <p className="flex items-center gap-1.5 text-label-13 text-gray-900">
                    <Users className="size-3.5" /> {t.views}
                    <span aria-hidden>•</span>
                    <Heart className="size-3.5" /> {formatCount(t.likes)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
