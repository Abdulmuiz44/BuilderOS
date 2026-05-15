import "server-only";
import { openBuilderOs } from "@builderos/core";

export async function getBuilderOs() {
  return openBuilderOs();
}

export function duration(startedAt?: string, completedAt?: string): string {
  if (!startedAt || !completedAt) return "—";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
