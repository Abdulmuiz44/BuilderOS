import { createHash } from "node:crypto";

export function hashApiKey(rawApiKey: string): string {
  return createHash("sha256").update(rawApiKey).digest("hex");
}

export function getKeyPrefix(rawApiKey: string): string {
  return rawApiKey.slice(0, 12);
}
