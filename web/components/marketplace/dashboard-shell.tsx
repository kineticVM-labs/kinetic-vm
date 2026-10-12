import Link from "next/link";

import { Logo } from "@/components/logo";
import { DashboardActions, DashboardNav } from "@/components/marketplace/dashboard-nav";
import { DashboardMenu } from "@/components/marketplace/dashboard-menu";
import { SignOutButton } from "@/components/marketplace/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardShell({
  email,
  name,
  children,
}: {
  email: string;
  name: string | null;
  children: React.ReactNode;
}) {
  const label = name || email;
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-night text-white lg:flex">
        <div className="px-5 pt-6">
          <Link href="/marketplace" aria-label="Marketplace home" className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Logo tone="dark" />
          </Link>
        </div>
        <div className="px-3 pt-6">
          <DashboardActions tone="rail" />
        </div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3">
          <DashboardNav />
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white" aria-hidden="true">
              {label.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm text-white">{label}</span>
              <span className="block truncate text-xs text-white/60">{email}</span>
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <SignOutButton className="text-white/75 hover:bg-white/10 hover:text-white" />
            <ThemeToggle tone="rail" scope="market" />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-1">
            <DashboardMenu email={email} name={name} />
            <Link href="/marketplace" aria-label="Marketplace home" className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple">
              <Logo wordmark={false} />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <DashboardActions compact />
            <ThemeToggle scope="market" />
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
