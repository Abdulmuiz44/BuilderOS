import express from "express";
import { randomUUID } from "node:crypto";
import { createExpressAuthMiddleware } from "@builderos/auth";
import { WorkflowEngine } from "@builderos/core";
import {
  createExpressMeteringMiddleware,
  createInMemoryMeterSink
} from "@builderos/metering";
import type { RunWorkflowRequest, RunWorkflowResponse } from "@builderos/types";
import { createDefaultWorkflowRegistry } from "@builderos/workflows";

const port = Number(process.env.PORT ?? 8787);
const app = express();

app.use(express.json({ limit: "1mb" }));

const meterSink = createInMemoryMeterSink();
const workflowEngine = new WorkflowEngine(createDefaultWorkflowRegistry());

app.use(createExpressAuthMiddleware());
app.use(createExpressMeteringMiddleware({ sink: meterSink }));

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
  const principal = res.locals.auth;

  try {
    const output = await workflowEngine.run(body.workflowName, body.input ?? {}, {
      requestId,
      mode: principal.mode
    });

    const response: RunWorkflowResponse = {
      requestId,
      workflowName: body.workflowName,
      mode: principal.mode,
      output
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown workflow execution error";
    res.status(500).json({ requestId, error: message });
  }
});

app.get("/internal/metering", (_req, res) => {
  res.status(200).json(meterSink.snapshot());
});

app.listen(port, () => {
  console.log(`Builder OS Gateway listening on http://localhost:${port}`);
});
