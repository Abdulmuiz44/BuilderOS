# BuilderOS Architecture

BuilderOS is a local-first agentic operating system for repeatable builder workflows. The MVP uses a small modular monorepo and a single-process runtime instead of distributed workers.

## Modules

- `apps/web`: Next.js App Router UI, server actions, and responsive application shell.
- `packages/core`: runtime store, SQLite migrations, seeded manifests, capability handlers, and sequential executor.
- `packages/types`: shared TypeScript contracts.
- `apps/gateway` and `apps/cli`: existing API/CLI foundation retained for future cloud and automation paths.

## Runtime model

Core entities:

- workflows
- workflow steps
- runs
- run steps
- logs
- artifacts
- plugins
- capabilities
- secrets
- accepted permissions

## Execution lifecycle

1. User opens the web app.
2. `openBuilderOs()` opens SQLite, runs migrations, and seeds built-ins.
3. User triggers a workflow manually.
4. The executor creates a queued run and pending run steps.
5. The run becomes `running`.
6. Each step checks capability availability and required permissions.
7. Handler output is saved, logs are written, and artifacts are attached.
8. The run ends as `succeeded` or `failed`.

## Why SQLite

SQLite is fastest and safest for the local-first MVP: no external service, simple self-hosting, and easy migration to PostgreSQL later through the store boundary.

## Intentional non-goals

No marketplace, billing, multi-tenant SaaS, unrestricted shell execution, production secrets vault, browser automation, giant knowledge graph, or distributed worker system in the first version.
