import type { Metadata } from "next";
import Link from "next/link";

import { ListingColumns, ListingRow } from "@/components/marketplace/listing-row";
import { MACHINE_TYPES } from "@/lib/marketplace/catalog";
import { listCatalog } from "@/lib/marketplace/samples";

export const metadata: Metadata = {
  title: "All datasets · KineticVM",
  description: "Every dataset listed on KineticVM. The file stays sealed until you pay.",
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = one(query.q);
  const machine = MACHINE_TYPES.some((item) => item.id === one(query.machine)) ? one(query.machine) : "";
  const sort = one(query.sort) === "price" || one(query.sort) === "rows" ? one(query.sort) : "new";
  const listings = await listCatalog({ q, machine, sort });
  const filtered = q !== "" || machine !== "";

  return (
    <div className="mx-auto max-w-7xl px-6 pt-4 pb-24">
      <p className="text-sm text-muted">
        <Link href="/marketplace" className="hover:text-ink">
          Marketplace
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">All datasets</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-fg">Search the full catalog. Preview the proof, pay the owner, then download the file.</p>

      <form method="get" className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px_auto] sm:items-end" role="search">
        <div>
          <label htmlFor="q" className="text-sm font-medium text-ink">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="vending, drone, farm" className="field mt-2 font-sans" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="machine" className="text-sm font-medium text-ink">
            Machine
          </label>
          <select id="machine" name="machine" defaultValue={machine} className="field mt-2 font-sans">
            <option value="">All machines</option>
            {MACHINE_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="text-sm font-medium text-ink">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field mt-2 font-sans">
            <option value="new">Newest</option>
            <option value="rows">Most rows</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
        <button type="submit" className="btn btn-secondary min-h-12">
          Apply
        </button>
      </form>

      <p className="mt-8 font-mono text-xs tracking-[0.16em] text-muted uppercase">
        {listings.length === 0 ? "No datasets" : `${listings.length} dataset${listings.length === 1 ? "" : "s"}`}
      </p>

      {listings.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-lilac-strong px-6 py-14">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">{filtered ? "Nothing matches those filters." : "No datasets listed yet."}</h2>
          <p className="mt-2 max-w-lg text-[15px] leading-7 text-muted">
            {filtered ? "Clear the search and try a broader machine type." : "When an owner lists a dataset, it shows up here. Buyers verify the rows before they pay."}
          </p>
          <Link href={filtered ? "/marketplace/browse" : "/account/listings/new"} className="btn btn-primary mt-6">
            {filtered ? "Clear filters" : "List a dataset"}
          </Link>
        </div>
      ) : (
        <div className="mt-3 border-y border-line">
          <ListingColumns />
          <ul className="divide-y divide-line">
            {listings.map((listing) => (
              <li key={listing.slug}>
                <ListingRow listing={listing} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
