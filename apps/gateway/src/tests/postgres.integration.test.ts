import "../env/loadEnv.js";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import type { UsageEvent } from "@builderos/types";
import { createPostgresApiKeyResolver } from "../adapters/postgresApiKeyResolver.js";
import { createPostgresUsageEventStore } from "../adapters/postgresUsageEventStore.js";
import { hashApiKey } from "../db/hash.js";
import { ApiKeyRepository } from "../repos/apiKeyRepository.js";
import { UsageEventRepository } from "../repos/usageEventRepository.js";
import { WorkflowRunRepository } from "../repos/workflowRunRepository.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const integrationTest = databaseUrl ? test : test.skip;

function getMigrationsSql(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(currentDir, "../../migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => readFileSync(join(migrationsDir, file), "utf8")).join("\n\n");
}

async function withIsolatedSchema(
  callback: (ctx: { client: Client; schema: string }) => Promise<void>
): Promise<void> {
  const client = new Client({ connectionString: databaseUrl as string });
  const schema = `test_${randomUUID().replaceAll("-", "")}`;

  await client.connect();

  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(getMigrationsSql());
    await callback({ client, schema });
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
}

integrationTest("postgres api key resolver resolves active key by hash", async () => {
  await withIsolatedSchema(async ({ client }) => {
    const rawKey = "bos_ownera_1234567890";
    const apiKeyId = randomUUID();

    await client.query(
      `
        INSERT INTO api_keys (id, key_hash, key_prefix, owner_id, scopes, status)
        VALUES ($1, $2, $3, $4, $5::jsonb, 'active')
      `,
      [apiKeyId, hashApiKey(rawKey), rawKey.slice(0, 12), "ownera", JSON.stringify(["workflows:run"])]
    );

    const repository = new ApiKeyRepository(client);
    const resolver = createPostgresApiKeyResolver(repository);

    const resolved = await resolver.resolve(rawKey);
    assert.ok(resolved);
    assert.equal(resolved.apiKeyId, apiKeyId);
    assert.equal(resolved.ownerId, "ownera");
    assert.equal(resolved.mode, "hosted");

    const notFound = await resolver.resolve("bos_ownerb_0987654321");
    assert.equal(notFound, null);
  });
});

integrationTest("postgres usage event store writes usage event", async () => {
  await withIsolatedSchema(async ({ client }) => {
    const repository = new UsageEventRepository(client);
    const store = createPostgresUsageEventStore(repository);

    const event: UsageEvent = {
      id: randomUUID(),
      apiKeyId: randomUUID(),
      route: "/v1/workflows/run",
      workflowName: "echo",
      status: "success",
      unitType: "request",
      units: 1,
      latencyMs: 12,
      createdAt: new Date().toISOString()
    };

    await store.write(event);

    const result = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM usage_events");
    assert.equal(Number(result.rows[0]?.count ?? 0), 1);
  });
});

integrationTest("usage summary query returns total requests within range", async () => {
  await withIsolatedSchema(async ({ client }) => {
    const repository = new UsageEventRepository(client);
    const now = new Date("2026-01-20T00:00:00.000Z");

    const events: UsageEvent[] = [
      {
        id: randomUUID(),
        apiKeyId: "key-1",
        route: "/v1/workflows/run",
        workflowName: "echo",
        status: "success",
        unitType: "request",
        units: 1,
        latencyMs: 10,
        createdAt: new Date(now.getTime() - 60_000).toISOString()
      },
      {
        id: randomUUID(),
        apiKeyId: "key-2",
        route: "/v1/workflows/run",
        workflowName: "echo",
        status: "error",
        unitType: "request",
        units: 1,
        latencyMs: 20,
        createdAt: new Date(now.getTime() - 30_000).toISOString()
      },
      {
        id: randomUUID(),
        apiKeyId: "key-3",
        route: "/v1/workflows/run",
        workflowName: "echo",
        status: "success",
        unitType: "request",
        units: 1,
        latencyMs: 8,
        createdAt: new Date(now.getTime() - 86_400_000).toISOString()
      }
    ];

    for (const event of events) {
      await repository.insert(event);
    }

    const from = new Date(now.getTime() - 120_000).toISOString();
    const to = now.toISOString();
    const summary = await repository.getSummary(from, to);

    assert.equal(summary.totalRequests, 2);
    assert.equal(summary.from, from);
    assert.equal(summary.to, to);
  });
});

integrationTest("workflow run repository stores and lists runs by owner", async () => {
  await withIsolatedSchema(async ({ client }) => {
    const repository = new WorkflowRunRepository(client);
    const now = new Date().toISOString();

    await repository.insert({
      requestId: randomUUID(),
      workflowName: "echo",
      input: { message: "one" },
      output: { echoed: "one" },
      status: "success",
      mode: "hosted",
      apiKeyId: "key-a",
      ownerId: "owner-a",
      createdAt: now,
      completedAt: now
    });

    await repository.insert({
      requestId: randomUUID(),
      workflowName: "echo",
      input: { message: "two" },
      status: "error",
      errorMessage: "boom",
      mode: "hosted",
      apiKeyId: "key-b",
      ownerId: "owner-a",
      createdAt: now,
      completedAt: now
    });

    await repository.insert({
      requestId: randomUUID(),
      workflowName: "echo",
      input: { message: "other" },
      output: { echoed: "other" },
      status: "success",
      mode: "hosted",
      apiKeyId: "key-c",
      ownerId: "owner-b",
      createdAt: now,
      completedAt: now
    });

    const ownerRuns = await repository.listByOwner("owner-a", 10);
    assert.equal(ownerRuns.items.length, 2);
    assert.equal(ownerRuns.items[0]?.ownerId, "owner-a");
    assert.equal(ownerRuns.items[1]?.ownerId, "owner-a");

    const found = await repository.getByRequestId(ownerRuns.items[0]?.requestId as string, "owner-a");
    assert.ok(found);
    assert.equal(found?.ownerId, "owner-a");
  });
});

integrationTest("api key repository create/list/revoke lifecycle", async () => {
  await withIsolatedSchema(async ({ client }) => {
    const repository = new ApiKeyRepository(client);
    const ownerId = "owner-lifecycle";
    const rawKey = "bos_ownerlifecycle_abcdefghijklmnop";
    const id = randomUUID();

    await repository.create({
      id,
      keyHash: hashApiKey(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      ownerId,
      scopes: ["workflows:run", "usage:read"]
    });

    const listed = await repository.listByOwner(ownerId);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.id, id);
    assert.equal(listed[0]?.status, "active");

    const resolved = await repository.findActiveByHash(hashApiKey(rawKey));
    assert.ok(resolved);
    assert.equal(resolved?.id, id);

    const revoked = await repository.revokeById(id, ownerId);
    assert.equal(revoked, true);

    const afterRevoke = await repository.findActiveByHash(hashApiKey(rawKey));
    assert.equal(afterRevoke, null);
  });
});
