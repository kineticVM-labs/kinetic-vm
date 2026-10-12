"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const BUY_DATA_HREF = "/marketplace/browse";
export const BUY_DATA_LABEL = "Buy AI Data";
export const LIST_DATA_HREF = "/account/listings/new";
export const LIST_DATA_LABEL = "List data";

export function DashboardActions({
  tone = "paper",
  compact = false,
  onNavigate,
}: {
  tone?: "paper" | "rail";
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const size = compact ? "min-h-10 px-2.5 text-xs sm:px-3 sm:text-sm" : tone === "rail" ? "min-h-10 flex-1 px-2 text-sm" : "";
  const listClass =
    tone === "rail"
      ? `btn border border-white/20 bg-white text-night hover:bg-white/90 ${size}`
      : `btn btn-secondary ${size}`;
  const buyClass = `btn btn-primary ${size}`;
  return (
    <div className={tone === "rail" ? "flex w-full gap-2" : "inline-flex flex-wrap items-center gap-2"}>
      <Link href={LIST_DATA_HREF} onClick={onNavigate} className={listClass}>
        {LIST_DATA_LABEL}
      </Link>
      <Link href={BUY_DATA_HREF} onClick={onNavigate} className={buyClass}>
        {BUY_DATA_LABEL}
      </Link>
    </div>
  );
}

const ITEMS = [
  { href: "/account", label: "Overview", exact: true, icon: "overview" },
  { href: "/account/purchases", label: "Purchases", exact: false, icon: "purchases" },
  { href: "/account/listings", label: "Listings", exact: false, icon: "listings" },
  { href: "/account/keys", label: "API keys", exact: false, icon: "keys" },
  { href: "/account/settings", label: "Settings", exact: false, icon: "settings" },
] as const;

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const current = item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              current ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ name }: { name: (typeof ITEMS)[number]["icon"] }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "overview") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "purchases") {
    return (
      <svg {...common}>
        <path d="M6 7h12l-1 12H7L6 7Z" />
        <path d="M9 7V5.5A3 3 0 0 1 12 2.5 3 3 0 0 1 15 5.5V7" />
      </svg>
    );
  }
  if (name === "listings") {
    return (
      <svg {...common}>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    );
  }
  if (name === "keys") {
    return (
      <svg {...common}>
        <circle cx="8" cy="15" r="3.25" />
        <path d="M11 15h9l-2 2 2 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.5 1.5M16.5 16.5 18 18M6 18l1.5-1.5M16.5 7.5 18 6" />
    </svg>
  );
}
