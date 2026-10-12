import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getAddress, type Address } from "viem";

import type { LicenseId, ListingAccess, MachineType, PublicListing } from "@/lib/marketplace/catalog";
import { ipfsUrl } from "@/lib/marketplace/pinata";
import { openStore, type Store } from "@/lib/marketplace/store";

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  payout: Address | null;
  createdAt: number;
};

export type AgentKeyRow = {
  id: string;
  agentId: string;
  chainId: number;
  userId: string;
  wallet: Address;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
};

export type ListingRecord = PublicListing & {
  id: string;
  userId: string;
  status: string;
  manifestCid: string;
  dataCid: string;
  source: "owner" | "agent";
};

function database(): Promise<Store> {
  return openStore();
}

export async function createPasswordUser(input: { email: string; passwordHash: string; name: string | null }): Promise<UserRow> {
  const db = await database();
  const id = randomBytes(16).toString("hex");
  const now = Date.now();
  await db.run("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)", id, input.email, input.passwordHash, input.name, now);
  return mustUser(id);
}

export async function findLogin(email: string): Promise<{ id: string; passwordHash: string | null } | null> {
  const db = await database();
  const row = await db.get<{ id: string; password_hash: string | null }>("SELECT id, password_hash FROM users WHERE email = ?", email);
  return row ? { id: row.id, passwordHash: row.password_hash } : null;
}

export async function upsertGoogleUser(input: { sub: string; email: string; name: string | null }): Promise<UserRow> {
  const db = await database();
  const existingSub = await db.get<{ id: string }>("SELECT id FROM users WHERE google_sub = ?", input.sub);
  if (existingSub) return mustUser(existingSub.id);
  const existingEmail = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ?", input.email);
  if (existingEmail) {
    await db.run("UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL", input.sub, existingEmail.id);
    return mustUser(existingEmail.id);
  }
  const id = randomBytes(16).toString("hex");
  await db.run("INSERT INTO users (id, email, google_sub, name, created_at) VALUES (?, ?, ?, ?, ?)", id, input.email, input.sub, input.name, Date.now());
  return mustUser(id);
}

export async function getUser(id: string): Promise<UserRow | null> {
  const db = await database();
  const row = await db.get<{ id: string }>("SELECT id FROM users WHERE id = ?", id);
  return row ? mustUser(row.id) : null;
}

export async function updateUser(id: string, input: { name: string | null; payout: Address | null }): Promise<UserRow> {
  const db = await database();
  await db.run("UPDATE users SET name = ?, payout = ? WHERE id = ?", input.name, input.payout?.toLowerCase() ?? null, id);
  return mustUser(id);
}

export async function createSession(userId: string): Promise<{ id: string; expiresAt: number }> {
  const db = await database();
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
  await db.run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", id, userId, expiresAt);
  return { id, expiresAt };
}

export async function readSession(id: string): Promise<UserRow | null> {
  const db = await database();
  const row = await db.get<{ user_id: string; expires_at: number }>("SELECT user_id, expires_at FROM sessions WHERE id = ?", id);
  if (!row || row.expires_at < Date.now()) {
    if (row) await db.run("DELETE FROM sessions WHERE id = ?", id);
    return null;
  }
  return mustUser(row.user_id);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await database();
  await db.run("DELETE FROM sessions WHERE id = ?", id);
}

export type ChallengeKind = "key";

export function challengeId(): string {
  return randomBytes(16).toString("hex");
}

export async function createChallenge(id: string, kind: ChallengeKind, message: string, payload: unknown): Promise<{ id: string; message: string }> {
  const db = await database();
  const now = Date.now();
  await db.run("DELETE FROM challenges WHERE expires_at < ?", now);
  await db.run("INSERT INTO challenges (id, kind, message, payload, expires_at) VALUES (?, ?, ?, ?, ?)", id, kind, message, JSON.stringify(payload), now + 10 * 60 * 1000);
  return { id, message };
}

export async function consumeChallenge<T>(id: string, kind: ChallengeKind): Promise<{ message: string; payload: T } | null> {
  const db = await database();
  const now = Date.now();
  const result = await db.run("UPDATE challenges SET used_at = ? WHERE id = ? AND kind = ? AND used_at IS NULL AND expires_at > ?", now, id, kind, now);
  if (result.changes !== 1) return null;
  const row = await db.get<{ message: string; payload: string }>("SELECT message, payload FROM challenges WHERE id = ?", id);
  if (!row) return null;
  return { message: row.message, payload: JSON.parse(row.payload) as T };
}

