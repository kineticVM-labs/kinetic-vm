"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const ITEMS = [
  { href: "/account/listings/new", label: "List a dataset" },
  { href: "/account", label: "Dashboard" },
  { href: "/account/listings", label: "Listings" },
  { href: "/account/purchases", label: "Purchases" },
  { href: "/account/keys", label: "API keys" },
  { href: "/account/settings", label: "Settings" },
];

export function ProfileMenu({ email, name }: { email: string; name: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const router = useRouter();

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    }
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/marketplace/session", { method: "DELETE" });
    close(false);
    router.refresh();
    setBusy(false);
  }

  const label = name || email;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 pr-3 text-sm font-medium text-ink hover:bg-lilac focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 place-items-center rounded-full bg-purple text-xs font-semibold text-white" aria-hidden="true">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-28 truncate">{label}</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_24px_60px_-28px_rgba(32,0,82,0.45)]"
          onKeyDown={onMenuKeyDown}
        >
          <p className="truncate px-3 py-2 text-[11px] text-muted">{email}</p>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-lilac focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-danger hover:bg-danger-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple disabled:opacity-50"
            disabled={busy}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
