import { randomUUID } from "node:crypto";
import { Router } from "express";
import { WorkflowEngine } from "@builderos/core";
import type { AuthContext, RunWorkflowRequest, RunWorkflowResponse } from "@builderos/types";
import { setRequestUsageMetadata } from "@builderos/metering";
import { WorkflowRunRepository, type WorkflowRunStatus } from "../repos/workflowRunRepository.js";

function parseLimit(value: unknown): number {
  if (typeof value !== "string" || value.trim() === "") {
    return 20;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("Invalid 'limit'. Must be a positive integer.");
  }

  return Math.min(Math.floor(parsed), 100);
}

function parseStatus(value: unknown): WorkflowRunStatus | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  if (value !== "success" && value !== "error") {
    throw new Error("Invalid 'status'. Must be success or error.");
  }

  return value;
}

function parseIsoOrUndefined(name: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid '${name}'. Must be an ISO timestamp.`);
  }

  return parsed.toISOString();
}

export function createWorkflowRunsRouter(
  workflowEngine: WorkflowEngine,
  repository: WorkflowRunRepository
): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const auth = res.locals.auth as AuthContext;
      const limit = parseLimit(req.query.limit);
      const status = parseStatus(req.query.status);
      const workflowName =
        typeof req.query.workflowName === "string" && req.query.workflowName.trim() !== ""
          ? req.query.workflowName
          : undefined;
      const from = parseIsoOrUndefined("from", req.query.from);
      const to = parseIsoOrUndefined("to", req.query.to);
      const cursor = parseIsoOrUndefined("cursor", req.query.cursor);

      const result = await repository.listByOwner(auth.ownerId, limit, {
        status,
        workflowName,
        from,
        to,
        cursor
      });

      res.status(200).json({ items: result.items, limit, nextCursor: result.nextCursor });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to list workflow runs";
      res.status(400).json({ error: message });
    }
  });

  router.post("/:requestId/replay", async (req, res) => {
    const auth = res.locals.auth as AuthContext;
    const sourceRequestId = req.params.requestId;

    if (!sourceRequestId) {
      res.status(400).json({ error: "requestId is required" });
      return;
    }

    const previous = await repository.getByRequestId(sourceRequestId, auth.ownerId);
    if (!previous) {
      res.status(404).json({ error: "Workflow run not found" });
      return;
    }

    const requestId = randomUUID();
    setRequestUsageMetadata(res, { workflowName: previous.workflowName });

    try {
      const output = await workflowEngine.run(previous.workflowName, previous.input, {
        requestId,
        mode: auth.mode
      });

      const response: RunWorkflowResponse = {
        requestId,
        workflowName: previous.workflowName,
        mode: auth.mode,
        auth: {
          apiKeyId: auth.apiKeyId,
          ownerId: auth.ownerId,
          keyPrefix: auth.keyPrefix,
          scopes: auth.scopes
        },
        output
      };

      await repository.insert({
        requestId,
        workflowName: previous.workflowName,
        input: previous.input,
        output,
        status: "success",
        mode: auth.mode,
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      res.status(200).json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown workflow replay error";
      await repository.insert({
        requestId,
        workflowName: previous.workflowName,
        input: previous.input,
        status: "error",
        errorMessage: message,
        mode: auth.mode,
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      res.status(500).json({ requestId, error: message });
    }
  });

  router.post("/run", async (req, res) => {
    const body = req.body as Partial<RunWorkflowRequest>;

    if (!body.workflowName || typeof body.workflowName !== "string") {
      res.status(400).json({ error: "workflowName is required" });
      return;
    }

    const requestId = randomUUID();
    const auth = res.locals.auth as AuthContext;
    const startedAt = new Date().toISOString();
    const input = body.input ?? {};
    setRequestUsageMetadata(res, { workflowName: body.workflowName });

    try {
      const output = await workflowEngine.run(body.workflowName, input, {
        requestId,
        mode: auth.mode
      });

      await repository.insert({
        requestId,
        workflowName: body.workflowName,
        input,
        output,
        status: "success",
        mode: auth.mode,
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        createdAt: startedAt,
        completedAt: new Date().toISOString()
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

      await repository.insert({
        requestId,
        workflowName: body.workflowName,
        input,
        status: "error",
        errorMessage: message,
        mode: auth.mode,
        apiKeyId: auth.apiKeyId,
        ownerId: auth.ownerId,
        createdAt: startedAt,
        completedAt: new Date().toISOString()
      });

      res.status(500).json({ requestId, error: message });
    }
  });

  return router;
}
