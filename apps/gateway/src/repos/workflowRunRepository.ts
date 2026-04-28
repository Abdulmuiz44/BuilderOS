import type { QueryResultRow } from "pg";
import type { ApiMode } from "@builderos/types";
import type { DbExecutor } from "./apiKeyRepository.js";

export type WorkflowRunStatus = "success" | "error";
export type WorkflowRunListFilters = {
  status?: WorkflowRunStatus;
  workflowName?: string;
  from?: string;
  to?: string;
  cursor?: string;
};

export type PersistedWorkflowRun = {
  requestId: string;
  workflowName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: WorkflowRunStatus;
  errorMessage?: string;
  mode: ApiMode;
  apiKeyId: string;
  ownerId: string;
  createdAt: string;
  completedAt: string;
};

type WorkflowRunRecord = QueryResultRow & {
  request_id: string;
  workflow_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: WorkflowRunStatus;
  error_message: string | null;
  mode: ApiMode;
  api_key_id: string;
  owner_id: string;
  created_at: string;
  completed_at: string | null;
};

function toIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return parsed.toISOString();
}

function mapRow(row: WorkflowRunRecord): PersistedWorkflowRun {
  return {
    requestId: row.request_id,
    workflowName: row.workflow_name,
    input: row.input,
    output: row.output ?? undefined,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    mode: row.mode,
    apiKeyId: row.api_key_id,
    ownerId: row.owner_id,
    createdAt: toIso(row.created_at),
    completedAt: toIso(row.completed_at ?? row.created_at)
  };
}

export class WorkflowRunRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(run: PersistedWorkflowRun): Promise<void> {
    await this.db.query(
      `
        INSERT INTO workflow_runs (
          request_id,
          workflow_name,
          input,
          output,
          status,
          error_message,
          mode,
          api_key_id,
          owner_id,
          created_at,
          completed_at
        )
        VALUES (
          $1::uuid,
          $2,
          $3::jsonb,
          $4::jsonb,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::timestamptz,
          $11::timestamptz
        )
      `,
      [
        run.requestId,
        run.workflowName,
        JSON.stringify(run.input),
        run.output ? JSON.stringify(run.output) : null,
        run.status,
        run.errorMessage ?? null,
        run.mode,
        run.apiKeyId,
        run.ownerId,
        run.createdAt,
        run.completedAt
      ]
    );
  }

  async getByRequestId(requestId: string, ownerId: string): Promise<PersistedWorkflowRun | null> {
    const result = await this.db.query<WorkflowRunRecord>(
      `
        SELECT
          request_id,
          workflow_name,
          input,
          output,
          status,
          error_message,
          mode,
          api_key_id,
          owner_id,
          created_at,
          completed_at
        FROM workflow_runs
        WHERE request_id = $1::uuid
          AND owner_id = $2
        LIMIT 1
      `,
      [requestId, ownerId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    return mapRow(result.rows[0] as WorkflowRunRecord);
  }

  async listByOwner(
    ownerId: string,
    limit: number,
    filters?: WorkflowRunListFilters
  ): Promise<{ items: PersistedWorkflowRun[]; nextCursor?: string }> {
    const whereParts: string[] = ["owner_id = $1"];
    const values: unknown[] = [ownerId];
    let paramIndex = 2;

    if (filters?.status) {
      whereParts.push(`status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex += 1;
    }

    if (filters?.workflowName) {
      whereParts.push(`workflow_name = $${paramIndex}`);
      values.push(filters.workflowName);
      paramIndex += 1;
    }

    if (filters?.from) {
      whereParts.push(`created_at >= $${paramIndex}::timestamptz`);
      values.push(toIso(filters.from));
      paramIndex += 1;
    }

    if (filters?.to) {
      whereParts.push(`created_at < $${paramIndex}::timestamptz`);
      values.push(toIso(filters.to));
      paramIndex += 1;
    }

    if (filters?.cursor) {
      whereParts.push(`created_at < $${paramIndex}::timestamptz`);
      values.push(toIso(filters.cursor));
      paramIndex += 1;
    }

    const effectiveLimit = Math.min(Math.max(limit, 1), 100);
    values.push(effectiveLimit + 1);
    const limitParam = `$${paramIndex}`;

    const result = await this.db.query<WorkflowRunRecord>(
      `
        SELECT
          request_id,
          workflow_name,
          input,
          output,
          status,
          error_message,
          mode,
          api_key_id,
          owner_id,
          created_at,
          completed_at
        FROM workflow_runs
        WHERE ${whereParts.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT ${limitParam}
      `,
      values
    );

    const mapped = result.rows.map((row) => mapRow(row as WorkflowRunRecord));
    const items = mapped.slice(0, effectiveLimit);
    const hasMore = mapped.length > effectiveLimit;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt : undefined;

    return { items, nextCursor };
  }
}