export async function issueAgentKey(userId: string, wallet: Address, chainId: number, agentId: string): Promise<{ secret: string; row: AgentKeyRow }> {
  const db = await database();
  const secret = `kvm_${randomBytes(32).toString("base64url")}`;
  const now = Date.now();
  const row: AgentKeyRow = {
    id: randomBytes(16).toString("hex"),
    agentId,
    chainId,
    userId,
    wallet,
    prefix: secret.slice(0, 12),
    createdAt: now,
    lastUsedAt: null,
  };
  await db.transaction(async (tx) => {
    await tx.run("UPDATE agent_keys SET revoked_at = ? WHERE chain_id = ? AND agent_id = ? AND revoked_at IS NULL", now, chainId, agentId);
    await tx.run(
      "INSERT INTO agent_keys (id, agent_id, chain_id, user_id, wallet, prefix, hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      row.id,
      agentId,
      chainId,
      userId,
      wallet.toLowerCase(),
      row.prefix,
      hashSecret(secret),
      now,
    );
  });
  return { secret, row };
}

export async function listAgentKeys(userId: string): Promise<AgentKeyRow[]> {
  const db = await database();
  const rows = await db.all<KeySql>(
    "SELECT id, agent_id, chain_id, user_id, wallet, prefix, created_at, last_used_at FROM agent_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC",
    userId,
  );
  return rows.map(mapKey);
}

export async function revokeAgentKey(userId: string, id: string): Promise<boolean> {
  const db = await database();
  const result = await db.run("UPDATE agent_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL", Date.now(), id, userId);
  return result.changes === 1;
}

export async function authenticateAgentKey(secret: string): Promise<{ id: string; userId: string; wallet: Address; agentId: string; chainId: number } | null> {
  if (!secret.startsWith("kvm_")) return null;
  const db = await database();
  const presented = Buffer.from(hashSecret(secret), "hex");
  const row = await db.get<{ id: string; agent_id: string; chain_id: number; user_id: string; wallet: string; hash: string }>(
    "SELECT id, agent_id, chain_id, user_id, wallet, hash FROM agent_keys WHERE hash = ? AND revoked_at IS NULL",
    hashSecret(secret),
  );
  if (!row) return null;
  const stored = Buffer.from(row.hash, "hex");
  if (stored.length !== presented.length || !timingSafeEqual(stored, presented)) return null;
  await db.run("UPDATE agent_keys SET last_used_at = ? WHERE id = ?", Date.now(), row.id);
  return { id: row.id, userId: row.user_id, wallet: getAddress(row.wallet), agentId: row.agent_id, chainId: row.chain_id };
}

/** Drop keys whose recorded wallet is no longer the NFT owner. The current owner's key stays. */
export async function revokeStaleKeys(chainId: number, agentId: string, currentOwner: Address): Promise<void> {
  const db = await database();
  await db.run("UPDATE agent_keys SET revoked_at = ? WHERE chain_id = ? AND agent_id = ? AND revoked_at IS NULL AND wallet != ?", Date.now(), chainId, agentId, currentOwner.toLowerCase());
}

export async function insertListing(input: {
  userId: string;
  meta: {
    chainId: number;
    agentId: string;
    title: string;
    summary: string;
    description: string;
    machineType: MachineType;
    license: LicenseId;
    priceWei: bigint;
    payout: Address;
  };
  schema: string[];
  rowCount: number;
  manifestCid: string;
  dataCid: string;
  imageUrl: string | null;
  source: "owner" | "agent";
}): Promise<ListingRecord> {
  const db = await database();
  const id = randomBytes(16).toString("hex");
  const slug = await uniqueSlug(input.meta.title);
  const now = Date.now();
  await db.run(
    `INSERT INTO listings (
      id, slug, owner, agent_id, chain_id, title, summary, description, machine_type, license,
      price_wei, payout, row_count, schema_json, status, manifest_cid, data_cid, source, image_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?, ?, ?, ?, ?)`,
    id,
    slug,
    input.userId,
    input.meta.agentId,
    input.meta.chainId,
    input.meta.title,
    input.meta.summary,
    input.meta.description,
    input.meta.machineType,
    input.meta.license,
    input.meta.priceWei.toString(),
    input.meta.payout.toLowerCase(),
    input.rowCount,
    JSON.stringify(input.schema),
    input.manifestCid,
    input.dataCid,
    input.source,
    input.imageUrl,
    now,
  );
  const listing = await getListing(slug);
  if (!listing) throw new Error("the listing was not stored");
  return listing;
}

