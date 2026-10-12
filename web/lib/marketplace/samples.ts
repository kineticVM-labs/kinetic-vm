import { getAddress, keccak256, parseEther, toBytes } from "viem";

import type { PublicListing } from "@/lib/marketplace/catalog";
import { listPublicListings } from "@/lib/marketplace/db";

const PAYOUT = getAddress("0x1111111111111111111111111111111111111111");

const COVERS: Record<string, string> = {
  "night-shift-picks": "/machines/arm-industrial.webp",
  "marina-vend-log": "/machines/vending-street.webp",
  "kaduna-survey-passes": "/machines/drone-quad.webp",
  "rotterdam-dock-miles": "/machines/amr-warehouse.webp",
  "lobby-service-hours": "/machines/humanoid-service.webp",
};

export type CheckRow = {
  index: number;
  paramsHash: `0x${string}`;
  requestHash: `0x${string}`;
};

export type SampleListing = PublicListing & {
  preview: true;
  checks: CheckRow[];
  device: `0x${string}`;
};

const samples: SampleListing[] = [
  sample({
    slug: "night-shift-picks",
    title: "Night shift picks",
    summary: "Pick-and-place cycles from an industrial arm, including misses and retries.",
    description:
      "One line is one cycle on line 4 between 22:00 and 06:00. The arm records the SKU, the bin it reached into, and whether the grip held. Failed picks stay in the file so a model can learn the misses, not only the clean cycles.\n\nThe device signed each line before the row was written. Buyers can check those signatures on Monad before paying.",
    machineType: "arm",
    license: "commercial",
    price: "40",
    agentId: "92",
    seller: "Line North",
    rowCount: 22041,
    schema: ["action", "bin", "grip", "sku", "cycle"],
    createdAt: Date.UTC(2026, 9, 9),
  }),
  sample({
    slug: "marina-vend-log",
    title: "Marina vend log",
    summary: "Thirty days of drink sales from street kiosks, with slot, price, and time of day.",
    description:
      "Six vending machines along one waterfront. Each row is a completed vend: which slot moved, what it cost, and the hour it sold. Restocks are separate rows, so the file shows both demand and when a slot went empty.\n\nPrices are in the local currency recorded by the machine, not converted.",
    machineType: "vending",
    license: "research",
    price: "12",
    agentId: "151",
    seller: "Harbour Kiosks",
    rowCount: 4812,
    schema: ["hour", "price", "sku", "slot", "sold"],
    createdAt: Date.UTC(2026, 9, 8),
  }),
  sample({
    slug: "kaduna-survey-passes",
    title: "Kaduna survey passes",
    summary: "Crop passes from a quadcopter: plot, altitude, and the reading it took.",
    description:
      "A mapping drone flew the same plots on repeat. Each row is one pass over a plot, with altitude and the sensor reading stored on the device. Passes that the drone aborted are included and marked.\n\nThe file is the flight log, not the imagery.",
    machineType: "drone",
    license: "research",
    price: "18",
    agentId: "302",
    seller: "Field Survey",
    rowCount: 1860,
    schema: ["aborted", "altitude", "plot", "reading"],
    createdAt: Date.UTC(2026, 9, 7),
  }),
  sample({
    slug: "rotterdam-dock-miles",
    title: "Rotterdam dock miles",
    summary: "Distance, stops, and handoffs from warehouse robots on one dock.",
    description:
      "Mobile robots moving pallets between the dock and the racking. A row is a completed trip: meters travelled, stops, and which station took the handoff. Idle time is not in this file.\n\nUseful for training a router, or for auditing how often a station was blocked.",
    machineType: "amr",
    license: "commercial",
    price: "64",
    agentId: "219",
    seller: "Dock 3",
    rowCount: 120440,
    schema: ["handoff", "meters", "station", "stops"],
    createdAt: Date.UTC(2026, 9, 6),
  }),
  sample({
    slug: "lobby-service-hours",
    title: "Lobby service hours",
    summary: "Greetings, directions, and unanswered questions from a lobby humanoid.",
    description:
      "A service robot on a weekday lobby desk. Each row is one interaction: what was asked, whether it answered, and how long the person stayed. Names and faces are not in the file.\n\nUnanswered questions are the useful part if you are looking for gaps.",
    machineType: "humanoid",
    license: "research",
    price: "9",
    agentId: "404",
    seller: "Lobby Desk",
    rowCount: 3902,
    schema: ["answered", "duration", "request", "weekday"],
    createdAt: Date.UTC(2026, 9, 5),
  }),
  sample({
    slug: "cold-aisle-readings",
    title: "Cold aisle readings",
    summary: "Temperature and door events from sensors on a cold-storage aisle.",
    description:
      "Fixed sensors on one aisle, sampled when the reading moved or a door opened. Each row has the sensor, the celsius reading, and whether a door was open at that moment.\n\nThe file is the exception log plus a steady sample, not a video stream.",
    machineType: "sensor",
    license: "audit",
    price: "7",
    agentId: "184",
    seller: "Cold Chain",
    rowCount: 88012,
    schema: ["celsius", "door", "sensor"],
    createdAt: Date.UTC(2026, 9, 4),
  }),
];

