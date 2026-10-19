import type { Metadata } from "next";
import Link from "next/link";

import { Eyebrow } from "@/components/home/section-heading";
import { ListingColumns, ListingRow } from "@/components/marketplace/listing-row";
import { TypedWord } from "@/components/marketplace/typed-word";
import { MACHINE_TYPES } from "@/lib/marketplace/catalog";
import { formatRows } from "@/lib/marketplace/format";
import { listCatalog } from "@/lib/marketplace/samples";

export const metadata: Metadata = {
  title: "Marketplace · KineticVM",
  description:
    "Machine data you can check. Owners list what their devices signed on Monad. Buyers verify the rows, pay in MON, then download the file.",
};

export default async function MarketplacePage() {
  const listings = await listCatalog({ q: "", machine: "", sort: "rows" });
  const trending = [...listings.filter((listing) => !listing.preview), ...listings.filter((listing) => listing.preview)].slice(0, 4);
  const recent = [...listings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const categories = MACHINE_TYPES.map((machine) => ({
    ...machine,
    count: listings.filter((listing) => listing.machineType === machine.id).length,
  })).filter((machine) => machine.count > 0);
  const rows = listings.reduce((sum, listing) => sum + listing.rowCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-2 pb-16">
      <Eyebrow>Data marketplace</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl">
        Machine data you can <TypedWord />.
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-fg">
        Owners list what their devices already signed. Verify the rows, pay in MON, then download the file.
      </p>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <form action="/marketplace/browse" className="flex w-full shrink-0 gap-2 lg:w-[26rem]" role="search">
          <label htmlFor="home-q" className="sr-only">
            Search datasets
          </label>
          <input id="home-q" name="q" type="search" placeholder="Search vending, drone, farm" className="field min-w-0 font-sans" autoComplete="off" />
          <button type="submit" className="btn btn-primary shrink-0 px-5">
            Search
          </button>
        </form>
        <nav className="flex flex-1 flex-wrap gap-2 lg:justify-end" aria-label="Machine categories">
          {categories.map((machine) => (
            <Link
              key={machine.id}
              href={`/marketplace/browse?machine=${machine.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-ink hover:border-lilac-strong hover:bg-lilac focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
            >
              {machine.label}
              <span className="font-mono text-xs text-muted">{machine.count}</span>
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg">
        <div>
          <dt className="sr-only">Datasets</dt>
          <dd>
            <span className="font-mono text-ink">{listings.length}</span> datasets
          </dd>
        </div>
        <div>
          <dt className="sr-only">Rows</dt>
          <dd>
            <span className="font-mono text-ink">{formatRows(rows)}</span> signed rows
          </dd>
        </div>
        <div>
          <dt className="sr-only">Machines</dt>
          <dd>
            <span className="font-mono text-ink">{categories.length}</span> machine types
          </dd>
        </div>
        <div>
          <dt className="sr-only">Chain</dt>
          <dd>Monad testnet</dd>
        </div>
      </dl>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Largest datasets</h2>
            <p className="text-sm text-muted">Live listings first, then the biggest files.</p>
          </div>
          <Link href="/marketplace/browse?sort=rows" className="text-sm font-medium text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep">
            Browse all datasets
          </Link>
        </div>
        {trending.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-muted">No datasets listed yet.</p>
        ) : (
          <div className="mt-3 border-y border-line">
            <ListingColumns />
            <ul className="divide-y divide-line">
              {trending.map((listing) => (
                <li key={listing.slug}>
                  <ListingRow listing={listing} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">Just listed</h2>
              <p className="text-sm text-muted">Newest files in the catalog.</p>
            </div>
            <Link href="/marketplace/browse" className="text-sm font-medium text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep">
              Newest first
            </Link>
          </div>
          <div className="mt-3 border-y border-line">
            <ListingColumns />
            <ul className="divide-y divide-line">
              {recent.map((listing) => (
                <li key={listing.slug}>
                  <ListingRow listing={listing} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">1. Verify</h2>
          <p className="mt-1 text-sm leading-6 text-fg">Each row has to match a score-100 attestation from the Kinetic attestor.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">2. Pay</h2>
          <p className="mt-1 text-sm leading-6 text-fg">MON goes to the owner on Monad testnet. The file stays sealed until then.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">3. Download</h2>
          <p className="mt-1 text-sm leading-6 text-fg">The JSONL unlocks after the transfer confirms. Rehash any line against the chain.</p>
        </div>
      </section>
      <p className="mt-4 text-sm text-muted">
        Selling from an agent you hold?{" "}
        <Link href="/account/listings/new" className="font-medium text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep">
          List a dataset
        </Link>
      </p>
    </div>
  );
}
