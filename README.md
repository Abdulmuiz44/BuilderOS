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

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start gateway

```bash
pnpm --filter @builderos/gateway dev
```

Gateway defaults to `http://localhost:8787`.

### 3. Run CLI against hosted gateway mode

```bash
export BUILDER_OS_GATEWAY_URL=http://localhost:8787
export BUILDER_OS_API_KEY=bos_dev_example_key
pnpm --filter @builderos/cli dev -- run echo '{"message":"hello from cli"}'
```

### 4. Run local mode (auth bypass for local development)

```bash
export BUILDER_OS_ALLOW_ANON_LOCAL=true
pnpm --filter @builderos/gateway dev
pnpm --filter @builderos/cli dev -- run echo '{"message":"local mode"}'
```

## Environment Variables

- `BUILDER_OS_GATEWAY_URL`: gateway base URL (default: `http://localhost:8787`)
- `BUILDER_OS_API_KEY`: Builder OS hosted API key used by CLI/SDK
- `BUILDER_OS_ALLOW_ANON_LOCAL`: set `true` to bypass API key checks in local dev mode
- `PORT`: gateway port (default: `8787`)

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
