import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/marketplace/back-button";
import { BuyPanel } from "@/components/marketplace/buy-panel";
import { DatasetCover } from "@/components/marketplace/dataset-cover";
import { getSession } from "@/lib/marketplace/auth";
import { readAgent } from "@/lib/marketplace/chain";
import { licenseDetail, licenseLabel, machineLabel } from "@/lib/marketplace/catalog";
import { accessForListing, getPublicListing } from "@/lib/marketplace/db";
import { formatMon, formatRows, shortAddress } from "@/lib/marketplace/format";
import { getSample } from "@/lib/marketplace/samples";
import { explorerAddress } from "@/lib/monad";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = (await getPublicListing(slug)) ?? getSample(slug);
  if (!listing) return { title: "Dataset · KineticVM" };
  return {
    title: `${listing.title} · KineticVM`,
    description: listing.summary,
    openGraph: {
      url: `/marketplace/${slug}`,
      siteName: "KineticVM",
      images: [{ url: "/og-marketplace.png", width: 1200, height: 630, alt: listing.title }],
    },
  };
}

export default async function DatasetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = await getPublicListing(slug);
  const sample = stored ? null : getSample(slug);
  const listing = stored ?? sample;
  if (!listing) notFound();
  const session = await getSession();
  const access = stored && session ? await accessForListing(slug, session.id) : null;
  const agent = stored && /^\d+$/.test(listing.agentId) ? await readAgent(BigInt(listing.agentId)) : null;
  const device = agent?.ok ? agent.value.device : null;

  return (
    <div className="mx-auto grid max-w-7xl items-start gap-6 px-6 pt-2 pb-20 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-x-10 lg:gap-y-4">
      <header className="min-w-0">
        <BackButton />
        <nav aria-label="Breadcrumb" className="mt-3 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/marketplace" className="hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple">
                Marketplace
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/marketplace/browse?machine=${listing.machineType}`}
                className="hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
              >
                {machineLabel(listing.machineType)}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {listing.preview ? <span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-medium text-ink">Preview</span> : null}
          <span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-medium text-ink">{machineLabel(listing.machineType)}</span>
          <span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-medium text-ink">{licenseLabel(listing.license)}</span>
        </div>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">{listing.title}</h1>
        <p className="mt-2 max-w-2xl text-base leading-6 text-fg">{listing.summary}</p>
      </header>

      <aside className="rounded-2xl border border-line bg-surface p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
        <DatasetCover
          image={listing.image}
          alt={listing.image ? `Cover photo for ${listing.title}` : ""}
          sizes="(min-width: 1024px) 480px, 100vw"
          priority
          intrinsic
          className="w-full rounded-xl"
        />
        <dl className="mt-3 text-sm">
          <Fact label="Price">
            <span className="font-mono text-ink">
              {formatMon(listing.priceWei)} MON
            </span>
          </Fact>
          <Fact label="Rows">
            <span className="font-mono text-ink">{formatRows(listing.rowCount)}</span>
          </Fact>
          <Fact label="Agent key">
            {sample ? (
              <span className="font-mono text-sm text-ink">{shortAddress(sample.device)}</span>
            ) : device ? (
              <ChainLink href={explorerAddress(listing.chainId, device)}>{shortAddress(device)}</ChainLink>
            ) : (
              <span className="text-ink">{agent?.ok ? "No device key" : "Not read"}</span>
            )}
          </Fact>
        </dl>
        <BuyPanel
          slug={listing.slug}
          priceWei={listing.priceWei}
          payout={listing.payout}
          rowCount={listing.rowCount}
          signedIn={Boolean(session)}
          sample={Boolean(sample)}
          checks={sample?.checks ?? []}
          access={access}
        />
      </aside>

      <article className="min-w-0">
        <section>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">Description</h2>
          <div className="mt-2 max-w-3xl space-y-2 text-[15px] leading-6 text-fg">
            {listing.description
              .split(/\n{2,}/)
              .filter((paragraph) => paragraph.trim().length > 0)
              .map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">How to use</h2>
          <ol className="mt-2 max-w-3xl list-decimal space-y-1.5 pl-5 text-[15px] leading-6 text-fg">
            <li>Verify data. Each row has to be a score-100 validation from the Kinetic attestor, for this agent, with a response hash equal to that line.</li>
            <li>
              Pay {formatMon(listing.priceWei)} MON on Monad testnet. The file stays sealed until the transfer confirms.
              {sample ? " This preview is not for sale." : ""}
            </li>
            <li>Download the JSONL. One object per line, using the fields below. Rehash a line to match the attestation you already checked.</li>
          </ol>
          <pre className="mt-3 max-w-3xl overflow-x-auto rounded-xl border border-line bg-lilac/50 p-3 font-mono text-xs leading-5 text-ink">
            <code>{rowShape(listing.schema)}</code>
          </pre>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">Fields</h2>
          <div className="mt-2 max-w-3xl overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Fields in each row</caption>
              <thead className="border-b border-line bg-lilac/50 text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Field
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    In the file
                  </th>
                </tr>
              </thead>
              <tbody>
                {listing.schema.map((field) => (
                  <tr key={field} className="border-b border-line last:border-0">
                    <th scope="row" className="px-3 py-2 font-mono font-medium text-ink">
                      {field}
                    </th>
                    <td className="px-3 py-2 text-muted">One value on every line</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-ink">License</h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-6 text-fg">
            <span className="font-medium text-ink">{licenseLabel(listing.license)}.</span> {licenseDetail(listing.license)}
          </p>
        </section>
      </article>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function ChainLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <span className="font-mono text-sm text-ink">{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-sm text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
    >
      {children}
    </a>
  );
}

function rowShape(fields: string[]): string {
  return `{\n${fields.map((field) => `  "${field}": "…"`).join(",\n")}\n}`;
}
