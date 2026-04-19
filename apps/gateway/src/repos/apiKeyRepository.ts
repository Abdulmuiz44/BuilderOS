import type { QueryResultRow } from "pg";
import type { AuthScope } from "@builderos/types";

export interface DbExecutor {
  query: <T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ) => Promise<{ rows: T[]; rowCount: number | null }>;
}

export type ApiKeyRecord = {
  id: string;
  key_hash: string;
  key_prefix: string;
  owner_id: string;
  scopes: AuthScope[];
  status: "active" | "inactive";
  created_at: string;
};

export class ApiKeyRepository {
  constructor(private readonly db: DbExecutor) {}

  async findActiveByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const result = await this.db.query<ApiKeyRecord>(
      `
        SELECT id, key_hash, key_prefix, owner_id, scopes, status, created_at
        FROM api_keys
        WHERE key_hash = $1
          AND status = 'active'
        LIMIT 1
      `,
      [keyHash]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    return result.rows[0] ?? null;
  }
}
