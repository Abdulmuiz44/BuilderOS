# Database and Usage APIs

## Purpose
This document defines the Builder OS Postgres schema, migration workflow, environment variables, and usage query API contracts introduced in Milestone 2.

## Schema

### `api_keys`
- `id` (`uuid`, primary key)
- `key_hash` (`text`, unique, not null)
- `key_prefix` (`text`, not null)
- `owner_id` (`text`, not null)
- `scopes` (`jsonb`, not null)
- `status` (`text`, not null) values: `active`, `inactive`
- `created_at` (`timestamptz`, not null, default now)

### `usage_events`
- `id` (`uuid`, primary key)
- `api_key_id` (`text`, not null)
- `route` (`text`, not null)
- `workflow_name` (`text`, not null)
- `status` (`text`, not null)
- `unit_type` (`text`, not null)
- `units` (`integer`, not null)
- `latency_ms` (`integer`, not null)
- `created_at` (`timestamptz`, not null)

## Indexes
- `idx_api_keys_key_prefix` on `api_keys(key_prefix)`
- `idx_usage_events_api_key_id` on `usage_events(api_key_id)`
- `idx_usage_events_created_at` on `usage_events(created_at)`
- `idx_usage_events_route` on `usage_events(route)`

## Security Model for Keys
- Raw API keys are never persisted.
- Keys are hashed with SHA-256 before lookup/storage (`key_hash`).
- `key_prefix` is stored for operational/debug display.
- Resolver only matches incoming hashed key to active records.

## Migration Workflow

### Migration files
- Location: `apps/gateway/migrations`
- Current baseline: `0001_init.sql`

### Apply migrations
```bash
export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
pnpm --filter @builderos/gateway db:migrate
```

### Optional seed API key
```bash
export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
export BUILDER_OS_SEED_API_KEY=bos_dev_example_key
export BUILDER_OS_SEED_OWNER_ID=local-dev
pnpm --filter @builderos/gateway db:seed-api-key
```

## Local Setup (Gateway + Dashboard)
```bash
export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
pnpm --filter @builderos/gateway db:migrate
pnpm --filter @builderos/gateway db:seed-api-key

export BUILDER_OS_GATEWAY_URL=http://localhost:8787
export BUILDER_OS_API_KEY=bos_dev_example_key
export BUILDER_OS_DASHBOARD_API_KEY=bos_dev_example_key

pnpm --filter @builderos/gateway dev
pnpm --filter @builderos/web dev
```

## Usage Query APIs

All endpoints require auth (hosted key or local mode bypass).

### `GET /v1/usage/summary?from=...&to=...`
Returns total request units in range `[from, to)`.

Response shape:
```json
{
  "totalRequests": 42,
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-01-31T00:00:00.000Z"
}
```

### `GET /v1/usage/by-route?from=...&to=...`
Aggregates request units by route in range.

Response shape:
```json
{
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-01-31T00:00:00.000Z",
  "items": [
    { "route": "/v1/workflows/run", "requestCount": 42 }
  ]
}
```

### `GET /v1/usage/by-api-key?from=...&to=...`
Aggregates request units by `apiKeyId` (with optional key prefix) in range.

Response shape:
```json
{
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-01-31T00:00:00.000Z",
  "items": [
    {
      "apiKeyId": "1a90f58a-4f5f-4f03-a0db-7f66e71dcf2a",
      "keyPrefix": "bos_dev_exam",
      "requestCount": 42
    }
  ]
}
```

## Date Filtering Rules
- `from` and `to` are required ISO timestamps.
- Range is inclusive of `from` and exclusive of `to`.
- `from` must be earlier than `to`.
