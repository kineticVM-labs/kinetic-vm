"use client";

import { useState } from "react";

import { links } from "@/lib/links";

export function SignOutButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/marketplace/session", { method: "DELETE" });
    window.location.assign(links.marketplace);
  }

  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center rounded-full px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 ${className}`}
      disabled={busy}
      onClick={() => void signOut()}
    >
      {busy ? "Signing out" : "Sign out"}
    </button>
  );
}
