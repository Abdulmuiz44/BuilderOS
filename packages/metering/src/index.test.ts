import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";
import {
  createExpressMeteringMiddleware,
  createInMemoryUsageEventStore,
  setRequestUsageMetadata
} from "./index.js";

class MockResponse extends EventEmitter {
  public locals: Record<string, unknown> = {};
  public statusCode = 200;
}

test("metering middleware emits one structured usage event per request", async () => {
  const store = createInMemoryUsageEventStore();
  const middleware = createExpressMeteringMiddleware({ store });

  const req = {
    path: "/v1/workflows/run",
    method: "POST",
    body: {
      workflowName: "echo"
    }
  } as Request;

  const res = new MockResponse() as unknown as Response;
  res.locals.auth = {
    apiKeyId: "key_abc123",
    ownerId: "acme",
    keyPrefix: "bos_acme_123",
    scopes: ["workflows:run"],
    mode: "hosted"
  };

  const next: NextFunction = () => undefined;
  middleware(req, res, next);

  setRequestUsageMetadata(res, { workflowName: "echo" });
  res.statusCode = 200;
  res.emit("finish");

  await new Promise((resolve) => setImmediate(resolve));

  const snapshot = store.snapshot();
  assert.equal(snapshot.total, 1);

  const [event] = snapshot.events;
  assert.ok(event);
  assert.equal(event.apiKeyId, "key_abc123");
  assert.equal(event.route, "/v1/workflows/run");
  assert.equal(event.workflowName, "echo");
  assert.equal(event.status, "success");
  assert.equal(event.unitType, "request");
  assert.equal(event.units, 1);
  assert.ok(event.id.length > 0);
  assert.ok(event.latencyMs >= 0);
});
