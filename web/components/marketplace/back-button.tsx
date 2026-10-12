"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/marketplace" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-secondary min-h-10 px-3.5 text-sm"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
      Back
    </button>
  );
}
