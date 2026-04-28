import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { AuthContext, AuthScope } from "@builderos/types";
import { getKeyPrefix, hashApiKey } from "../db/hash.js";
import { ApiKeyRepository } from "../repos/apiKeyRepository.js";

const ALLOWED_SCOPES: AuthScope[] = ["workflows:run", "usage:read", "api_keys:manage"];

function requireScope(auth: AuthContext, scope: AuthScope): void {
  if (!auth.scopes.includes(scope)) {
    throw new Error(`Missing required scope: ${scope}`);
  }
}

function parseScopes(value: unknown): AuthScope[] {
  if (value === undefined) {
    return ["workflows:run"];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("scopes must be an array of strings");
  }

  const parsed = value as string[];
  for (const scope of parsed) {
    if (!ALLOWED_SCOPES.includes(scope as AuthScope)) {
      throw new Error(`Unsupported scope: ${scope}`);
    }
  }

  if (parsed.length === 0) {
    throw new Error("scopes cannot be empty");
  }

  return parsed as AuthScope[];
}

function generateRawApiKey(ownerId: string): string {
  const owner = ownerId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 24) || "owner";
  const token = randomUUID().replaceAll("-", "");
  return `bos_${owner}_${token}`;
}

export function createApiKeysRouter(repository: ApiKeyRepository): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const auth = res.locals.auth as AuthContext;
      requireScope(auth, "api_keys:manage");
      const keys = await repository.listByOwner(auth.ownerId);
      res.status(200).json({
        items: keys.map((item) => ({
          id: item.id,
          keyPrefix: item.key_prefix,
          ownerId: item.owner_id,
          scopes: item.scopes,
          status: item.status,
          createdAt: new Date(item.created_at).toISOString()
        }))
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to list API keys";
      res.status(403).json({ error: message });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const auth = res.locals.auth as AuthContext;
      requireScope(auth, "api_keys:manage");
      const scopes = parseScopes((req.body as { scopes?: unknown })?.scopes);
      const rawKey = generateRawApiKey(auth.ownerId);
      const id = randomUUID();

      await repository.create({
        id,
        keyHash: hashApiKey(rawKey),
        keyPrefix: getKeyPrefix(rawKey),
        ownerId: auth.ownerId,
        scopes
      });

      res.status(201).json({
        id,
        rawKey,
        keyPrefix: getKeyPrefix(rawKey),
        ownerId: auth.ownerId,
        scopes,
        status: "active"
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create API key";
      res.status(400).json({ error: message });
    }
  });

  router.post("/:id/revoke", async (req, res) => {
    try {
      const auth = res.locals.auth as AuthContext;
      requireScope(auth, "api_keys:manage");
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }

      const revoked = await repository.revokeById(id, auth.ownerId);
      if (!revoked) {
        res.status(404).json({ error: "Active API key not found" });
        return;
      }

      res.status(200).json({ id, status: "inactive" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to revoke API key";
      res.status(403).json({ error: message });
    }
  });

  return router;
}
