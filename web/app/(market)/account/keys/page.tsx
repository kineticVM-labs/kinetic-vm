import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { KeysPanel } from "@/components/marketplace/keys-panel";
import { getSession } from "@/lib/marketplace/auth";
import { listAgentKeys } from "@/lib/marketplace/db";
import { formatUtcDay } from "@/lib/marketplace/dashboard";

export const metadata: Metadata = {
  title: "API keys · KineticVM",
  description: "Keys a device uses to list datasets. A key is issued only for an agent NFT the connected wallet holds.",
};

export default async function KeysPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?mode=signup&next=/account/keys");
  const keys = await listAgentKeys(session.id);
  return (
    <>
      <KeysPanel
        keys={keys.map((key) => ({
          id: key.id,
          agentId: key.agentId,
          wallet: key.wallet,
          prefix: key.prefix,
          created: formatUtcDay(key.createdAt),
          lastUsed: key.lastUsedAt ? formatUtcDay(key.lastUsedAt) : null,
        }))}
      />
      {keys.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-ink">From a device</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            The agent sends the key as a bearer token. The response is the listing URL. The file CID stays on the server.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-paper px-4 py-3 font-mono text-xs leading-6 text-ink">
            {`POST /api/agent/listings
Authorization: Bearer kvm_…`}
          </pre>
        </section>
      ) : null}
    </>
  );
}
