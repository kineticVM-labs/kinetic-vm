"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const STORAGE_KEY = "kinetic-market-theme";
const CHANGE = "kinetic-market-theme-change";

type Theme = "dark" | "light";

function readTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The switch still applies for this visit.
  }
  window.dispatchEvent(new Event(CHANGE));
}

const MarketThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function useMarketTheme() {
  return useContext(MarketThemeContext);
}

export function MarketTheme({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  function toggle() {
    writeTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <MarketThemeContext.Provider value={{ theme, toggle }}>
      <div data-theme={theme === "dark" ? "dark" : undefined} className="min-h-dvh bg-paper text-fg">
        {children}
      </div>
    </MarketThemeContext.Provider>
  );
}
