import { randomUUID } from "node:crypto";
import type { AuthScope } from "@builderos/types";
import { getPool } from "./client.js";
import { getKeyPrefix, hashApiKey } from "./hash.js";

async function seedApiKey(): Promise<void> {
  const rawKey = process.env.BUILDER_OS_SEED_API_KEY;
  const ownerId = process.env.BUILDER_OS_SEED_OWNER_ID ?? "local-dev";
  const scopesEnv = process.env.BUILDER_OS_SEED_SCOPES;

  if (!rawKey) {
    throw new Error("BUILDER_OS_SEED_API_KEY is required");
  }

  const scopes = (scopesEnv
    ? scopesEnv.split(",").map((scope) => scope.trim()).filter(Boolean)
    : ["workflows:run"]) as AuthScope[];

  const pool = getPool();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);

  await pool.query(
    `
      INSERT INTO api_keys (id, key_hash, key_prefix, owner_id, scopes, status)
      VALUES ($1, $2, $3, $4, $5::jsonb, 'active')
      ON CONFLICT (key_hash) DO UPDATE
      SET key_prefix = EXCLUDED.key_prefix,
          owner_id = EXCLUDED.owner_id,
          scopes = EXCLUDED.scopes,
          status = 'active'
    `,
    [randomUUID(), keyHash, keyPrefix, ownerId, JSON.stringify(scopes)]
  );

  console.log(`Seeded API key for owner=${ownerId} prefix=${keyPrefix}`);
}

seedApiKey()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown seed error";
    console.error(message);
    process.exit(1);
  });
