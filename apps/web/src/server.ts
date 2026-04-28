import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);
const gatewayBaseUrl = process.env.BUILDER_OS_GATEWAY_URL ?? "http://localhost:8787";
const dashboardApiKey = process.env.BUILDER_OS_DASHBOARD_API_KEY ?? process.env.BUILDER_OS_API_KEY;

type UsageSummary = {
  totalRequests: number;
  from: string;
  to: string;
};

type UsageByRoute = {
  items: Array<{ route: string; requestCount: number }>;
};

type UsageByApiKey = {
  items: Array<{ apiKeyId: string; keyPrefix: string | null; requestCount: number }>;
};

type WorkflowRuns = {
  items: Array<{
    requestId: string;
    workflowName: string;
    status: "success" | "error";
    mode: "hosted" | "local";
    ownerId: string;
    apiKeyId: string;
    createdAt: string;
    completedAt: string;
    errorMessage?: string;
  }>;
  limit: number;
};

type ApiKeys = {
  items: Array<{
    id: string;
    keyPrefix: string;
    ownerId: string;
    scopes: string[];
    status: "active" | "inactive";
    createdAt?: string;
  }>;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchGatewayJson<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};

  if (dashboardApiKey) {
    headers["x-builder-os-api-key"] = dashboardApiKey;
  }

  const response = await fetch(`${gatewayBaseUrl}${path}`, { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

async function fetchGatewayMaybe<T>(path: string): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fetchGatewayJson<T>(path);
    return { data };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Unknown request error" };
  }
}

function renderTableRows(rows: string[], colspan: number): string {
  return rows.length > 0
    ? rows.join("")
    : `<tr><td colspan=\"${colspan}\">No data in selected range.</td></tr>`;
}

function renderPage(params: {
  summary: UsageSummary;
  byRoute: UsageByRoute;
  byApiKey: UsageByApiKey;
  workflowRuns?: WorkflowRuns;
  workflowRunsError?: string;
  apiKeys?: ApiKeys;
  apiKeysError?: string;
}): string {
  const routeRows = params.byRoute.items.map(
    (item) =>
      `<tr><td>${escapeHtml(item.route)}</td><td>${item.requestCount}</td></tr>`
  );

  const keyRows = params.byApiKey.items.map(
    (item) =>
      `<tr><td>${escapeHtml(item.apiKeyId)}</td><td>${escapeHtml(item.keyPrefix ?? "unknown")}</td><td>${item.requestCount}</td></tr>`
  );

  const runRows = (params.workflowRuns?.items ?? []).map(
    (item) =>
      `<tr><td><code>${escapeHtml(item.requestId)}</code></td><td>${escapeHtml(item.workflowName)}</td><td>${escapeHtml(
        item.status
      )}</td><td>${escapeHtml(item.mode)}</td><td>${escapeHtml(item.createdAt)}</td></tr>`
  );

  const apiKeyRows = (params.apiKeys?.items ?? []).map(
    (item) =>
      `<tr><td><code>${escapeHtml(item.id)}</code></td><td><code>${escapeHtml(item.keyPrefix)}</code></td><td>${escapeHtml(
        item.status
      )}</td><td>${escapeHtml(item.scopes.join(", "))}</td></tr>`
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Builder OS Usage Dashboard</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: linear-gradient(150deg, #f6f7f1, #ece9dd);
        color: #171717;
      }
      .container {
        max-width: 1024px;
        margin: 0 auto;
        padding: 36px 20px 60px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 34px;
      }
      .meta {
        margin: 0;
        color: #444;
      }
      .card {
        background: #ffffff;
        border: 1px solid #d8d2c3;
        border-radius: 12px;
        padding: 18px;
        margin-top: 16px;
      }
      .total {
        font-size: 42px;
        font-weight: 700;
        margin: 8px 0 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        border-bottom: 1px solid #eee7d8;
        padding: 10px 6px;
      }
      code {
        background: #f1ede3;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .error {
        border-color: #e9b2b2;
        background: #fff5f5;
      }
    </style>
  </head>
  <body>
    <main class="container">
      <h1>Builder OS Usage Dashboard</h1>
      <p class="meta">Range: <code>${escapeHtml(params.summary.from)}</code> to <code>${escapeHtml(params.summary.to)}</code></p>

      <section class="card">
        <strong>Total Requests</strong>
        <div class="total">${params.summary.totalRequests}</div>
      </section>

      <section class="card">
        <strong>Requests by Route</strong>
        <table>
          <thead>
            <tr><th>Route</th><th>Requests</th></tr>
          </thead>
          <tbody>${renderTableRows(routeRows, 2)}</tbody>
        </table>
      </section>

      <section class="card">
        <strong>Requests by API Key</strong>
        <table>
          <thead>
            <tr><th>API Key ID</th><th>Prefix</th><th>Requests</th></tr>
          </thead>
          <tbody>${renderTableRows(keyRows, 3)}</tbody>
        </table>
      </section>

      <section class="card">
        <strong>Recent Workflow Runs</strong>
        ${
          params.workflowRunsError
            ? `<p>Unavailable: ${escapeHtml(params.workflowRunsError)}</p>`
            : `<table>
          <thead>
            <tr><th>Request ID</th><th>Workflow</th><th>Status</th><th>Mode</th><th>Created At</th></tr>
          </thead>
          <tbody>${renderTableRows(runRows, 5)}</tbody>
        </table>`
        }
      </section>

      <section class="card">
        <strong>API Key Inventory</strong>
        ${
          params.apiKeysError
            ? `<p>Unavailable: ${escapeHtml(params.apiKeysError)}</p>`
            : `<table>
          <thead>
            <tr><th>ID</th><th>Prefix</th><th>Status</th><th>Scopes</th></tr>
          </thead>
          <tbody>${renderTableRows(apiKeyRows, 4)}</tbody>
        </table>`
        }
      </section>
    </main>
  </body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dashboard Error</title></head>
  <body style="font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; background: #f9f7f3; margin: 0;">
    <main style="max-width: 900px; margin: 0 auto; padding: 40px 20px;">
      <section style="background: #fff5f5; border: 1px solid #e9b2b2; border-radius: 12px; padding: 18px;">
        <h1 style="margin-top: 0;">Usage Dashboard Unavailable</h1>
        <p>${escapeHtml(message)}</p>
        <p>Check <code>BUILDER_OS_GATEWAY_URL</code>, dashboard API key, and gateway health.</p>
      </section>
    </main>
  </body>
</html>`;
}

const server = createServer(async (_req, res) => {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const qs = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;

  try {
    const [summary, byRoute, byApiKey, workflowRunsResult, apiKeysResult] = await Promise.all([
      fetchGatewayJson<UsageSummary>(`/v1/usage/summary?${qs}`),
      fetchGatewayJson<UsageByRoute>(`/v1/usage/by-route?${qs}`),
      fetchGatewayJson<UsageByApiKey>(`/v1/usage/by-api-key?${qs}`),
      fetchGatewayMaybe<WorkflowRuns>("/v1/workflows?limit=20"),
      fetchGatewayMaybe<ApiKeys>("/v1/api-keys")
    ]);

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      renderPage({
        summary,
        byRoute,
        byApiKey,
        workflowRuns: workflowRunsResult.data,
        workflowRunsError: workflowRunsResult.error,
        apiKeys: apiKeysResult.data,
        apiKeysError: apiKeysResult.error
      })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown dashboard error";
    res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    res.end(renderErrorPage(message));
  }
});

server.listen(port, () => {
  console.log(`Builder OS Web listening on http://localhost:${port}`);
});