function sample(input: {
  slug: string;
  title: string;
  summary: string;
  description: string;
  machineType: SampleListing["machineType"];
  license: SampleListing["license"];
  price: string;
  agentId: string;
  seller: string;
  rowCount: number;
  schema: string[];
  createdAt: number;
}): SampleListing {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    description: input.description,
    machineType: input.machineType,
    license: input.license,
    priceWei: parseEther(input.price).toString(),
    payout: PAYOUT,
    agentId: input.agentId,
    chainId: 10143,
    seller: input.seller,
    image: COVERS[input.slug] ?? null,
    preview: true,
    rowCount: input.rowCount,
    schema: input.schema,
    createdAt: input.createdAt,
    device: mockDevice(input.slug),
    checks: Array.from({ length: 8 }, (_, index) => {
      const n = index + 1;
      return {
        index: n,
        paramsHash: keccak256(toBytes(`${input.slug}:${n}:line`)),
        requestHash: keccak256(toBytes(`${input.slug}:${n}:request`)),
      };
    }),
  };
}

export function getSample(slug: string): SampleListing | null {
  return samples.find((item) => item.slug === slug) ?? null;
}

export async function listCatalog(input: { q: string; machine: string; sort: string }): Promise<PublicListing[]> {
  const real = await listPublicListings(input);
  const taken = new Set(real.map((item) => item.slug));
  const q = input.q.trim().toLowerCase();
  const extras = samples
    .filter((item) => {
      if (taken.has(item.slug)) return false;
      if (input.machine && item.machineType !== input.machine) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q);
    })
    .map(toCatalog);
  const rows = [...real, ...extras];
  if (input.sort === "price") {
    rows.sort((a, b) => compareWei(a.priceWei, b.priceWei));
  } else if (input.sort === "rows") {
    rows.sort((a, b) => b.rowCount - a.rowCount);
  } else {
    rows.sort((a, b) => b.createdAt - a.createdAt);
  }
  return rows;
}

function toCatalog(item: SampleListing): PublicListing {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    description: item.description,
    machineType: item.machineType,
    license: item.license,
    priceWei: item.priceWei,
    payout: item.payout,
    agentId: item.agentId,
    chainId: item.chainId,
    seller: item.seller,
    image: item.image,
    preview: true,
    rowCount: item.rowCount,
    schema: item.schema,
    createdAt: item.createdAt,
  };
}

function mockDevice(slug: string): `0x${string}` {
  const hash = keccak256(toBytes(`kinetic-sample-device:${slug}`));
  return getAddress(`0x${hash.slice(-40)}`);
}

function compareWei(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
