import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { TemplateGrid } from "@/components/landing/template-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex w-full flex-col gap-16 px-3 pb-24 sm:px-6 lg:gap-32">
        <Hero />
        <TemplateGrid />
        <Features />
      </main>
      <SiteFooter />
    </div>
  );
}
