"use client";

import { useMarketTheme } from "@/components/marketplace/market-theme";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeToggle({ tone = "surface", scope = "site" }: { tone?: "surface" | "rail"; scope?: "site" | "market" }) {
  const market = useMarketTheme();

  function toggle() {
    if (scope === "market" && market) {
      market.toggle();
      return;
    }
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    if (next === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage; the toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className={`grid size-10 flex-none place-items-center rounded-full transition-colors duration-150 ${tone === "rail" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-fg hover:bg-lilac hover:text-ink"}`}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className="dark:hidden">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className="hidden dark:block">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
    </button>
  );
}
