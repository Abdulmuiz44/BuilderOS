import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createDefaultWorkflowRegistry } from "@builderos/workflows";
import { WorkflowEngine } from "@builderos/core";
import type { AuthContext, AuthScope } from "@builderos/types";
import { createApiKeysRouter } from "../routes/apiKeys.js";
import { createWorkflowRunsRouter } from "../routes/workflowRuns.js";

type TestResponse = {
  status: number;
  json: unknown;
};

type FakeApiKey = {
  id: string;
  key_prefix: string;
  owner_id: string;
  scopes: AuthScope[];
  status: "active" | "inactive";
  created_at: string;
};

function createAuthContext(scopes: AuthScope[]): AuthContext {
  return {
    apiKeyId: "key_test",
    keyPrefix: "bos_owner_12",
    ownerId: "owner-test",
    scopes,
    mode: "hosted"
  };
}

async function withServer(
  app: express.Express,
  callback: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => {
    server.once("listening", () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await callback(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function sendJson(
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<TestResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return {
    status: response.status,
    json: (await response.json()) as unknown
  };
}

test("api keys route enforces api_keys:manage scope", async () => {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.auth = createAuthContext(["workflows:run"]);
    next();
  });

  const repo = {
    async listByOwner() {
      return [] as FakeApiKey[];
    },
    async create() {
      return;
    },
    async revokeById() {
      return false;
    }
  };

  app.use("/v1/api-keys", createApiKeysRouter(repo as never));

  await withServer(app, async (baseUrl) => {
    const response = await sendJson(baseUrl, "GET", "/v1/api-keys");
    assert.equal(response.status, 403);
  });
});

test("api keys route create/list/revoke lifecycle", async () => {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.auth = createAuthContext(["workflows:run", "api_keys:manage", "usage:read"]);
    next();
  });

  const keys = new Map<string, FakeApiKey>();

  const repo = {
    async listByOwner(ownerId: string) {
      return Array.from(keys.values()).filter((item) => item.owner_id === ownerId);
    },
    async create(input: {
      id: string;
      keyPrefix: string;
      ownerId: string;
      scopes: AuthScope[];
    }) {
      keys.set(input.id, {
        id: input.id,
        key_prefix: input.keyPrefix,
        owner_id: input.ownerId,
        scopes: input.scopes,
        status: "active",
        created_at: new Date().toISOString()
      });
    },
    async revokeById(id: string, ownerId: string) {
      const existing = keys.get(id);
      if (!existing || existing.owner_id !== ownerId || existing.status !== "active") {
        return false;
      }
      existing.status = "inactive";
      keys.set(id, existing);
      return true;
    }
  };

  app.use("/v1/api-keys", createApiKeysRouter(repo as never));

  await withServer(app, async (baseUrl) => {
    const created = await sendJson(baseUrl, "POST", "/v1/api-keys", {
      scopes: ["workflows:run", "usage:read"]
    });

    assert.equal(created.status, 201);
    const createdBody = created.json as { id: string; rawKey: string; status: string };
    assert.ok(createdBody.id);
    assert.ok(createdBody.rawKey.startsWith("bos_"));
    assert.equal(createdBody.status, "active");

    const listed = await sendJson(baseUrl, "GET", "/v1/api-keys");
    assert.equal(listed.status, 200);
    const listBody = listed.json as { items: Array<{ id: string }> };
    assert.equal(listBody.items.length, 1);
    assert.equal(listBody.items[0]?.id, createdBody.id);

    const revoked = await sendJson(baseUrl, "POST", `/v1/api-keys/${createdBody.id}/revoke`);
    assert.equal(revoked.status, 200);
  });
});

test("workflow runs list and replay endpoints", async () => {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.locals.auth = createAuthContext(["workflows:run"]);
    next();
  });

  const workflowEngine = new WorkflowEngine(createDefaultWorkflowRegistry());
  const runs = new Map<
    string,
    {
      requestId: string;
      workflowName: string;
      input: Record<string, unknown>;
      status: "success" | "error";
      mode: "hosted" | "local";
      apiKeyId: string;
      ownerId: string;
      createdAt: string;
      completedAt: string;
      output?: Record<string, unknown>;
      errorMessage?: string;
    }
  >();

  const repo = {
    async listByOwner(ownerId: string, limit: number) {
      const items = Array.from(runs.values())
        .filter((item) => item.ownerId === ownerId)
        .slice(0, limit);
      return { items, nextCursor: undefined };
    },
    async getByRequestId(requestId: string, ownerId: string) {
      const record = runs.get(requestId);
      if (!record || record.ownerId !== ownerId) {
        return null;
      }
      return record;
    },
    async insert(item: {
      requestId: string;
      workflowName: string;
      input: Record<string, unknown>;
      status: "success" | "error";
      mode: "hosted" | "local";
      apiKeyId: string;
      ownerId: string;
      createdAt: string;
      completedAt: string;
      output?: Record<string, unknown>;
      errorMessage?: string;
    }) {
      runs.set(item.requestId, item);
    }
  };

  app.use("/v1/workflows", createWorkflowRunsRouter(workflowEngine, repo as never));

  await withServer(app, async (baseUrl) => {
    const run = await sendJson(baseUrl, "POST", "/v1/workflows/run", {
      workflowName: "echo",
      input: { message: "hello" }
    });
    assert.equal(run.status, 200);
    const runBody = run.json as { requestId: string };
    assert.ok(runBody.requestId);

    const listed = await sendJson(baseUrl, "GET", "/v1/workflows?limit=5");
    assert.equal(listed.status, 200);
    const listBody = listed.json as { items: Array<{ requestId: string }> };
    assert.equal(listBody.items.length, 1);
    assert.equal(listBody.items[0]?.requestId, runBody.requestId);

    const replay = await sendJson(baseUrl, "POST", `/v1/workflows/${runBody.requestId}/replay`);
    assert.equal(replay.status, 200);
    const replayBody = replay.json as { requestId: string };
    assert.ok(replayBody.requestId);
    assert.notEqual(replayBody.requestId, runBody.requestId);
  });
});
