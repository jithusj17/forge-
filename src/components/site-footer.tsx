import { Logo } from "@/components/logo";
import { BRAND } from "@/lib/brand";

const COLUMNS = [
  { title: "Product", links: ["Home", "Templates", "Pricing", "Changelog"] },
  { title: "Company", links: ["About", "Terms", "Privacy"] },
  { title: "Resources", links: ["Docs", "FAQ", "Community"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-100">
      <div className="mx-auto grid w-full max-w-[1264px] gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="flex flex-col gap-3">
          <Logo withWordmark />
          <p className="text-copy-13 text-gray-900">{BRAND.tagline}</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-label-14 font-medium text-gray-1000">{col.title}</h2>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-label-14 text-gray-900 transition-colors hover:text-gray-1000">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
