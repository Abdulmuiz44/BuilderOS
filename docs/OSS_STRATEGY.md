# Builder OS Open Source Strategy

## Positioning
Builder OS is open source by default. The moat is not private code; the moat is managed execution quality, hosted reliability, and superior developer workflow experience.

## What Is Open
- CLI, SDK, shared types, workflow engine.
- Workflow definitions and interfaces.
- Tool and browser adapter contracts.
- Auth/metering interface packages and local implementations.
- Self-host architecture patterns and configuration model.

## What Is Hosted
- Managed Builder OS gateway.
- Builder OS API key issuance and lifecycle operations.
- Billing and usage accounting infrastructure.
- Reliability engineering: scaling, monitoring, incident response.
- Hosted orchestration quality and operational tuning.

## Why This Model Works
- Trust: users can inspect and run the core themselves.
- Adoption: low-friction local experimentation drives ecosystem growth.
- Conversion: teams pay when managed convenience saves engineering time.
- Durability: hosted value compounds through operational excellence.

## Economic Design
- Free path: self-host + BYOK.
- Paid path: hosted Builder OS key for managed workflow usage.
- Pricing path: pay-per-request now, richer usage-based dimensions later.

## Community + Product Flywheel
- OSS users improve workflows, adapters, and tooling.
- Best patterns inform hosted defaults.
- Hosted revenue funds reliability and feature velocity.
- Improvements are pushed back into open interfaces and core quality.

## Guardrails
- Do not hide core capabilities behind closed code.
- Keep hosted differentiation focused on service quality, not artificial lock-in.
- Maintain compatible local and hosted APIs where feasible.
