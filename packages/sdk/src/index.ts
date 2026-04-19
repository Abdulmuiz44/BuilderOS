import type { RunWorkflowRequest, RunWorkflowResponse } from "@builderos/types";

export interface BuilderOsClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export class BuilderOsClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(options: BuilderOsClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  async runWorkflow(request: RunWorkflowRequest): Promise<RunWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/v1/workflows/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { "x-builder-os-api-key": this.apiKey } : {})
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gateway request failed (${response.status}): ${body}`);
    }

    return (await response.json()) as RunWorkflowResponse;
  }
}