export async function listPublicListings(input: { q: string; machine: string; sort: string }): Promise<PublicListing[]> {
  const db = await database();
  const machine = input.machine;
  const q = input.q.replace(/[%_]/g, "").trim().slice(0, 80);
  const like = `%${q.toLowerCase()}%`;
  const order = input.sort === "price" ? "length(listings.price_wei) ASC, listings.price_wei ASC" : input.sort === "rows" ? "listings.row_count DESC" : "listings.created_at DESC";
  const rows = await db.all<SqlListing>(
    `SELECT listings.*, COALESCE(NULLIF(users.name, ''), users.email) AS seller
     FROM listings JOIN users ON users.id = listings.owner
     WHERE listings.status = 'live'
       AND (? = '' OR listings.machine_type = ?)
       AND (? = '' OR lower(listings.title) LIKE ? OR lower(listings.summary) LIKE ?)
     ORDER BY ${order}
     LIMIT 60`,
    machine,
    machine,
    q,
    like,
    like,
  );
  return rows.map((row) => toPublic(mapListing(row)));
}

export async function getSale(slug: string): Promise<{ id: string; priceWei: string; payout: Address; chainId: number; preview: false } | null> {
  const listing = await getListing(slug);
  if (!listing || listing.status !== "live") return null;
  return {
    id: listing.id,
    priceWei: listing.priceWei,
    payout: listing.payout,
    chainId: listing.chainId,
    preview: false,
  };
}

export async function getListingFiles(slug: string): Promise<{ manifestCid: string; rowCount: number; agentId: string; chainId: number } | null> {
  const listing = await getListing(slug);
  if (!listing || listing.status !== "live") return null;
  return {
    manifestCid: listing.manifestCid,
    rowCount: listing.rowCount,
    agentId: listing.agentId,
    chainId: listing.chainId,
  };
}

export async function getPublicListing(slug: string): Promise<PublicListing | null> {
  const listing = await getListing(slug);
  if (!listing || listing.status !== "live") return null;
  return toPublic(listing);
}

export async function getOwnedListing(slug: string, userId: string): Promise<ListingRecord | null> {
  const listing = await getListing(slug);
  if (!listing || listing.userId !== userId) return null;
  return listing;
}

export async function listOwnedListings(userId: string): Promise<ListingRecord[]> {
  const db = await database();
  const rows = await db.all<SqlListing>(
    `SELECT listings.*, COALESCE(NULLIF(users.name, ''), users.email) AS seller
     FROM listings JOIN users ON users.id = listings.owner
     WHERE listings.owner = ? ORDER BY listings.created_at DESC`,
    userId,
  );
  return rows.map(mapListing);
}

export async function findPurchase(listingId: string, userId: string): Promise<{ txHash: string; createdAt: number } | null> {
  const db = await database();
  const row = await db.get<{ tx_hash: string; created_at: number }>("SELECT tx_hash, created_at FROM purchases WHERE listing_id = ? AND buyer = ?", listingId, userId);
  return row ? { txHash: row.tx_hash, createdAt: row.created_at } : null;
}

export async function insertPurchase(listingId: string, userId: string, txHash: string, priceWei: bigint): Promise<void> {
  const db = await database();
  await db.run("INSERT INTO purchases (id, listing_id, buyer, tx_hash, price_wei, created_at) VALUES (?, ?, ?, ?, ?, ?)", randomBytes(16).toString("hex"), listingId, userId, txHash.toLowerCase(), priceWei.toString(), Date.now());
}

export async function txAlreadyUsed(txHash: string): Promise<boolean> {
  const db = await database();
  const row = await db.get<{ id: string }>("SELECT id FROM purchases WHERE tx_hash = ?", txHash.toLowerCase());
  return Boolean(row);
}

export type PurchaseView = PublicListing & { txHash: string; boughtAt: number; access: ListingAccess };

export type SaleView = {
  slug: string;
  title: string;
  machineType: MachineType;
  priceWei: string;
  soldAt: number;
};

/** Purchases of datasets this account listed. Price is what the buyer paid. */
export async function listSales(userId: string): Promise<SaleView[]> {
  const db = await database();
  const rows = await db.all<{ slug: string; title: string; machine_type: string; price_wei: string; created_at: number }>(
    `SELECT listings.slug, listings.title, listings.machine_type, purchases.price_wei, purchases.created_at
     FROM purchases
     JOIN listings ON listings.id = purchases.listing_id
     WHERE listings.owner = ?
     ORDER BY purchases.created_at DESC`,
    userId,
  );
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    machineType: row.machine_type as MachineType,
    priceWei: row.price_wei,
    soldAt: row.created_at,
  }));
}

