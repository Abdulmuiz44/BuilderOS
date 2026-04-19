import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "./client.js";

function getMigrationsDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, "../../migrations");
}

function listMigrationFiles(migrationsDir: string): string[] {
  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = getMigrationsDir();
    const files = listMigrationFiles(migrationsDir);

    for (const fileName of files) {
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM schema_migrations WHERE id = $1",
        [fileName]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        continue;
      }

      const sql = readFileSync(join(migrationsDir, fileName), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [fileName]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied successfully");
      process.exit(0);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown migration error";
      console.error(message);
      process.exit(1);
    });
}
