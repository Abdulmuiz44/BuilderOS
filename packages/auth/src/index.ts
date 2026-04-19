import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedPrincipal } from "@builderos/types";

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

export function createExpressAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = extractApiKey(req);
    const allowAnonLocal = process.env.BUILDER_OS_ALLOW_ANON_LOCAL === "true";

    if (!apiKey && allowAnonLocal) {
      const principal: AuthenticatedPrincipal = {
        mode: "local",
        apiKey: "local-anon"
      };

      res.locals.auth = principal;
      next();
      return;
    }

    if (!apiKey) {
      res.status(401).json({ error: "Missing API key" });
      return;
    }

    if (!isValidBuilderOsApiKey(apiKey)) {
      res.status(401).json({ error: "Invalid API key format" });
      return;
    }

    const principal: AuthenticatedPrincipal = {
      mode: "hosted",
      apiKey
    };

    res.locals.auth = principal;
    next();
  };
}
