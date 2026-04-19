# Billing Model

## Billing Philosophy
Builder OS monetizes hosted convenience and reliability. Self-host and BYOK remain available in open source mode.

## Current Pricing Primitive (v0)
- Unit: `request`
- Billable event: successful or attempted hosted workflow run request to gateway.
- Auth basis: Builder OS API key identifies billable principal.

## Metering Path
1. Request enters hosted gateway with API key.
2. Auth middleware resolves normalized `AuthContext` with stable identity fields (`apiKeyId`, `ownerId`, `keyPrefix`, `scopes`, `mode`).
3. Metering middleware emits usage event:
   - id
   - api key id
   - route
   - workflow name
   - status
   - unit type
   - units
   - latency ms
   - created at
4. Event sink stores record for downstream billing aggregation.

Milestone 2 stores usage events durably in Postgres through `UsageEventRepository` and exposes query APIs for dashboard/billing aggregation.

## Data Model (Initial)
- `api_keys`
  - id
  - key_hash
  - key_prefix
  - owner_id
  - scopes
  - status
  - created_at
- `usage_events`
  - id
  - api_key_id
  - route
  - workflow_name
  - status
  - unit_type
  - units
  - latency_ms
  - created_at
- `billing_period_summaries`
  - account_id
  - period_start
  - period_end
  - request_count
  - amount_due

## Future Usage-Based Dimensions
- workflow execution time tiers
- high-cost tool invocation counts
- browser automation session minutes
- model/provider passthrough dimensions

These can be layered without breaking current request-metering contracts.

## Pricing Evolution Path
- Stage 1: flat pay-per-request.
- Stage 2: per-route multipliers (e.g., premium workflows).
- Stage 3: blended model (base request + resource dimensions).

## Required Production Additions
- durable event sink retries/idempotency controls
- API key to account/project normalization
- invoice generation and reconciliation jobs
- customer-visible usage dashboard and exports
