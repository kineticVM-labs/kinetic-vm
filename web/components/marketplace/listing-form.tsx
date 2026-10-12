"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LICENSES, MACHINE_TYPES } from "@/lib/marketplace/catalog";

export function ListingForm({ payout, pinataReady }: { payout: string; pinataReady: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const manifest = data.get("manifest");
    const file = data.get("data");
    if (!(manifest instanceof File) || !(file instanceof File) || manifest.size === 0 || file.size === 0) {
      setError("Choose both the manifest and the data file.");
      return;
    }
    if (!String(data.get("payout") ?? "").trim()) {
      setError("Enter the wallet that should receive MON.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/marketplace/listings", { method: "POST", body: data });
      const payload = (await response.json()) as { error?: string; slug?: string };
      if (!response.ok || !payload.slug) throw new Error(payload.error ?? "The listing was not published.");
      router.push(`/marketplace/${payload.slug}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The listing failed.");
      setBusy(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={(event) => void onSubmit(event)} noValidate>
      {!pinataReady ? (
        <p className="rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm leading-6 text-danger" role="status">
          Pinata is not configured. Add PINATA_JWT before a dataset can be stored.
        </p>
      ) : null}
      <fieldset className="space-y-5" disabled={busy || !pinataReady}>
        <legend className="text-sm font-medium text-ink">Agent</legend>
        <div>
          <label htmlFor="agentId" className="text-sm font-medium text-ink">
            Agent id
          </label>
          <input id="agentId" name="agentId" inputMode="numeric" autoComplete="off" spellCheck={false} required className="field mt-2" placeholder="42" aria-describedby="agent-hint" />
          <p id="agent-hint" className="mt-2 text-sm leading-6 text-muted">
            The device that produced the rows. NFT ownership is checked when you issue that agent an API key, not here.
          </p>
        </div>
        <div>
          <label htmlFor="payout" className="text-sm font-medium text-ink">
            Payout address
          </label>
          <input id="payout" name="payout" defaultValue={payout} autoComplete="off" spellCheck={false} required className="field mt-2" placeholder="0x…" aria-describedby="payout-hint" />
          <p id="payout-hint" className="mt-2 text-sm leading-6 text-muted">
            Buyer payments in MON are sent here.
          </p>
        </div>
      </fieldset>

      <fieldset className="space-y-5" disabled={busy || !pinataReady}>
        <legend className="text-sm font-medium text-ink">Dataset</legend>
        <div>
          <label htmlFor="title" className="text-sm font-medium text-ink">
            Title
          </label>
          <input id="title" name="title" required maxLength={80} autoComplete="off" className="field mt-2 font-sans" placeholder="Vending sales, Lagos" />
        </div>
        <div>
          <label htmlFor="summary" className="text-sm font-medium text-ink">
            Summary
          </label>
          <input id="summary" name="summary" required maxLength={180} autoComplete="off" className="field mt-2 font-sans" placeholder="Thirty days of vend events from six machines" />
        </div>
        <div>
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Description
          </label>
          <textarea id="description" name="description" required minLength={20} className="field mt-2 min-h-36 py-3 font-sans leading-6" placeholder="What was collected, over what period, and what was left out." />
        </div>
        <div>
          <label htmlFor="machineType" className="text-sm font-medium text-ink">
            Machine
          </label>
          <select id="machineType" name="machineType" required defaultValue="vending" className="field mt-2 font-sans">
            {MACHINE_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">License</p>
          <div className="mt-3 space-y-2">
            {LICENSES.map((item) => (
              <label key={item.id} className="flex cursor-pointer gap-3 rounded-2xl border border-line px-4 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-purple">
                <input type="radio" name="license" value={item.id} required defaultChecked={item.id === "research"} className="mt-1 accent-[var(--purple)]" />
                <span>
                  <span className="block text-sm font-medium text-ink">{item.label}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-muted">{item.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="priceMon" className="text-sm font-medium text-ink">
            Price in MON
          </label>
          <input id="priceMon" name="priceMon" inputMode="decimal" autoComplete="off" required className="field mt-2" placeholder="12" />
        </div>
      </fieldset>

      <fieldset className="space-y-5" disabled={busy || !pinataReady}>
        <legend className="text-sm font-medium text-ink">Files</legend>
        <div>
          <label htmlFor="manifest" className="text-sm font-medium text-ink">
            Manifest
          </label>
          <input id="manifest" name="manifest" type="file" accept="application/json,.json" required className="mt-2 block w-full text-sm text-fg file:mr-4 file:rounded-full file:border-0 file:bg-lilac file:px-4 file:py-2 file:font-medium file:text-ink" />
          <p className="mt-2 text-sm leading-6 text-muted">JSON with a paramsHash and a requestHash for every row. Buyers check these on Monad before they pay.</p>
        </div>
        <div>
          <label htmlFor="image" className="text-sm font-medium text-ink">
            Cover image
          </label>
          <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm text-fg file:mr-4 file:rounded-full file:border-0 file:bg-lilac file:px-4 file:py-2 file:font-medium file:text-ink" />
          <p className="mt-2 text-sm leading-6 text-muted">Optional. A photo of the machine. Leave it empty and the listing shows a dataset mark.</p>
        </div>
        <div>
          <label htmlFor="data" className="text-sm font-medium text-ink">
            Data file
          </label>
          <input id="data" name="data" type="file" accept=".jsonl,.ndjson,application/x-ndjson,.txt" required className="mt-2 block w-full text-sm text-fg file:mr-4 file:rounded-full file:border-0 file:bg-lilac file:px-4 file:py-2 file:font-medium file:text-ink" />
          <p className="mt-2 text-sm leading-6 text-muted">One JSON object per line. Buyers cannot download it until they pay.</p>
        </div>
      </fieldset>

      {error ? (
        <p className="rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={busy || !pinataReady} aria-busy={busy}>
        {busy ? "Uploading" : "List dataset"}
      </button>
    </form>
  );
}
