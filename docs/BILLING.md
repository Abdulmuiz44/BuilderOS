# Billing Model

## Billing Philosophy
Builder OS monetizes hosted convenience and reliability. Self-host and BYOK remain available in open source mode.

## Current Pricing Primitive (v0)
- Unit: `request`
- Billable event: successful or attempted hosted workflow run request to gateway.
- Auth basis: Builder OS API key identifies billable principal.

## Metering Path
1. Request enters hosted gateway with API key.
2. Auth middleware resolves principal.
3. Metering middleware emits usage event:
   - request ID
   - route
   - api key identifier
   - timestamp
   - status code
   - duration
4. Event sink stores record for downstream billing aggregation.

v0 uses an in-memory sink for architecture validation. Production will replace this with durable storage and an aggregation pipeline.

## Data Model (Initial)
- `api_keys`
  - id
  - project_id / account_id
  - status
  - created_at
- `usage_events`
  - request_id
  - api_key_id
  - route
  - status_code
  - duration_ms
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
- durable event sink with retry/idempotency
- API key to account/project normalization
- invoice generation and reconciliation jobs
- customer-visible usage dashboard and exports
