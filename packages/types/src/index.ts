export type ApiMode = "local" | "hosted";

export interface AuthenticatedPrincipal {
  mode: ApiMode;
  apiKey: string;
}

export interface RunWorkflowRequest {
  workflowName: string;
  input: Record<string, unknown>;
}

export interface RunWorkflowResponse {
  requestId: string;
  workflowName: string;
  mode: ApiMode;
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

export interface MeterEvent {
  requestId: string;
  apiKey: string;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}
