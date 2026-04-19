export type ApiMode = "local" | "hosted";
export type UsageStatus = "success" | "error" | "unauthorized";
export type UsageUnitType = "request";
export type AuthScope = "workflows:run";

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
