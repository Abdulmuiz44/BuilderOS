CREATE TABLE IF NOT EXISTS workflow_runs (
  request_id UUID PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  mode TEXT NOT NULL,
  api_key_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_owner_created_at ON workflow_runs (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_api_key_created_at ON workflow_runs (api_key_id, created_at DESC);