export async function listPurchases(userId: string): Promise<PurchaseView[]> {
  const db = await database();
  const rows = await db.all<SqlListing & { tx_hash: string; bought_at: number }>(
    `SELECT listings.*, COALESCE(NULLIF(users.name, ''), users.email) AS seller, purchases.tx_hash, purchases.created_at AS bought_at
     FROM purchases
     JOIN listings ON listings.id = purchases.listing_id
     JOIN users ON users.id = listings.owner
     WHERE purchases.buyer = ?
     ORDER BY purchases.created_at DESC`,
    userId,
  );
  return rows.map((row) => {
    const listing = mapListing(row);
    return { ...toPublic(listing), txHash: row.tx_hash, boughtAt: row.bought_at, access: accessFor(listing) };
  });
}

export async function accessForListing(slug: string, userId: string | null): Promise<ListingAccess | null> {
  const listing = await getListing(slug);
  if (!listing || !userId) return null;
  const owner = listing.userId === userId;
  const bought = Boolean(await findPurchase(listing.id, userId));
  if (!owner && !bought) return null;
  return accessFor(listing);
}

export async function listingId(slug: string): Promise<string | null> {
  return (await getListing(slug))?.id ?? null;
}

async function getListing(slug: string): Promise<ListingRecord | null> {
  const db = await database();
  const row = await db.get<SqlListing>(
    `SELECT listings.*, COALESCE(NULLIF(users.name, ''), users.email) AS seller
     FROM listings JOIN users ON users.id = listings.owner
     WHERE listings.slug = ?`,
    slug,
  );
  return row ? mapListing(row) : null;
}

function accessFor(listing: ListingRecord): ListingAccess {
  return {
    dataCid: listing.dataCid,
    manifestCid: listing.manifestCid,
    dataUrl: ipfsUrl(listing.dataCid),
    manifestUrl: ipfsUrl(listing.manifestCid),
  };
}

async function uniqueSlug(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "dataset";
  const db = await database();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await db.get<{ id: string }>("SELECT id FROM listings WHERE slug = ?", slug);
    if (!existing) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

async function mustUser(id: string): Promise<UserRow> {
  const db = await database();
  const row = await db.get<{ id: string; email: string; name: string | null; payout: string | null; created_at: number }>(
    "SELECT id, email, name, payout, created_at FROM users WHERE id = ?",
    id,
  );
  if (!row) throw new Error("the marketplace user was not stored");
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    payout: row.payout ? getAddress(row.payout) : null,
    createdAt: row.created_at,
  };
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

type KeySql = {
  id: string;
  agent_id: string;
  chain_id: number;
  user_id: string;
  wallet: string;
  prefix: string;
  created_at: number;
  last_used_at: number | null;
};

function mapKey(row: KeySql): AgentKeyRow {
  return {
    id: row.id,
    agentId: row.agent_id,
    chainId: row.chain_id,
    userId: row.user_id,
    wallet: getAddress(row.wallet),
    prefix: row.prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

type SqlListing = {
  id: string;
  slug: string;
  owner: string;
  agent_id: string;
  chain_id: number;
  title: string;
  summary: string;
  description: string;
  machine_type: string;
  license: string;
  price_wei: string;
  payout: string;
  row_count: number;
  schema_json: string;
  status: string;
  manifest_cid: string;
  data_cid: string;
  source: string;
  image_url: string | null;
  created_at: number;
  seller: string;
};

function mapListing(row: SqlListing): ListingRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    machineType: row.machine_type as MachineType,
    license: row.license as LicenseId,
    priceWei: row.price_wei,
    payout: getAddress(row.payout),
    agentId: row.agent_id,
    chainId: row.chain_id,
    seller: row.seller,
    image: row.image_url,
    userId: row.owner,
    rowCount: row.row_count,
    schema: JSON.parse(row.schema_json) as string[],
    createdAt: row.created_at,
    status: row.status,
    manifestCid: row.manifest_cid,
    dataCid: row.data_cid,
    source: row.source === "agent" ? "agent" : "owner",
  };
}

function toPublic(listing: ListingRecord): PublicListing {
  return {
    slug: listing.slug,
    title: listing.title,
    summary: listing.summary,
    description: listing.description,
    machineType: listing.machineType,
    license: listing.license,
    priceWei: listing.priceWei,
    payout: listing.payout,
    agentId: listing.agentId,
    chainId: listing.chainId,
    seller: listing.seller,
    image: listing.image,
    rowCount: listing.rowCount,
    schema: listing.schema,
    createdAt: listing.createdAt,
  };
}
