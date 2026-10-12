"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DashboardActions, DashboardNav } from "@/components/marketplace/dashboard-nav";
import { SignOutButton } from "@/components/marketplace/sign-out-button";

export function DashboardMenu({ email, name }: { email: string; name: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(path);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const label = name || email;

  if (path !== seenPath) {
    setSeenPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="grid size-10 place-items-center rounded-full text-ink hover:bg-lilac focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close dashboard menu" : "Open dashboard menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>
      {open ? (
        <div ref={panelRef} id={panelId} className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto bg-night px-4 py-5">
          <DashboardActions tone="rail" onNavigate={() => setOpen(false)} />
          <div className="mt-4">
            <DashboardNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-8 border-t border-white/10 pt-4">
            <p className="truncate px-3 text-sm text-white">{label}</p>
            <p className="truncate px-3 text-xs text-white/60">{email}</p>
            <div className="mt-2">
              <SignOutButton className="text-white/75 hover:bg-white/10 hover:text-white" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
