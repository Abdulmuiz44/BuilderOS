import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { UsageEvent, UsageStatus } from "@builderos/types";

export interface UsageEventStore {
  write: (event: UsageEvent) => void | Promise<void>;
}

export interface RequestUsageMetadata {
  workflowName?: string;
}

export function setRequestUsageMetadata(res: Response, metadata: RequestUsageMetadata): void {
  const current = (res.locals.usageMetadata ?? {}) as RequestUsageMetadata;
  res.locals.usageMetadata = {
    ...current,
    ...metadata
  };
}

function statusFromHttpCode(statusCode: number): UsageStatus {
  if (statusCode === 401) {
    return "unauthorized";
  }

  if (statusCode >= 200 && statusCode < 400) {
    return "success";
  }

  return "error";
}

export function createInMemoryUsageEventStore() {
  const events: UsageEvent[] = [];

  return {
    write(event: UsageEvent) {
      events.push(event);
    },
    snapshot() {
      return {
        total: events.length,
        events
      };
    }
  };
}

export function createExpressMeteringMiddleware(options: { store: UsageEventStore }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path !== "/v1/workflows/run") {
      next();
      return;
    }

    const startedAt = Date.now();

    res.on("finish", () => {
      const auth = res.locals.auth;
      const usageMetadata = (res.locals.usageMetadata ?? {}) as RequestUsageMetadata;
      const workflowName =
        usageMetadata.workflowName ??
        (typeof req.body?.workflowName === "string" ? req.body.workflowName : "unknown");

      // TODO: Replace with durable, idempotent sink writes in production.
      void options.store.write({
        id: randomUUID(),
        apiKeyId: auth?.apiKeyId ?? "unknown",
        route: req.path,
        workflowName,
        status: statusFromHttpCode(res.statusCode),
        unitType: "request",
        units: 1,
        latencyMs: Date.now() - startedAt,
        createdAt: new Date().toISOString()
      });
    });

    next();
  };
}
