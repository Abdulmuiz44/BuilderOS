import "./env/loadEnv.js";
import express from "express";
import { createExpressAuthMiddleware } from "@builderos/auth";
import { WorkflowEngine } from "@builderos/core";
import { createExpressMeteringMiddleware } from "@builderos/metering";
import { createDefaultWorkflowRegistry } from "@builderos/workflows";
import { createPostgresApiKeyResolver } from "./adapters/postgresApiKeyResolver.js";
import { createPostgresUsageEventStore } from "./adapters/postgresUsageEventStore.js";
import { getPool } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { ApiKeyRepository } from "./repos/apiKeyRepository.js";
import { UsageEventRepository } from "./repos/usageEventRepository.js";
import { WorkflowRunRepository } from "./repos/workflowRunRepository.js";
import { createApiKeysRouter } from "./routes/apiKeys.js";
import { createUsageRouter } from "./routes/usage.js";
import { createWorkflowRunsRouter } from "./routes/workflowRuns.js";

const port = Number(process.env.PORT ?? 8787);
const app = express();

app.use(express.json({ limit: "1mb" }));

const pool = getPool();
const apiKeyRepository = new ApiKeyRepository(pool);
const usageEventRepository = new UsageEventRepository(pool);
const workflowRunRepository = new WorkflowRunRepository(pool);
const authResolver = createPostgresApiKeyResolver(apiKeyRepository);
const usageEventStore = createPostgresUsageEventStore(usageEventRepository);
const workflowEngine = new WorkflowEngine(createDefaultWorkflowRegistry());

app.use(createExpressMeteringMiddleware({ store: usageEventStore }));
app.use(createExpressAuthMiddleware({ resolver: authResolver }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "builderos-gateway" });
});

app.use("/v1/workflows", createWorkflowRunsRouter(workflowEngine, workflowRunRepository));
app.use("/v1/usage", createUsageRouter(usageEventRepository));
app.use("/v1/api-keys", createApiKeysRouter(apiKeyRepository));

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
