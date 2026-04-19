# Builder OS Architecture

## System Shape
Builder OS is a modular TypeScript monorepo with clear separation between open source workflow infrastructure and hosted managed services.

- `apps/cli`: developer-facing command-line client.
- `apps/web`: dashboard foundation.
- `apps/gateway`: hosted API surface and middleware chain.
- `packages/core`: workflow engine.
- `packages/workflows`: workflow definitions and examples.
- `packages/tools`: tool interfaces and registry primitives.
- `packages/browser-adapter`: browser automation interfaces.
- `packages/sdk`: typed client for gateway calls.
- `packages/auth`: request auth primitives and middleware.
- `packages/metering`: request metering interfaces and middleware.
- `packages/types`: shared contracts.

## Open Source Core vs Hosted Gateway

### Open Source Core
Open source includes the CLI, workflow engine, workflow contracts, adapters, and all package interfaces required for self-hosting.

Core responsibilities:
- Define workflow contracts and runner behavior.
- Enable local mode execution and config.
- Provide SDK and integration surfaces.
- Keep extension points public and composable.

### Hosted Gateway
Hosted gateway provides managed API key entrypoint, auth enforcement, request metering, and reliability features.

Hosted responsibilities:
- Validate Builder OS API keys.
- Meter each request for billing/analytics.
- Execute workflows in managed infrastructure.
- Provide operational guarantees and DX improvements.

## Request Flow (Hosted)
1. CLI or SDK sends `POST /v1/workflows/run` with `x-builder-os-api-key`.
2. Auth middleware validates key and sets request principal.
3. Metering middleware starts timer and records completion event.
4. Gateway dispatches workflow execution through `packages/core`.
5. Response returns workflow output with request metadata.

## Request Flow (Local)
1. User runs local stack and sets local mode env/config.
2. Auth middleware can allow local anonymous dev mode.
3. Workflow execution path remains the same through core engine.
4. Metering still runs for local observability/testing.

## Package Boundaries
- `types` is dependency base for cross-package contracts.
- `core` depends on `types` only.
- `workflows` depends on `types` for definitions.
- `gateway` composes `auth`, `metering`, `core`, `workflows`, `types`.
- `sdk` depends on `types`; consumers depend on `sdk`.
- `cli` depends on `sdk` only for API calls.

This keeps the workflow engine portable and avoids coupling business logic to HTTP transport.

## Extensibility Points
- Add workflows by publishing new definitions from `packages/workflows`.
- Add tools via tool registry interfaces.
- Add browser implementations behind adapter interfaces.
- Swap metering sinks (memory -> database/queue) without gateway rewrite.
- Evolve auth strategy (static keys -> scoped keys/JWT) while preserving middleware contract.

## Production Notes
- v0 includes in-memory metering sink for fast iteration.
- Production should use durable event sink and idempotent write path.
- API key management, rate limiting, retries, and observability are planned next layers.
