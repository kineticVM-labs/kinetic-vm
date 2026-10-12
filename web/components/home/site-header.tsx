import Link from "next/link";

import { SmartLink } from "@/components/smart-link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { links } from "@/lib/links";

const NAV = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "#builders", label: "Builders" },
];

export function SiteHeader({ claim }: { claim: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-full border border-surface/70 bg-surface/75 pl-5 pr-2 shadow-[0_8px_30px_-12px_rgba(32,0,82,0.18)] backdrop-blur-xl">
        <Link href="/" aria-label="KineticVM home" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) =>
            item.href.startsWith("/") ? (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-lilac hover:text-ink"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-lilac hover:text-ink"
              >
                {item.label}
              </a>
            ),
          )}
          <a
            href={links.docs}
            className="rounded-full px-3.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-lilac hover:text-ink"
          >
            Docs
          </a>
        </nav>
        <div className="flex items-center gap-1">
          <a
            href={links.github}
            className="hidden rounded-full px-3.5 py-2 text-sm text-fg transition-colors duration-150 hover:bg-lilac hover:text-ink lg:inline-flex"
          >
            GitHub
          </a>
          <ThemeToggle />
          <SmartLink href={claim} className="btn btn-primary min-h-10 px-4 text-sm">
            Claim a device
          </SmartLink>
        </div>
      </div>
    </header>
  );
}
