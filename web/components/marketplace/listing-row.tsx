"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { DatasetCover } from "@/components/marketplace/dataset-cover";
import { licenseLabel, machineLabel, type PublicListing } from "@/lib/marketplace/catalog";
import { formatUtcDay } from "@/lib/marketplace/dashboard";
import { formatMon, formatRows } from "@/lib/marketplace/format";

const COLUMNS = "md:grid-cols-[3.25rem_minmax(14rem,22rem)_repeat(4,minmax(4.5rem,1fr))_5.75rem] md:gap-x-5";
const MOCK_NOTE = "Mock data. for UI only";

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
  if (listing.preview) return <MockListingRow listing={listing} />;
  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className={`group grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl px-3 py-3 hover:bg-lilac/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple ${COLUMNS}`}
    >
      <ListingBody listing={listing} />
    </Link>
  );
}

function MockListingRow({ listing }: { listing: PublicListing }) {
  const tipId = useId();
  const fine = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => {
      fine.current = query.matches;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <div className="group/mock relative">
      <button
        type="button"
        aria-describedby={tipId}
        className={`grid w-full cursor-help grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-x-4 rounded-2xl px-3 py-3 text-left hover:bg-lilac/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple ${COLUMNS}`}
        onMouseEnter={() => {
          if (fine.current) setOpen(true);
        }}
        onMouseLeave={() => {
          if (fine.current) setOpen(false);
        }}
        onFocus={() => {
          if (fine.current) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => {
          if (!fine.current) setOpen((value) => !value);
        }}
      >
        <ListingBody listing={listing} />
      </button>
      <p
        id={tipId}
        role="tooltip"
        className={`absolute top-2 left-16 z-20 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-sm ${open ? "block" : "hidden group-hover/mock:block group-focus-within/mock:block"}`}
      >
        {MOCK_NOTE}
      </p>
    </div>
  );
}

function ListingBody({ listing }: { listing: PublicListing }) {
  const license = licenseLabel(listing.license);
  const updated = formatUtcDay(listing.createdAt);
  return (
    <>
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
    </>
  );
}
