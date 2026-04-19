# Builder OS Task List

## Milestone 1: Foundation Monorepo
- [x] Create pnpm + Turbo TypeScript monorepo layout.
- [x] Add `apps/cli`, `apps/web`, `apps/gateway`.
- [x] Add shared packages (`core`, `workflows`, `tools`, `browser-adapter`, `sdk`, `auth`, `metering`, `types`).
- [x] Add root build/dev/typecheck scripts.

## Milestone 2: Shared Contracts and Engine
- [x] Define shared request/response and workflow contracts in `packages/types`.
- [x] Implement minimal workflow engine in `packages/core`.
- [x] Add one example workflow in `packages/workflows`.

## Milestone 3: Hosted Gateway MVP
- [x] Add gateway server with health endpoint.
- [x] Add `POST /v1/workflows/run` route.
- [x] Add request auth middleware for Builder OS API key.
- [x] Add request metering middleware and in-memory sink.

## Milestone 4: CLI + SDK Path
- [x] Add SDK client for hosted route.
- [x] Add CLI command that calls hosted gateway using env-based API key.
- [x] Document env config and usage examples.

## Milestone 5: Local vs Hosted Mode
- [x] Add local-mode auth bypass flag for development.
- [x] Keep API route compatible across local and hosted mode.

## Milestone 6: Documentation First Pass
- [x] `docs/PLAN.md`
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/OSS_STRATEGY.md`
- [x] `docs/BILLING.md`
- [x] `docs/TASKLIST.md`
- [x] Root `README.md`

## Next Milestones (Planned)
- [x] Durable metering backend and usage query API.
- [ ] API key management endpoints and scoped permissions.
- [x] Dashboard authentication + usage view.
- [ ] Workflow run history and replay.
- [ ] Rate limiting and abuse prevention.
- [ ] CI, tests, and release pipelines.
