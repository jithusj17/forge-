import Link from "next/link";
import { Menu as MenuIcon } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#templates", label: "Templates" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="relative z-20 flex h-[50px] w-full shrink-0 items-center justify-between px-3 hairline-b">
      <Link href="/" className="flex items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
        <Logo withWordmark />
      </Link>

      <nav aria-label="Main" className="pointer-events-none absolute inset-x-0 hidden justify-center md:flex">
        <ul className="pointer-events-auto flex items-center gap-1">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-md px-2 py-1 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 hover:text-gray-1000"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <UserMenu />
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
          <MenuIcon />
        </Button>
      </div>
    </header>
  );
}
