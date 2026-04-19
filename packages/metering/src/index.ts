import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { MeterEvent } from "@builderos/types";

export interface MeterSink {
  record: (event: MeterEvent) => void | Promise<void>;
}

export function createInMemoryMeterSink() {
  const events: MeterEvent[] = [];

  return {
    record(event: MeterEvent) {
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

export function createExpressMeteringMiddleware(options: { sink: MeterSink }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();
    const requestId = randomUUID();

    res.on("finish", () => {
      const principal = res.locals.auth;

      // TODO: Replace with durable, idempotent sink writes in production.
      void options.sink.record({
        requestId,
        apiKey: principal?.apiKey ?? "unknown",
        route: req.path,
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      });
    });

    next();
  };
}
