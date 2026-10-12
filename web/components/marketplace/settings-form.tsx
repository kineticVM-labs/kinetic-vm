"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SettingsForm({ name, payout }: { name: string | null; payout: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setSaved(false);
    setError(null);
    const response = await fetch("/api/marketplace/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: String(data.get("name") ?? ""), payout: String(data.get("payout") ?? "") }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Settings could not be saved.");
      setBusy(false);
      return;
    }
    setSaved(true);
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <div>
        <label htmlFor="name" className="text-sm font-medium text-ink">
          Display name
        </label>
        <input id="name" name="name" defaultValue={name ?? ""} maxLength={40} autoComplete="nickname" className="field mt-2 font-sans" placeholder="Ada" />
      </div>
      <div>
        <label htmlFor="payout" className="text-sm font-medium text-ink">
          Payout address
        </label>
        <input id="payout" name="payout" defaultValue={payout ?? ""} autoComplete="off" spellCheck={false} className="field mt-2" placeholder="0x…" aria-describedby="payout-hint" />
        <p id="payout-hint" className="mt-2 text-sm leading-6 text-muted">
          Buyer payments in MON are sent to this wallet. Device uploads use it when an agent key lists a dataset.
        </p>
      </div>
      {error ? (
        <p className="text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-success" role="status">
          Saved.
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
        {busy ? "Saving" : "Save settings"}
      </button>
    </form>
  );
}
