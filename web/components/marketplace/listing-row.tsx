import Link from "next/link";

import { DatasetCover } from "@/components/marketplace/dataset-cover";
import { licenseLabel, machineLabel, type PublicListing } from "@/lib/marketplace/catalog";
import { formatUtcDay } from "@/lib/marketplace/dashboard";
import { formatMon, formatRows } from "@/lib/marketplace/format";

const COLUMNS = "md:grid-cols-[3.25rem_minmax(14rem,22rem)_repeat(4,minmax(4.5rem,1fr))_5.75rem] md:gap-x-5";

export function ListingColumns() {
  return (
    <div className={`hidden border-b border-line px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase md:grid ${COLUMNS}`} aria-hidden="true">
      <span />
      <span>Dataset</span>
      <span>License</span>
      <span>Updated</span>
      <span>Agent</span>
      <span>Fields</span>
      <span className="text-right">Price</span>
    </div>
  );
}

export function ListingRow({ listing }: { listing: PublicListing }) {
  const license = licenseLabel(listing.license);
  const updated = formatUtcDay(listing.createdAt);
  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className={`group grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl px-3 py-3 hover:bg-lilac/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple ${COLUMNS}`}
    >
      <DatasetCover image={listing.image} sizes="52px" compact className="size-[3.25rem] rounded-xl" />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-ink group-hover:text-purple-deep">{listing.title}</span>
          {listing.preview ? <span className="shrink-0 rounded-full bg-lilac px-2 py-0.5 text-[11px] font-medium text-ink">Preview</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-sm leading-5 text-fg">{listing.summary}</span>
        <span className="mt-1 block truncate font-mono text-xs text-muted">
          {machineLabel(listing.machineType)} · {formatRows(listing.rowCount)} rows · {listing.seller}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted md:hidden">
          {license} · {updated} · Agent {listing.agentId} · {listing.schema.length} fields
        </span>
      </span>
      <span className="hidden text-sm text-ink md:block">
        <span className="sr-only">License </span>
        {license}
      </span>
      <span className="hidden font-mono text-xs text-ink md:block">
        <span className="sr-only">Updated </span>
        {updated}
      </span>
      <span className="hidden font-mono text-xs text-ink md:block">
        <span className="sr-only">Agent </span>
        #{listing.agentId}
      </span>
      <span className="hidden font-mono text-xs text-ink md:block">
        <span className="sr-only">Fields </span>
        {listing.schema.length}
      </span>
      <span className="text-right font-mono text-sm font-medium text-ink">
        <span className="sr-only">Price </span>
        {formatMon(listing.priceWei)} <span className="font-medium text-muted">MON</span>
      </span>
    </Link>
  );
}
