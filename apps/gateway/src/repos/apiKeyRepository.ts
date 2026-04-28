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

  async listByOwner(ownerId: string): Promise<ApiKeyRecord[]> {
    const result = await this.db.query<ApiKeyRecord>(
      `
        SELECT id, key_hash, key_prefix, owner_id, scopes, status, created_at
        FROM api_keys
        WHERE owner_id = $1
        ORDER BY created_at DESC
      `,
      [ownerId]
    );

    return result.rows;
  }

  async create(input: {
    id: string;
    keyHash: string;
    keyPrefix: string;
    ownerId: string;
    scopes: AuthScope[];
  }): Promise<void> {
    await this.db.query(
      `
        INSERT INTO api_keys (id, key_hash, key_prefix, owner_id, scopes, status)
        VALUES ($1, $2, $3, $4, $5::jsonb, 'active')
      `,
      [input.id, input.keyHash, input.keyPrefix, input.ownerId, JSON.stringify(input.scopes)]
    );
  }

  async revokeById(id: string, ownerId: string): Promise<boolean> {
    const result = await this.db.query(
      `
        UPDATE api_keys
        SET status = 'inactive'
        WHERE id = $1
          AND owner_id = $2
          AND status = 'active'
      `,
      [id, ownerId]
    );

    return Boolean(result.rowCount && result.rowCount > 0);
  }
}
