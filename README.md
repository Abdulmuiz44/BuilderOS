# Builder OS

Open source assistant operating system for developers and AI builders.

Builder OS is designed as an open core platform with two operating modes:
- Local mode: self-host, bring your own keys, run workflows locally.
- Hosted mode: call the Builder OS managed gateway with a Builder OS API key.

The core is open source. The monetization layer is hosted convenience: orchestration quality, reliability, and developer experience.

## Repository Layout

- `apps/cli`: CLI for running workflows against local/hosted gateway.
- `apps/web`: web dashboard foundation.
- `apps/gateway`: hosted gateway API with auth + metering middleware.
- `packages/core`: workflow engine.
- `packages/workflows`: built-in example workflows.
- `packages/tools`: tool registry interfaces.
- `packages/browser-adapter`: browser adapter interfaces.
- `packages/sdk`: typed client used by CLI and external consumers.
- `packages/auth`: API key auth utilities and middleware.
- `packages/metering`: request metering utilities and middleware.
- `packages/types`: shared contracts.
- `docs/`: product and architecture docs.

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/OSS_STRATEGY.md`](docs/OSS_STRATEGY.md)
- [`docs/BILLING.md`](docs/BILLING.md)
- [`docs/TASKLIST.md`](docs/TASKLIST.md)
- [`docs/DATABASE.md`](docs/DATABASE.md)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure and migrate Postgres

```bash
export DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DB
pnpm --filter @builderos/gateway db:migrate
```

Optional local seed key:

```bash
export BUILDER_OS_SEED_API_KEY=bos_dev_example_key
export BUILDER_OS_SEED_OWNER_ID=local-dev
pnpm --filter @builderos/gateway db:seed-api-key
```

### 3. Start gateway

```bash
pnpm --filter @builderos/gateway dev
```

Gateway defaults to `http://localhost:8787`.

### 4. Run CLI against hosted gateway mode

```bash
export BUILDER_OS_GATEWAY_URL=http://localhost:8787
export BUILDER_OS_API_KEY=bos_dev_example_key
pnpm --filter @builderos/cli dev -- run echo '{"message":"hello from cli"}'
```

Profile-based setup (recommended):

```bash
pnpm --filter @builderos/cli dev -- profile set local-hosted --base-url http://localhost:8787 --mode hosted --api-key-env BUILDER_OS_API_KEY
pnpm --filter @builderos/cli dev -- profile use local-hosted
pnpm --filter @builderos/cli dev -- run echo '{"message":"hello from profile"}'
```

### 5. Run local mode (auth bypass for local development)

```bash
export BUILDER_OS_ALLOW_ANON_LOCAL=true
pnpm --filter @builderos/gateway dev
pnpm --filter @builderos/cli dev -- run echo '{"message":"local mode"}'
```

### 6. Query usage summary

```bash
pnpm --filter @builderos/cli dev -- usage summary --from 2026-01-20T00:00:00.000Z --to 2026-01-21T00:00:00.000Z
pnpm --filter @builderos/cli dev -- usage by-route --from 2026-01-20T00:00:00.000Z --to 2026-01-21T00:00:00.000Z
pnpm --filter @builderos/cli dev -- usage by-api-key --from 2026-01-20T00:00:00.000Z --to 2026-01-21T00:00:00.000Z
```

### 7. Workflow run history and replay

```bash
pnpm --filter @builderos/cli dev -- runs list --limit 20
pnpm --filter @builderos/cli dev -- runs list --status error --workflow echo --from 2026-01-20T00:00:00.000Z --to 2026-01-21T00:00:00.000Z
pnpm --filter @builderos/cli dev -- runs list --limit 20 --cursor 2026-01-21T00:00:00.000Z
pnpm --filter @builderos/cli dev -- runs replay <request-id>
```

### 8. API key management

```bash
pnpm --filter @builderos/cli dev -- keys list
pnpm --filter @builderos/cli dev -- keys create --scopes workflows:run,usage:read
pnpm --filter @builderos/cli dev -- keys revoke <api-key-id>
```

## Environment Variables

- `BUILDER_OS_GATEWAY_URL`: gateway base URL (default: `http://localhost:8787`)
- `BUILDER_OS_API_KEY`: Builder OS hosted API key used by CLI/SDK
- `BUILDER_OS_API_KEYS_JSON`: optional JSON array of allowed hosted API keys for gateway-side key resolution in development
- `BUILDER_OS_DASHBOARD_API_KEY`: API key used by the web dashboard when calling usage APIs
- `BUILDER_OS_ALLOW_ANON_LOCAL`: set `true` to bypass API key checks in local dev mode
- `PORT`: gateway port (default: `8787`)
- `DATABASE_URL`: Postgres connection string for gateway persistence
- `PGPOOL_MAX`: optional Postgres connection pool size (default: `10`)
- `BUILDER_OS_AUTO_MIGRATE`: set `true` to run migrations at gateway startup
- `BUILDER_OS_SEED_API_KEY`: raw API key used by seed script (never stored directly)
- `BUILDER_OS_SEED_OWNER_ID`: owner ID used by seed script
- `BUILDER_OS_SEED_SCOPES`: comma-separated scopes for seed script (default: `workflows:run`)

Gateway auth now resolves a normalized auth context (`apiKeyId`, `keyPrefix`, `ownerId`, `scopes`, `mode`) and metering emits canonical usage events per workflow request lifecycle.

## First Release Scope

- Local config and hosted API key config
- Simple workflow runner
- One hosted API route (`POST /v1/workflows/run`)
- Request auth middleware
- Request metering middleware
- One example workflow (`echo`)
- One example CLI command calling hosted gateway

## License

MIT (to be added in follow-up if not already present).
