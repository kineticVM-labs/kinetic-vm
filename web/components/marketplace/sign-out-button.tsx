"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/marketplace/session", { method: "DELETE" });
    router.push("/marketplace");
    router.refresh();
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
