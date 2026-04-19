import type { QueryResultRow } from "pg";
import type { UsageEvent } from "@builderos/types";
import type { DbExecutor } from "./apiKeyRepository.js";

export interface UsageSummary {
  totalRequests: number;
  from: string;
  to: string;
}

export interface UsageByRoute {
  route: string;
  requestCount: number;
}

export interface UsageByApiKey {
  apiKeyId: string;
  keyPrefix: string | null;
  requestCount: number;
}

function toIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return parsed.toISOString();
}

export class UsageEventRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(event: UsageEvent): Promise<void> {
    await this.db.query(
      `
        INSERT INTO usage_events (
          id,
          api_key_id,
          route,
          workflow_name,
          status,
          unit_type,
          units,
          latency_ms,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
      `,
      [
        event.id,
        event.apiKeyId,
        event.route,
        event.workflowName,
        event.status,
        event.unitType,
        event.units,
        event.latencyMs,
        event.createdAt
      ]
    );
  }

  async getSummary(from: string, to: string): Promise<UsageSummary> {
    const fromIso = toIso(from);
    const toIsoValue = toIso(to);

    const result = await this.db.query<{ total_requests: string }>(
      `
        SELECT COALESCE(SUM(units), 0)::text AS total_requests
        FROM usage_events
        WHERE created_at >= $1::timestamptz
          AND created_at < $2::timestamptz
      `,
      [fromIso, toIsoValue]
    );

    const row = result.rows[0];
    return {
      totalRequests: Number(row?.total_requests ?? 0),
      from: fromIso,
      to: toIsoValue
    };
  }

  async getByRoute(from: string, to: string): Promise<UsageByRoute[]> {
    const fromIso = toIso(from);
    const toIsoValue = toIso(to);

    const result = await this.db.query<{ route: string; request_count: string }>(
      `
        SELECT route, COALESCE(SUM(units), 0)::text AS request_count
        FROM usage_events
        WHERE created_at >= $1::timestamptz
          AND created_at < $2::timestamptz
        GROUP BY route
        ORDER BY request_count::bigint DESC, route ASC
      `,
      [fromIso, toIsoValue]
    );

    return result.rows.map((row) => ({
      route: row.route,
      requestCount: Number(row.request_count)
    }));
  }

  async getByApiKey(from: string, to: string): Promise<UsageByApiKey[]> {
    const fromIso = toIso(from);
    const toIsoValue = toIso(to);

    const result = await this.db.query<{
      api_key_id: string;
      key_prefix: string | null;
      request_count: string;
    }>(
      `
        SELECT
          ue.api_key_id,
          ak.key_prefix,
          COALESCE(SUM(ue.units), 0)::text AS request_count
        FROM usage_events ue
        LEFT JOIN api_keys ak ON ak.id::text = ue.api_key_id
        WHERE ue.created_at >= $1::timestamptz
          AND ue.created_at < $2::timestamptz
        GROUP BY ue.api_key_id, ak.key_prefix
        ORDER BY request_count::bigint DESC, ue.api_key_id ASC
      `,
      [fromIso, toIsoValue]
    );

    return result.rows.map((row) => ({
      apiKeyId: row.api_key_id,
      keyPrefix: row.key_prefix,
      requestCount: Number(row.request_count)
    }));
  }
}
