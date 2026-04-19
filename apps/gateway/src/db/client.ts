import { Pool } from "pg";

let pool: Pool | null = null;

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for gateway Postgres persistence");
  }

  return databaseUrl;
}

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: getDatabaseUrl(),
    max: Number(process.env.PGPOOL_MAX ?? 10)
  });

  return pool;
}
