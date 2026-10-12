import { headers } from "next/headers";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { ProfileMenu } from "@/components/marketplace/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/marketplace/auth";
import { claimHref, links } from "@/lib/links";

const navClass =
  "rounded-full px-3 py-2 text-sm text-fg hover:bg-lilac hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple";

export async function MarketplaceFrame({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const claim = claimHref(host);
  return (
    <div className="min-h-full">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/marketplace" aria-label="Marketplace home" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple">
            <Logo />
          </Link>
          <nav aria-label="Marketplace" className="hidden items-center gap-1 md:flex">
            <Link href="/" className={navClass}>
              Home
            </Link>
            <a href={links.docs} className={navClass}>
              Docs
            </a>
            {claim.startsWith("/") ? (
              <Link href={claim} className={navClass}>
                Claim
              </Link>
            ) : (
              <a href={claim} className={navClass}>
                Claim
              </a>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle scope="market" />
          {session ? (
            <ProfileMenu email={session.email} name={session.name} />
          ) : (
            <>
              <Link
                href="/marketplace/login"
                className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-fg hover:bg-lilac hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                Log in
              </Link>
              <Link href="/marketplace/login?mode=signup" className="btn btn-primary min-h-10 px-4 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
