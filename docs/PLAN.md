# Builder OS Plan

## Vision
Builder OS is an open source assistant operating system for developers and AI builders. The core product is fully open and self-hostable, while the commercial layer is a hosted gateway that provides reliability, orchestration quality, and managed operations.

Builder OS is designed to become the workflow control plane for AI-enabled software work: local-first when needed, hosted when teams want speed and operational convenience.

## Product Principles
- Open core first: all foundational workflow, tooling, and interfaces are OSS.
- Self-host by default: bring-your-own keys and local execution should always be possible.
- Hosted value, not code lock-in: monetization comes from managed reliability and DX.
- Mode symmetry: local and hosted modes should feel similar to reduce migration friction.
- Explicit metering: usage accounting should be transparent and auditable.

## User Personas

### 1. Solo AI Builder
- Wants to run locally with full control.
- Uses BYOK provider keys.
- Values fast setup and CLI-first workflows.

### 2. Startup Engineering Team
- Wants standard workflows and managed uptime.
- Needs API keys, usage tracking, and predictable spend.
- Cares about orchestration quality and team-level visibility.

### 3. Platform/Infra Engineer
- Wants composable architecture and self-host option.
- Needs auth, observability, and billing-ready interfaces.
- Cares about extensibility and stable contracts.

## Operating Modes

### Local Mode
- Self-hosted components.
- Local configuration file and env vars.
- BYOK provider credentials.
- Optional auth bypass for local development.

### Hosted Mode
- Uses Builder OS hosted gateway.
- Authenticated via Builder OS API key.
- Request metering and billing pipeline enabled.
- Managed reliability and workflow orchestration.

## v0 Scope (Foundation Release)
- TypeScript monorepo with apps and shared packages.
- CLI with local config and hosted API key config.
- One hosted gateway route for workflow execution.
- Auth middleware and metering middleware.
- Shared workflow engine and one example workflow.
- SDK client path for CLI to call hosted gateway.

## Phased Roadmap

### Phase 0: Foundation (Now)
- Monorepo scaffold complete.
- Local + hosted mode primitives.
- API key auth and request metering baseline.
- Core workflow runner + sample workflow.

### Phase 1: Developer Workflow
- Richer CLI UX (profiles, defaults, command groups).
- Dashboard auth and usage visibility.
- Workflow lifecycle (run history, replay, traces).
- Stable SDK ergonomics for integrations.

### Phase 2: Reliability and Operations
- Durable metering sink (database/queue).
- Key lifecycle management and scoped permissions.
- Rate limiting and abuse controls.
- Structured observability and SLO-driven operations.

### Phase 3: Platform Expansion
- Multi-workflow orchestration.
- Tool registry marketplace patterns.
- Browser adapter implementations.
- Team/org billing controls and cost governance.

## Success Criteria
- Open source users can run locally in minutes.
- Hosted users can authenticate with a Builder OS key and run workflows immediately.
- Architecture supports future billing without a rewrite.
- Contributor onboarding is straightforward from README and docs.
