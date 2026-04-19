import express from "express";
import { randomUUID } from "node:crypto";
import { createExpressAuthMiddleware } from "@builderos/auth";
import { WorkflowEngine } from "@builderos/core";
import { createExpressMeteringMiddleware, setRequestUsageMetadata } from "@builderos/metering";
import type { AuthContext, RunWorkflowRequest, RunWorkflowResponse } from "@builderos/types";
import { createDefaultWorkflowRegistry } from "@builderos/workflows";
import { createPostgresApiKeyResolver } from "./adapters/postgresApiKeyResolver.js";
import { createPostgresUsageEventStore } from "./adapters/postgresUsageEventStore.js";
import { getPool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { ApiKeyRepository } from "./repos/apiKeyRepository.js";
import { UsageEventRepository } from "./repos/usageEventRepository.js";
import { createUsageRouter } from "./routes/usage.js";

const port = Number(process.env.PORT ?? 8787);
const app = express();

app.use(express.json({ limit: "1mb" }));

const pool = getPool();
const apiKeyRepository = new ApiKeyRepository(pool);
const usageEventRepository = new UsageEventRepository(pool);
const authResolver = createPostgresApiKeyResolver(apiKeyRepository);
const usageEventStore = createPostgresUsageEventStore(usageEventRepository);
const workflowEngine = new WorkflowEngine(createDefaultWorkflowRegistry());

app.use(createExpressMeteringMiddleware({ store: usageEventStore }));
app.use(createExpressAuthMiddleware({ resolver: authResolver }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "builderos-gateway" });
});

app.post("/v1/workflows/run", async (req, res) => {
  const body = req.body as Partial<RunWorkflowRequest>;

  if (!body.workflowName || typeof body.workflowName !== "string") {
    res.status(400).json({ error: "workflowName is required" });
    return;
  }

  const requestId = randomUUID();
  const auth = res.locals.auth as AuthContext;
  setRequestUsageMetadata(res, { workflowName: body.workflowName });

  try {
    const output = await workflowEngine.run(body.workflowName, body.input ?? {}, {
      requestId,
      mode: auth.mode
    });

    const response: RunWorkflowResponse = {
      requestId,
      workflowName: body.workflowName,
      mode: auth.mode,
      auth: {
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        keyPrefix: auth.keyPrefix,
        scopes: auth.scopes
      },
      output
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown workflow execution error";
    res.status(500).json({ requestId, error: message });
  }
});

app.use("/v1/usage", createUsageRouter(usageEventRepository));

async function bootstrap(): Promise<void> {
  if (process.env.BUILDER_OS_AUTO_MIGRATE === "true") {
    await runMigrations();
  }

  app.listen(port, () => {
    console.log(`Builder OS Gateway listening on http://localhost:${port}`);
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown gateway bootstrap error";
  console.error(message);
  process.exit(1);
});
