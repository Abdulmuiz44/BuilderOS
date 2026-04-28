import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type { AuthContext, AuthScope } from "@builderos/types";

export interface ApiKeyRecord {
  rawKey: string;
  apiKeyId: string;
  keyPrefix: string;
  ownerId: string;
  scopes: AuthScope[];
  mode: "hosted";
}

export interface ApiKeyResolver {
  resolve: (rawKey: string) => Promise<ApiKeyRecord | null>;
}

function extractApiKey(req: Request): string | undefined {
  const headerKey = req.header("x-builder-os-api-key") ?? undefined;

  if (headerKey) {
    return headerKey;
  }

  const authorization = req.header("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

function isValidBuilderOsApiKey(apiKey: string): boolean {
  return apiKey.startsWith("bos_") && apiKey.length >= 12;
}

function deriveOwnerId(apiKey: string): string {
  const pieces = apiKey.split("_");
  if (pieces.length >= 3 && pieces[1]) {
    return pieces[1];
  }

  return "owner-unknown";
}

function deriveApiKeyId(apiKey: string): string {
  const digest = createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
  return `key_${digest}`;
}

function deriveKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}

export function createStaticApiKeyResolver(rawKeys: string[]): ApiKeyResolver {
  const normalized = rawKeys.filter(Boolean);
  const records = new Map<string, ApiKeyRecord>();

  for (const key of normalized) {
    if (!isValidBuilderOsApiKey(key)) {
      continue;
    }

    records.set(key, {
      rawKey: key,
      apiKeyId: deriveApiKeyId(key),
      keyPrefix: deriveKeyPrefix(key),
      ownerId: deriveOwnerId(key),
      scopes: ["workflows:run", "usage:read", "api_keys:manage"],
      mode: "hosted"
    });
  }

  return {
    async resolve(rawKey: string) {
      return records.get(rawKey) ?? null;
    }
  };
}

function createEnvApiKeyResolver(): ApiKeyResolver {
  const jsonKeyList = process.env.BUILDER_OS_API_KEYS_JSON;
  const singleKey = process.env.BUILDER_OS_API_KEY;
  const fallbackKey = "bos_dev_example_key";
  let keys: string[] = [];

  if (jsonKeyList) {
    try {
      const parsed = JSON.parse(jsonKeyList) as unknown;
      if (Array.isArray(parsed)) {
        keys = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      keys = [];
    }
  }

  if (keys.length === 0) {
    keys = [singleKey ?? fallbackKey];
  }

  return createStaticApiKeyResolver(keys);
}

export async function resolveAuthContext(options: {
  rawApiKey?: string;
  allowAnonLocal?: boolean;
  resolver?: ApiKeyResolver;
}): Promise<AuthContext | null> {
  const allowAnonLocal = options.allowAnonLocal ?? false;
  const resolver = options.resolver ?? createEnvApiKeyResolver();
  const rawApiKey = options.rawApiKey;

  if (!rawApiKey) {
    if (!allowAnonLocal) {
      return null;
    }

    return {
      apiKeyId: "local-anon",
      keyPrefix: "local-anon",
      ownerId: "local-dev",
      scopes: ["workflows:run", "usage:read", "api_keys:manage"],
      mode: "local"
    };
  }

  if (!isValidBuilderOsApiKey(rawApiKey)) {
    return null;
  }

  const record = await resolver.resolve(rawApiKey);
  if (!record) {
    return null;
  }

  return {
    apiKeyId: record.apiKeyId,
    keyPrefix: record.keyPrefix,
    ownerId: record.ownerId,
    scopes: record.scopes,
    mode: record.mode
  };
}

export function createExpressAuthMiddleware(options?: { resolver?: ApiKeyResolver }) {
  const resolver = options?.resolver ?? createEnvApiKeyResolver();

  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = extractApiKey(req);
    const allowAnonLocal = process.env.BUILDER_OS_ALLOW_ANON_LOCAL === "true";

    void resolveAuthContext({
      rawApiKey: apiKey,
      allowAnonLocal,
      resolver
    }).then((authContext) => {
      if (!authContext) {
        res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
        return;
      }

      res.locals.auth = authContext;
      next();
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Auth resolution failed";
      res.status(500).json({ error: message });
    });
  };
}
