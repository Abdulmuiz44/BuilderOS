import { Router } from "express";
import { UsageEventRepository } from "../repos/usageEventRepository.js";

function parseRange(from: unknown, to: unknown): { from: string; to: string } {
  if (typeof from !== "string" || typeof to !== "string") {
    throw new Error("Query params 'from' and 'to' are required ISO timestamps");
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Invalid 'from' or 'to' timestamp");
  }

  if (fromDate >= toDate) {
    throw new Error("'from' must be earlier than 'to'");
  }

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString()
  };
}

export function createUsageRouter(repository: UsageEventRepository): Router {
  const router = Router();

  router.get("/summary", async (req, res) => {
    try {
      const { from, to } = parseRange(req.query.from, req.query.to);
      const summary = await repository.getSummary(from, to);
      res.status(200).json(summary);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to query summary";
      res.status(400).json({ error: message });
    }
  });

  router.get("/by-route", async (req, res) => {
    try {
      const { from, to } = parseRange(req.query.from, req.query.to);
      const data = await repository.getByRoute(from, to);
      res.status(200).json({ from, to, items: data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to query route usage";
      res.status(400).json({ error: message });
    }
  });

  router.get("/by-api-key", async (req, res) => {
    try {
      const { from, to } = parseRange(req.query.from, req.query.to);
      const data = await repository.getByApiKey(from, to);
      res.status(200).json({ from, to, items: data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to query api key usage";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
