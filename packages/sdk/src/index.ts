import type { RunWorkflowRequest, RunWorkflowResponse } from "@builderos/types";

type HostedClientOptions = {
  baseUrl: string;
  mode: "hosted";
  apiKey: string;
};

type LocalClientOptions = {
  baseUrl: string;
  mode: "local";
};

export type BuilderOsClientOptions = HostedClientOptions | LocalClientOptions;

export type UsageSummaryResponse = {
  from: string;
  to: string;
  totalRequests: number;
};

export type UsageByRouteItem = {
  route: string;
  requestCount: number;
};

export type UsageByApiKeyItem = {
  apiKeyId: string;
  keyPrefix: string | null;
  requestCount: number;
};

export type WorkflowRunRecord = {
  requestId: string;
  workflowName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "success" | "error";
  errorMessage?: string;
  mode: "hosted" | "local";
  apiKeyId: string;
  ownerId: string;
  createdAt: string;
  completedAt: string;
};

export type ApiKeySummary = {
  id: string;
  keyPrefix: string;
  ownerId: string;
  scopes: string[];
  status: "active" | "inactive";
  createdAt?: string;
};

export class BuilderOsClient {
  private readonly baseUrl: string;
  private readonly mode: "hosted" | "local";
  private readonly apiKey?: string;

  constructor(options: BuilderOsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.mode = options.mode;
    this.apiKey = options.mode === "hosted" ? options.apiKey : undefined;
  }

  async runWorkflow(request: RunWorkflowRequest): Promise<RunWorkflowResponse> {
    return this.requestJson<RunWorkflowResponse>("/v1/workflows/run", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }

  async getUsageSummary(params: { from: string; to: string }): Promise<UsageSummaryResponse> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to
    });
    return this.requestJson<UsageSummaryResponse>(`/v1/usage/summary?${query.toString()}`, {
      method: "GET"
    });
  }

  async getUsageByRoute(params: { from: string; to: string }): Promise<{
    from: string;
    to: string;
    items: UsageByRouteItem[];
  }> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to
    });
    return this.requestJson<{ from: string; to: string; items: UsageByRouteItem[] }>(
      `/v1/usage/by-route?${query.toString()}`,
      { method: "GET" }
    );
  }

  async getUsageByApiKey(params: { from: string; to: string }): Promise<{
    from: string;
    to: string;
    items: UsageByApiKeyItem[];
  }> {
    const query = new URLSearchParams({
      from: params.from,
      to: params.to
    });
    return this.requestJson<{ from: string; to: string; items: UsageByApiKeyItem[] }>(
      `/v1/usage/by-api-key?${query.toString()}`,
      { method: "GET" }
    );
  }

  async listWorkflowRuns(params?: {
    limit?: number;
    status?: "success" | "error";
    workflowName?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }): Promise<{ items: WorkflowRunRecord[]; limit: number; nextCursor?: string }> {
    const query = new URLSearchParams();
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.workflowName) {
      query.set("workflowName", params.workflowName);
    }
    if (params?.from) {
      query.set("from", params.from);
    }
    if (params?.to) {
      query.set("to", params.to);
    }
    if (params?.cursor) {
      query.set("cursor", params.cursor);
    }
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return this.requestJson<{ items: WorkflowRunRecord[]; limit: number; nextCursor?: string }>(`/v1/workflows${suffix}`, {
      method: "GET"
    });
  }

  async replayWorkflowRun(requestId: string): Promise<RunWorkflowResponse> {
    return this.requestJson<RunWorkflowResponse>(`/v1/workflows/${requestId}/replay`, {
      method: "POST"
    });
  }

  async listApiKeys(): Promise<{ items: ApiKeySummary[] }> {
    return this.requestJson<{ items: ApiKeySummary[] }>("/v1/api-keys", { method: "GET" });
  }

  async createApiKey(params?: { scopes?: string[] }): Promise<ApiKeySummary & { rawKey: string }> {
    return this.requestJson<ApiKeySummary & { rawKey: string }>("/v1/api-keys", {
      method: "POST",
      body: JSON.stringify({ scopes: params?.scopes })
    });
  }

  async revokeApiKey(id: string): Promise<{ id: string; status: "inactive" }> {
    return this.requestJson<{ id: string; status: "inactive" }>(`/v1/api-keys/${id}/revoke`, {
      method: "POST"
    });
  }

  private async requestJson<T>(path: string, init: { method: string; body?: string }): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.mode === "hosted") {
      headers["x-builder-os-api-key"] = this.apiKey as string;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method,
      headers,
      body: init.body
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gateway request failed (${response.status}): ${body}`);
    }

    return (await response.json()) as T;
  }
}
