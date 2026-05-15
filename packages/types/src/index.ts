export type ApiMode = "local" | "hosted";
export type UsageStatus = "success" | "error" | "unauthorized";
export type UsageUnitType = "request";
export type AuthScope = "workflows:run" | "api_keys:manage" | "usage:read";

export interface AuthContext {
  apiKeyId: string;
  keyPrefix: string;
  ownerId: string;
  scopes: AuthScope[];
  mode: ApiMode;
}

export interface RunWorkflowRequest {
  workflowName: string;
  input: Record<string, unknown>;
}

export interface RunWorkflowResponse {
  requestId: string;
  workflowName: string;
  mode: ApiMode;
  auth: {
    apiKeyId: string;
    ownerId: string;
    keyPrefix: string;
    scopes: AuthScope[];
  };
  output: Record<string, unknown>;
}

export interface WorkflowContext {
  requestId: string;
  mode: ApiMode;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  run: (input: Record<string, unknown>, ctx: WorkflowContext) => Promise<Record<string, unknown>>;
}

export interface UsageEvent {
  id: string;
  apiKeyId: string;
  route: string;
  workflowName: string;
  status: UsageStatus;
  unitType: UsageUnitType;
  units: number;
  latencyMs: number;
  createdAt: string;
}

export type JsonObject = Record<string, unknown>;
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type StepStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type ArtifactType = "markdown" | "text" | "json" | "link" | "file";

export interface BuilderWorkflowStep {
  id: string;
  name: string;
  description: string;
  order: number;
  capabilityId: string;
  input: JsonObject;
  requiredPermissions: string[];
}

export interface BuilderWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  inputSchema: JsonObject;
  outputExpectations: string[];
  enabled: boolean;
  requiredPermissions: string[];
  steps: BuilderWorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface BuilderRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  input: JsonObject;
  outputSummary?: string;
  acceptedPermissions: string[];
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BuilderRunStep {
  id: string;
  runId: string;
  workflowStepId: string;
  name: string;
  order: number;
  capabilityId: string;
  status: StepStatus;
  input: JsonObject;
  output?: JsonObject;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BuilderLog {
  id: string;
  runId: string;
  runStepId?: string;
  level: "info" | "warn" | "error";
  message: string;
  metadata?: JsonObject;
  createdAt: string;
}

export interface BuilderArtifact {
  id: string;
  runId: string;
  runStepId?: string;
  title: string;
  type: ArtifactType;
  content: string;
  metadata?: JsonObject;
  createdAt: string;
}

export interface BuilderPluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  capabilities: string[];
  permissions: string[];
}

export interface BuilderPlugin extends BuilderPluginManifest {
  enabled: boolean;
  manifest: BuilderPluginManifest;
}

export interface BuilderCapability {
  id: string;
  name: string;
  description: string;
  pluginId: string;
  inputSchema: JsonObject;
  outputSchema: JsonObject;
  requiredPermissions: string[];
  enabled: boolean;
}

export interface BuilderSecret {
  id: string;
  name: string;
  description: string;
  provider: string;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
}
