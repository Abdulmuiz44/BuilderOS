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
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };

    if (this.mode === "hosted") {
      headers["x-builder-os-api-key"] = this.apiKey as string;
    }

    const response = await fetch(`${this.baseUrl}/v1/workflows/run`, {
      method: "POST",
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gateway request failed (${response.status}): ${body}`);
    }

    return (await response.json()) as RunWorkflowResponse;
  }
}
