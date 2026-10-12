import { mkdirSync } from "node:fs";
import path from "node:path";

import { Pool, types, type PoolClient, type QueryResult } from "pg";

export type Store = {
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
  transaction<T>(fn: (tx: Store) => Promise<T>): Promise<T>;
};

const globalForStore = globalThis as { marketplaceStore?: Promise<Store> };

/** One store for the process. Postgres when DATABASE_URL is set, otherwise the local SQLite file. */
export function openStore(): Promise<Store> {
  if (!globalForStore.marketplaceStore) {
    const opening = (process.env.DATABASE_URL ? openPostgres(process.env.DATABASE_URL) : openSqlite()).catch((error: unknown) => {
      globalForStore.marketplaceStore = undefined;
      throw error;
    });
    globalForStore.marketplaceStore = opening;
  }
  return globalForStore.marketplaceStore;
}

async function openSqlite(): Promise<Store> {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "marketplace.db"));
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrateSqlite(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      name TEXT,
      payout TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      payload TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS agent_keys (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      wallet TEXT NOT NULL,
      prefix TEXT NOT NULL,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      revoked_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS agent_keys_live ON agent_keys (chain_id, agent_id) WHERE revoked_at IS NULL;
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      owner TEXT NOT NULL REFERENCES users(id),
      agent_id TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT NOT NULL,
      machine_type TEXT NOT NULL,
      license TEXT NOT NULL,
      price_wei TEXT NOT NULL,
      payout TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      schema_json TEXT NOT NULL,
      status TEXT NOT NULL,
      manifest_cid TEXT NOT NULL,
      data_cid TEXT NOT NULL,
      source TEXT NOT NULL,
      image_url TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      buyer TEXT NOT NULL REFERENCES users(id),
      tx_hash TEXT NOT NULL UNIQUE,
      price_wei TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  const columns = db.prepare("PRAGMA table_info(listings)").all() as { name: string }[];
  if (columns.length > 0 && !columns.some((column) => column.name === "image_url")) {
    db.exec("ALTER TABLE listings ADD COLUMN image_url TEXT");
  }
  return sqliteStore(db);
}

/** The first marketplace build keyed accounts by wallet address. Accounts are email now. */
function migrateSqlite(db: SqliteDatabase) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (columns.length === 0 || columns.some((column) => column.name === "email")) return;
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("DROP TABLE IF EXISTS purchases");
  db.exec("DROP TABLE IF EXISTS listings");
  db.exec("DROP TABLE IF EXISTS agent_keys");
  db.exec("DROP TABLE IF EXISTS challenges");
  db.exec("DROP TABLE IF EXISTS sessions");
  db.exec("DROP TABLE IF EXISTS users");
  db.exec("PRAGMA foreign_keys = ON");
}

function sqliteStore(db: SqliteDatabase): Store {
  const store: Store = {
    async get<T>(sql: string, ...params: unknown[]) {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, ...params: unknown[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, ...params: unknown[]) {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes) };
    },
    async transaction<T>(fn: (tx: Store) => Promise<T>) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(store);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return store;
}

// Postgres returns BIGINT as a string. Timestamps fit in a JS number.
types.setTypeParser(20, (value) => Number(value));

const POSTGRES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_sub TEXT UNIQUE,
    name TEXT,
    payout TEXT,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    payload TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    used_at BIGINT
  )`,
  `CREATE TABLE IF NOT EXISTS agent_keys (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    wallet TEXT NOT NULL,
    prefix TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    created_at BIGINT NOT NULL,
    last_used_at BIGINT,
    revoked_at BIGINT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS agent_keys_live ON agent_keys (chain_id, agent_id) WHERE revoked_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    owner TEXT NOT NULL REFERENCES users(id),
    agent_id TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    machine_type TEXT NOT NULL,
    license TEXT NOT NULL,
    price_wei TEXT NOT NULL,
    payout TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    schema_json TEXT NOT NULL,
    status TEXT NOT NULL,
    manifest_cid TEXT NOT NULL,
    data_cid TEXT NOT NULL,
    source TEXT NOT NULL,
    image_url TEXT,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES listings(id),
    buyer TEXT NOT NULL REFERENCES users(id),
    tx_hash TEXT NOT NULL UNIQUE,
    price_wei TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
];

async function openPostgres(connectionString: string): Promise<Store> {
  const pool = new Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 12_000,
    ssl: localDatabase(connectionString) ? undefined : { rejectUnauthorized: false },
  });
  pool.on("error", () => {
    // A dropped idle client should not take down the Next process. The next query reports its own error.
  });
  try {
    for (const statement of POSTGRES_SCHEMA) {
      await pool.query(statement);
    }
  } catch (error) {
    await pool.end();
    throw error;
  }
  return postgresStore(pool);
}

function localDatabase(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function postgresStore(pool: Pool): Store {
  return {
    get: (sql, ...params) => one<never>(pool.query(toPostgres(sql), params)),
    all: async (sql, ...params) => (await pool.query(toPostgres(sql), params)).rows,
    run: async (sql, ...params) => ({ changes: (await pool.query(toPostgres(sql), params)).rowCount ?? 0 }),
    transaction: (fn) => withClient(pool, fn),
  };
}

async function one<T>(query: Promise<QueryResult>): Promise<T | undefined> {
  const result = await query;
  return result.rows[0] as T | undefined;
}

async function withClient<T>(pool: Pool, fn: (tx: Store) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const tx = clientStore(client);
  try {
    await client.query("BEGIN");
    const result = await fn(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The original error is the one the caller needs.
    }
    throw error;
  } finally {
    client.release();
  }
}

function clientStore(client: PoolClient): Store {
  return {
    get: (sql, ...params) => one(client.query(toPostgres(sql), params)),
    all: async (sql, ...params) => (await client.query(toPostgres(sql), params)).rows,
    run: async (sql, ...params) => ({ changes: (await client.query(toPostgres(sql), params)).rowCount ?? 0 }),
    transaction: () => Promise.reject(new Error("A marketplace transaction is already open.")),
  };
}

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number | bigint };
  };
};

function toPostgres(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}
