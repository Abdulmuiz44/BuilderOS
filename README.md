# BuilderOS

BuilderOS is an open-source, self-hostable agentic operating system for builders, developers, indie hackers, and product teams. The first real version focuses on a local-first runtime for repeatable builder workflows: product research, repo review, landing-page planning, feature planning, launch checklists, and generated artifacts.

BuilderOS borrows broad architectural logic from agentic operating systems: plugin runtime, interfaces/channels, capability providers, reference workflows, scheduled-routine readiness, secrets, permissions, and self-hostability. It is **not** a clone of any existing product and intentionally avoids marketplace, multi-tenant SaaS, billing, browser automation, and unrestricted shell execution in the MVP.

## What is included in the MVP

- Next.js App Router web app with dashboard, sidebar navigation, responsive dark UI, and pages for Runs, Workflows, Plugins, Capabilities, Secrets, and Settings.
- Local SQLite-backed runtime using Node.js `node:sqlite`.
- Core data model for workflows, workflow steps, runs, run steps, logs, artifacts, plugins, capabilities, secrets, and accepted permissions.
- Sequential server-side run executor.
- Local plugin manifest registry.
- Capability registry with permission checks.
- Reference workflows seeded at startup.
- Artifact storage and run detail views.
- Masked local secrets UI.

## Local setup

> Node.js 24+ is recommended because the MVP uses the built-in `node:sqlite` module.

```bash
corepack enable
pnpm install
pnpm --filter @builderos/web dev
```

Open <http://localhost:3000>.

The SQLite database is created automatically at:

```text
.builderos/builderos.sqlite
```

You can override it with:

```bash
BUILDEROS_DB_PATH=/absolute/path/to/builderos.sqlite pnpm --filter @builderos/web dev
```

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `BUILDEROS_DB_PATH` | Path to the local SQLite database. | `.builderos/builderos.sqlite` from the app process cwd |

Existing gateway/CLI packages still support their previous environment variables for hosted/local API usage. The new MVP web runtime is independent and local-first.

## Architecture overview

BuilderOS is organized as a monorepo:

- `apps/web` — Next.js App Router UI and server actions.
- `packages/core` — SQLite store, built-in plugin/capability registry, seeded workflows, and run executor.
- `packages/types` — shared runtime and API types.
- `apps/gateway`, `apps/cli`, and supporting packages — existing API/CLI foundation retained for later integration.

Runtime flow:

1. The web app opens the local BuilderOS store.
2. The store migrates SQLite tables and seeds built-in plugins, capabilities, and reference workflows.
3. A user clicks **Run workflow**.
4. The server action submits workflow input plus accepted permissions.
5. The executor creates a run and run-step records.
6. Each step resolves its capability and checks required permissions.
7. The executor runs capability handlers sequentially.
8. Logs, step outputs, errors, and artifacts are persisted.
9. Runs and artifacts are displayed in the UI.

## How workflows work

A workflow represents a repeatable builder process with:

- `name`
- `description`
- `category`
- `inputSchema`
- `outputExpectations`
- `enabled`
- `requiredPermissions`
- ordered `steps`

Each step calls a capability with JSON input. Step input supports simple placeholders such as `{{input.idea}}`.

Seeded reference workflows:

- Product Idea Research
- Repo Review
- Landing Page Plan
- Feature Implementation Plan
- Launch Checklist

## How plugins work

Plugins are local manifests registered from code for the MVP. A plugin has:

- `id`
- `name`
- `description`
- `version`
- `author`
- provided `capabilities`
- required `permissions`
- `enabled`
- raw manifest JSON

Example manifest shape:

```json
{
  "id": "builderos.files",
  "name": "Files",
  "version": "0.1.0",
  "capabilities": ["file.read", "file.write", "file.list"],
  "permissions": ["filesystem.read", "filesystem.write"]
}
```

No marketplace, ZIP installer, remote code loading, or plugin upload flow is included yet.

## How capabilities work

Capabilities are actions workflows can call. Each capability defines:

- `id`
- `name`
- `description`
- provider plugin
- input schema
- output schema
- required permissions
- handler

Initial capabilities:

- `file.read`
- `file.write`
- `file.list`
- `shell.command.mocked`
- `git.inspect.mocked`
- `research.note`
- `artifact.create`

Dangerous operations are intentionally conservative. Shell execution is mocked and never executes commands in this first version.

## Safety model

BuilderOS makes permissions visible and real without overbuilding policy infrastructure:

- Workflows declare required permissions.
- Capabilities declare required permissions.
- The run button passes accepted workflow permissions.
- The executor blocks a run if required workflow permissions are missing.
- The executor blocks a step if capability permissions are missing.
- Logs and run details show failures clearly.

Example permissions:

- `filesystem.read`
- `filesystem.write`
- `shell.execute`
- `git.read`
- `network.request`
- `secrets.read`
- `artifacts.write`

## Secrets

The MVP includes a local secrets registry with masked display. Secret values are never shown after saving and should not be logged. The current storage is local SQLite. This is isolated and useful for local development, but it is **not a production-grade encrypted vault** yet.

Suggested secret names:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`
- `VERCEL_TOKEN`
- `NETLIFY_TOKEN`

## MVP limitations

- No plugin marketplace.
- No plugin ZIP upload or remote plugin execution.
- No multi-tenant SaaS model.
- No billing.
- No full autonomous AI agent loop.
- No unrestricted shell execution.
- No browser automation.
- No large knowledge graph.
- No production secrets vault.
- No distributed worker system.
- Workflow creation/editing is not fully built; reference workflows are seeded from code.

## Roadmap

1. Add workflow creation/editing forms backed by the same schema.
2. Add routine/scheduled runs on the local runtime.
3. Add scoped file workspace permissions instead of conservative file stubs.
4. Add encrypted secrets storage with key-management documentation.
5. Add real repo inspection capability with safe allowlists.
6. Add AI provider capabilities using explicitly configured secrets.
7. Add Docker Compose and deployment docs for cloud-ready self-hosting.
8. Add a builder UI for authoring workflows and plugins.
