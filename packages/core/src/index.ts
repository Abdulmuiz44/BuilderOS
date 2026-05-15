import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  ArtifactType,
  BuilderArtifact,
  BuilderCapability,
  BuilderLog,
  BuilderPlugin,
  BuilderPluginManifest,
  BuilderRun,
  BuilderRunStep,
  BuilderSecret,
  BuilderWorkflow,
  BuilderWorkflowStep,
  JsonObject,
  RunStatus,
  StepStatus,
  WorkflowContext,
  WorkflowDefinition
} from "@builderos/types";

export class WorkflowEngine {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  constructor(definitions: WorkflowDefinition[]) {
    for (const definition of definitions) {
      this.workflows.set(definition.name, definition);
    }
  }

  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }

  async run(workflowName: string, input: Record<string, unknown>, ctx: WorkflowContext): Promise<Record<string, unknown>> {
    const workflow = this.workflows.get(workflowName);

    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    return workflow.run(input, ctx);
  }
}

type SqliteDatabase = {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: unknown };
  };
};

type CapabilityHandlerContext = {
  run: BuilderRun;
  step: BuilderWorkflowStep;
  input: JsonObject;
  store: BuilderOsStore;
  log: (level: BuilderLog["level"], message: string, metadata?: JsonObject) => void;
  createArtifact: (artifact: { title: string; type: ArtifactType; content: string; metadata?: JsonObject }) => BuilderArtifact;
};

type CapabilityDefinition = BuilderCapability & {
  handler: (ctx: CapabilityHandlerContext) => Promise<JsonObject> | JsonObject;
};

function now(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function parseJsonObject(value: unknown): JsonObject {
  if (typeof value !== "string" || value.length === 0) {
    return {};
  }
  return JSON.parse(value) as JsonObject;
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }
  return JSON.parse(value) as string[];
}

function maskSecret(value: string): string {
  if (value.length <= 4) {
    return "••••";
  }
  return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function mergeTemplate(value: unknown, input: JsonObject): unknown {
  if (typeof value === "string") {
    return value.replaceAll(/\{\{\s*input\.([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
      const replacement = input[key];
      return typeof replacement === "string" || typeof replacement === "number" || typeof replacement === "boolean"
        ? String(replacement)
        : "";
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => mergeTemplate(item, input));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mergeTemplate(item, input)]));
  }

  return value;
}

function requiredPermissionsForSteps(steps: BuilderWorkflowStep[]): string[] {
  return Array.from(new Set(steps.flatMap((step) => step.requiredPermissions))).sort();
}

export const pluginManifests: BuilderPluginManifest[] = [
  {
    id: "builderos.files",
    name: "Files",
    description: "Local file capability provider with constrained read, write, and list operations.",
    version: "0.1.0",
    author: "BuilderOS",
    capabilities: ["file.read", "file.write", "file.list"],
    permissions: ["filesystem.read", "filesystem.write"]
  },
  {
    id: "builderos.safe-shell",
    name: "Safe Shell",
    description: "Mocked shell command provider for planning and demos; unrestricted execution is intentionally disabled.",
    version: "0.1.0",
    author: "BuilderOS",
    capabilities: ["shell.command.mocked"],
    permissions: ["shell.execute"]
  },
  {
    id: "builderos.git",
    name: "Git Inspector",
    description: "Mocked repository inspection provider for early repo-review workflows.",
    version: "0.1.0",
    author: "BuilderOS",
    capabilities: ["git.inspect.mocked"],
    permissions: ["git.read"]
  },
  {
    id: "builderos.research",
    name: "Research Notes",
    description: "Structured research-note generator for product and launch planning workflows.",
    version: "0.1.0",
    author: "BuilderOS",
    capabilities: ["research.note"],
    permissions: ["artifacts.write"]
  },
  {
    id: "builderos.artifacts",
    name: "Artifacts",
    description: "Creates markdown, text, JSON, and link artifacts attached to workflow runs.",
    version: "0.1.0",
    author: "BuilderOS",
    capabilities: ["artifact.create"],
    permissions: ["artifacts.write"]
  }
];

export const capabilities: CapabilityDefinition[] = [
  {
    id: "file.read",
    name: "Read file",
    description: "Reads a local text file. MVP handler returns a safe preview stub unless a file path is provided for future extension.",
    pluginId: "builderos.files",
    inputSchema: { type: "object", properties: { path: { type: "string" } } },
    outputSchema: { type: "object", properties: { content: { type: "string" } } },
    requiredPermissions: ["filesystem.read"],
    enabled: true,
    handler: ({ input }) => ({ path: String(input.path ?? ""), content: "File read capability is registered. Direct file reads are intentionally conservative in this MVP." })
  },
  {
    id: "file.write",
    name: "Write file",
    description: "Registers an intended local file write without performing unrestricted writes by default.",
    pluginId: "builderos.files",
    inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } },
    outputSchema: { type: "object", properties: { written: { type: "boolean" } } },
    requiredPermissions: ["filesystem.write"],
    enabled: true,
    handler: ({ input }) => ({ path: String(input.path ?? ""), written: false, note: "Unrestricted writes are disabled for the first local MVP." })
  },
  {
    id: "file.list",
    name: "List files",
    description: "Returns a mocked local file listing for workflow planning.",
    pluginId: "builderos.files",
    inputSchema: { type: "object", properties: { path: { type: "string" } } },
    outputSchema: { type: "object", properties: { files: { type: "array" } } },
    requiredPermissions: ["filesystem.read"],
    enabled: true,
    handler: ({ input }) => ({ path: String(input.path ?? "."), files: ["README.md", "package.json", "apps/", "packages/"] })
  },
  {
    id: "shell.command.mocked",
    name: "Mock shell command",
    description: "Captures intended shell commands and returns deterministic mocked output. It never executes the command.",
    pluginId: "builderos.safe-shell",
    inputSchema: { type: "object", properties: { command: { type: "string" } } },
    outputSchema: { type: "object", properties: { executed: { type: "boolean" }, stdout: { type: "string" } } },
    requiredPermissions: ["shell.execute"],
    enabled: true,
    handler: ({ input, log }) => {
      const command = String(input.command ?? "");
      log("warn", "Mock shell command requested; command was not executed.", { command });
      return { command, executed: false, stdout: `Mocked command output for: ${command}` };
    }
  },
  {
    id: "git.inspect.mocked",
    name: "Mock git inspect",
    description: "Returns a safe repository inspection summary without invoking git.",
    pluginId: "builderos.git",
    inputSchema: { type: "object", properties: { focus: { type: "string" } } },
    outputSchema: { type: "object", properties: { summary: { type: "string" }, findings: { type: "array" } } },
    requiredPermissions: ["git.read"],
    enabled: true,
    handler: ({ input }) => ({
      summary: `Mock repo review focused on ${String(input.focus ?? "architecture")}`,
      findings: ["Identify package boundaries", "Check README setup path", "Review tests before release"]
    })
  },
  {
    id: "research.note",
    name: "Research note",
    description: "Creates a structured markdown research note from workflow inputs.",
    pluginId: "builderos.research",
    inputSchema: { type: "object", properties: { title: { type: "string" }, prompt: { type: "string" } } },
    outputSchema: { type: "object", properties: { note: { type: "string" } } },
    requiredPermissions: ["artifacts.write"],
    enabled: true,
    handler: ({ input }) => {
      const title = String(input.title ?? "Research Note");
      const prompt = String(input.prompt ?? "");
      return {
        note: `# ${title}\n\n## Context\n${prompt}\n\n## Signals to validate\n- User pain and urgency\n- Existing alternatives\n- Distribution channels\n- Clear next experiment\n\n## Recommended next step\nRun one focused validation interview or repo inspection pass before building.`
      };
    }
  },
  {
    id: "artifact.create",
    name: "Create artifact",
    description: "Attaches a markdown, text, JSON, or link artifact to a run.",
    pluginId: "builderos.artifacts",
    inputSchema: { type: "object", properties: { title: { type: "string" }, type: { type: "string" }, content: { type: "string" } } },
    outputSchema: { type: "object", properties: { artifactId: { type: "string" } } },
    requiredPermissions: ["artifacts.write"],
    enabled: true,
    handler: ({ input, createArtifact }) => {
      const artifact = createArtifact({
        title: String(input.title ?? "Run artifact"),
        type: (String(input.type ?? "markdown") as ArtifactType) || "markdown",
        content: String(input.content ?? "")
      });
      return { artifactId: artifact.id, title: artifact.title, type: artifact.type };
    }
  }
];

export const referenceWorkflows: BuilderWorkflow[] = [
  {
    id: "wf_product_idea_research",
    name: "Product Idea Research",
    description: "Turn a raw product idea into a validation brief with target users, risks, and next experiments.",
    category: "Product Research",
    inputSchema: { type: "object", properties: { idea: { type: "string" }, audience: { type: "string" } }, required: ["idea"] },
    outputExpectations: ["Research note", "Validation questions", "Next experiment"],
    enabled: true,
    requiredPermissions: ["artifacts.write"],
    steps: [
      { id: "step_research_note", name: "Synthesize research note", description: "Create a structured product research brief.", order: 1, capabilityId: "research.note", input: { title: "Product Idea Research", prompt: "Idea: {{input.idea}}\nAudience: {{input.audience}}" }, requiredPermissions: ["artifacts.write"] },
      { id: "step_research_artifact", name: "Save validation brief", description: "Attach the research output as an artifact.", order: 2, capabilityId: "artifact.create", input: { title: "Product validation brief", type: "markdown", content: "# Product validation brief\n\nIdea: {{input.idea}}\n\nAudience: {{input.audience}}\n\n## Validation checklist\n- Interview five target users\n- Compare alternatives\n- Define one paid signal\n- Pick a tiny MVP scope" }, requiredPermissions: ["artifacts.write"] }
    ],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "wf_repo_review",
    name: "Repo Review",
    description: "Inspect a repository at a high level and produce an architecture and quality review checklist.",
    category: "Repo Analysis",
    inputSchema: { type: "object", properties: { focus: { type: "string" }, repoPath: { type: "string" } } },
    outputExpectations: ["Repo findings", "Review checklist"],
    enabled: true,
    requiredPermissions: ["filesystem.read", "git.read", "artifacts.write"],
    steps: [
      { id: "step_list_files", name: "List repository files", description: "Collect a safe mocked inventory of repository files.", order: 1, capabilityId: "file.list", input: { path: "{{input.repoPath}}" }, requiredPermissions: ["filesystem.read"] },
      { id: "step_git_inspect", name: "Inspect repository", description: "Generate a mocked git inspection summary.", order: 2, capabilityId: "git.inspect.mocked", input: { focus: "{{input.focus}}" }, requiredPermissions: ["git.read"] },
      { id: "step_repo_artifact", name: "Create repo review artifact", description: "Save review checklist and findings.", order: 3, capabilityId: "artifact.create", input: { title: "Repository review", type: "markdown", content: "# Repository review\n\nFocus: {{input.focus}}\nPath: {{input.repoPath}}\n\n## Checklist\n- Architecture boundaries\n- Test coverage\n- Setup docs\n- Release path\n- Security-sensitive operations" }, requiredPermissions: ["artifacts.write"] }
    ],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "wf_landing_page_plan",
    name: "Landing Page Plan",
    description: "Create a concise landing-page structure for a product, audience, and primary CTA.",
    category: "Documentation",
    inputSchema: { type: "object", properties: { product: { type: "string" }, audience: { type: "string" }, cta: { type: "string" } } },
    outputExpectations: ["Page sections", "Positioning copy", "CTA plan"],
    enabled: true,
    requiredPermissions: ["artifacts.write"],
    steps: [
      { id: "step_landing_artifact", name: "Draft landing-page plan", description: "Attach a markdown landing-page plan.", order: 1, capabilityId: "artifact.create", input: { title: "Landing page plan", type: "markdown", content: "# Landing page plan\n\nProduct: {{input.product}}\nAudience: {{input.audience}}\nCTA: {{input.cta}}\n\n## Sections\n1. Hero promise\n2. Pain and urgency\n3. Workflow demo\n4. Social proof placeholder\n5. Final CTA" }, requiredPermissions: ["artifacts.write"] }
    ],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "wf_feature_implementation_plan",
    name: "Feature Implementation Plan",
    description: "Break a feature request into implementation steps, test plan, risks, and release notes.",
    category: "App Scaffolding",
    inputSchema: { type: "object", properties: { feature: { type: "string" }, constraints: { type: "string" } } },
    outputExpectations: ["Implementation checklist", "Test plan", "Risks"],
    enabled: true,
    requiredPermissions: ["artifacts.write", "shell.execute"],
    steps: [
      { id: "step_mock_test_command", name: "Plan verification command", description: "Record the intended test command without running it.", order: 1, capabilityId: "shell.command.mocked", input: { command: "pnpm typecheck && pnpm test" }, requiredPermissions: ["shell.execute"] },
      { id: "step_feature_artifact", name: "Create implementation plan", description: "Attach implementation plan artifact.", order: 2, capabilityId: "artifact.create", input: { title: "Feature implementation plan", type: "markdown", content: "# Feature implementation plan\n\nFeature: {{input.feature}}\nConstraints: {{input.constraints}}\n\n## Steps\n- Clarify acceptance criteria\n- Identify affected modules\n- Implement smallest vertical slice\n- Add tests and docs\n- Prepare release note\n\n## Safety\nMocked shell command was recorded only; nothing executed." }, requiredPermissions: ["artifacts.write"] }
    ],
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "wf_launch_checklist",
    name: "Launch Checklist",
    description: "Generate a launch readiness checklist for a project or release.",
    category: "Launch",
    inputSchema: { type: "object", properties: { project: { type: "string" }, launchDate: { type: "string" } } },
    outputExpectations: ["Launch checklist", "Owner prompts", "Risk reminders"],
    enabled: true,
    requiredPermissions: ["artifacts.write"],
    steps: [
      { id: "step_launch_artifact", name: "Create launch checklist", description: "Attach launch checklist artifact.", order: 1, capabilityId: "artifact.create", input: { title: "Launch checklist", type: "markdown", content: "# Launch checklist\n\nProject: {{input.project}}\nLaunch date: {{input.launchDate}}\n\n## Before launch\n- Confirm positioning and CTA\n- Verify onboarding path\n- Prepare support responses\n- Schedule announcement channels\n- Define success metrics\n\n## After launch\n- Monitor errors and feedback\n- Summarize learnings\n- Pick follow-up fixes" }, requiredPermissions: ["artifacts.write"] }
    ],
    createdAt: now(),
    updatedAt: now()
  }
];

export class BuilderOsStore {
  private constructor(private readonly db: SqliteDatabase) {}

  static async open(databasePath = process.env.BUILDEROS_DB_PATH ?? join(process.cwd(), ".builderos", "builderos.sqlite")): Promise<BuilderOsStore> {
    mkdirSync(dirname(databasePath), { recursive: true });
    const sqlite = (await import("node:sqlite")) as unknown as { DatabaseSync: new (path: string) => SqliteDatabase };
    const db = new sqlite.DatabaseSync(databasePath);
    const store = new BuilderOsStore(db);
    store.migrate();
    store.seedBuiltIns();
    return store;
  }

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        output_expectations TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        required_permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        capability_id TEXT NOT NULL,
        input TEXT NOT NULL,
        required_permissions TEXT NOT NULL,
        FOREIGN KEY(workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        version TEXT NOT NULL,
        author TEXT NOT NULL,
        permissions TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        manifest TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS capabilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        plugin_id TEXT NOT NULL,
        input_schema TEXT NOT NULL,
        output_schema TEXT NOT NULL,
        required_permissions TEXT NOT NULL,
        enabled INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        output_summary TEXT,
        accepted_permissions TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS run_steps (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        workflow_step_id TEXT NOT NULL,
        name TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        capability_id TEXT NOT NULL,
        status TEXT NOT NULL,
        input TEXT NOT NULL,
        output TEXT,
        error TEXT,
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        run_step_id TEXT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        run_step_id TEXT,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(run_id) REFERENCES runs(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        provider TEXT NOT NULL,
        value TEXT NOT NULL,
        masked_value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  seedBuiltIns(): void {
    for (const manifest of pluginManifests) {
      this.upsertPlugin({ ...manifest, enabled: true, manifest });
    }
    for (const capability of capabilities) {
      this.upsertCapability(capability);
    }
    for (const workflow of referenceWorkflows) {
      if (!this.getWorkflow(workflow.id)) {
        this.upsertWorkflow(workflow);
      }
    }
  }

  upsertPlugin(plugin: BuilderPlugin): void {
    this.db.prepare(`INSERT OR REPLACE INTO plugins (id, name, description, version, author, permissions, capabilities, enabled, manifest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      plugin.id,
      plugin.name,
      plugin.description,
      plugin.version,
      plugin.author,
      json(plugin.permissions),
      json(plugin.capabilities),
      plugin.enabled ? 1 : 0,
      json(plugin.manifest)
    );
  }

  listPlugins(): BuilderPlugin[] {
    return this.db.prepare("SELECT * FROM plugins ORDER BY name").all().map((row) => this.pluginFromRow(row as Record<string, unknown>));
  }

  upsertCapability(capability: BuilderCapability): void {
    this.db.prepare(`INSERT OR REPLACE INTO capabilities (id, name, description, plugin_id, input_schema, output_schema, required_permissions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      capability.id,
      capability.name,
      capability.description,
      capability.pluginId,
      json(capability.inputSchema),
      json(capability.outputSchema),
      json(capability.requiredPermissions),
      capability.enabled ? 1 : 0
    );
  }

  listCapabilities(): BuilderCapability[] {
    return this.db.prepare("SELECT * FROM capabilities ORDER BY id").all().map((row) => this.capabilityFromRow(row as Record<string, unknown>));
  }

  getCapability(idValue: string): BuilderCapability | undefined {
    const row = this.db.prepare("SELECT * FROM capabilities WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    return row ? this.capabilityFromRow(row) : undefined;
  }

  upsertWorkflow(workflow: BuilderWorkflow): void {
    this.db.prepare(`INSERT OR REPLACE INTO workflows (id, name, description, category, input_schema, output_expectations, enabled, required_permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      workflow.id,
      workflow.name,
      workflow.description,
      workflow.category,
      json(workflow.inputSchema),
      json(workflow.outputExpectations),
      workflow.enabled ? 1 : 0,
      json(workflow.requiredPermissions.length > 0 ? workflow.requiredPermissions : requiredPermissionsForSteps(workflow.steps)),
      workflow.createdAt,
      now()
    );
    this.db.prepare("DELETE FROM workflow_steps WHERE workflow_id = ?").run(workflow.id);
    for (const step of workflow.steps) {
      this.db.prepare(`INSERT INTO workflow_steps (id, workflow_id, name, description, step_order, capability_id, input, required_permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        step.id,
        workflow.id,
        step.name,
        step.description,
        step.order,
        step.capabilityId,
        json(step.input),
        json(step.requiredPermissions)
      );
    }
  }

  listWorkflows(): BuilderWorkflow[] {
    const rows = this.db.prepare("SELECT * FROM workflows ORDER BY name").all() as Record<string, unknown>[];
    return rows.map((row) => this.workflowFromRow(row));
  }

  getWorkflow(idValue: string): BuilderWorkflow | undefined {
    const row = this.db.prepare("SELECT * FROM workflows WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    return row ? this.workflowFromRow(row) : undefined;
  }

  createRun(params: { workflow: BuilderWorkflow; input: JsonObject; acceptedPermissions: string[] }): BuilderRun {
    const run: BuilderRun = {
      id: id("run"),
      workflowId: params.workflow.id,
      workflowName: params.workflow.name,
      status: "queued",
      input: params.input,
      acceptedPermissions: params.acceptedPermissions,
      createdAt: now()
    };
    this.db.prepare(`INSERT INTO runs (id, workflow_id, workflow_name, status, input, accepted_permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      run.id,
      run.workflowId,
      run.workflowName,
      run.status,
      json(run.input),
      json(run.acceptedPermissions),
      run.createdAt
    );
    for (const step of params.workflow.steps) {
      this.createRunStep(run.id, step, "pending", mergeTemplate(step.input, params.input) as JsonObject);
    }
    return run;
  }

  listRuns(): BuilderRun[] {
    return (this.db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all() as Record<string, unknown>[]).map((row) => this.runFromRow(row));
  }

  getRun(idValue: string): BuilderRun | undefined {
    const row = this.db.prepare("SELECT * FROM runs WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    return row ? this.runFromRow(row) : undefined;
  }

  updateRun(idValue: string, patch: Partial<Pick<BuilderRun, "status" | "startedAt" | "completedAt" | "outputSummary" | "error">>): void {
    const current = this.getRun(idValue);
    if (!current) return;
    this.db.prepare(`UPDATE runs SET status = ?, started_at = ?, completed_at = ?, output_summary = ?, error = ? WHERE id = ?`).run(
      patch.status ?? current.status,
      (patch.startedAt ?? current.startedAt) ?? null,
      (patch.completedAt ?? current.completedAt) ?? null,
      (patch.outputSummary ?? current.outputSummary) ?? null,
      (patch.error ?? current.error) ?? null,
      idValue
    );
  }

  listRunSteps(runId: string): BuilderRunStep[] {
    return (this.db.prepare("SELECT * FROM run_steps WHERE run_id = ? ORDER BY step_order").all(runId) as Record<string, unknown>[]).map((row) => this.runStepFromRow(row));
  }

  updateRunStep(idValue: string, patch: Partial<Pick<BuilderRunStep, "status" | "startedAt" | "completedAt" | "output" | "error">>): void {
    const current = this.db.prepare("SELECT * FROM run_steps WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    if (!current) return;
    const existing = this.runStepFromRow(current);
    this.db.prepare(`UPDATE run_steps SET status = ?, started_at = ?, completed_at = ?, output = ?, error = ? WHERE id = ?`).run(
      patch.status ?? existing.status,
      (patch.startedAt ?? existing.startedAt) ?? null,
      (patch.completedAt ?? existing.completedAt) ?? null,
      patch.output ? json(patch.output) : existing.output ? json(existing.output) : null,
      (patch.error ?? existing.error) ?? null,
      idValue
    );
  }

  createLog(log: Omit<BuilderLog, "id" | "createdAt">): BuilderLog {
    const record: BuilderLog = { ...log, id: id("log"), createdAt: now() };
    this.db.prepare(`INSERT INTO logs (id, run_id, run_step_id, level, message, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      record.id,
      record.runId,
      record.runStepId ?? null,
      record.level,
      record.message,
      record.metadata ? json(record.metadata) : null,
      record.createdAt
    );
    return record;
  }

  listLogs(runId: string): BuilderLog[] {
    return (this.db.prepare("SELECT * FROM logs WHERE run_id = ? ORDER BY created_at").all(runId) as Record<string, unknown>[]).map((row) => this.logFromRow(row));
  }

  createArtifact(artifact: Omit<BuilderArtifact, "id" | "createdAt">): BuilderArtifact {
    const record: BuilderArtifact = { ...artifact, id: id("art"), createdAt: now() };
    this.db.prepare(`INSERT INTO artifacts (id, run_id, run_step_id, title, type, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.id,
      record.runId,
      record.runStepId ?? null,
      record.title,
      record.type,
      record.content,
      record.metadata ? json(record.metadata) : null,
      record.createdAt
    );
    return record;
  }

  listArtifacts(runId?: string): BuilderArtifact[] {
    const rows = runId
      ? (this.db.prepare("SELECT * FROM artifacts WHERE run_id = ? ORDER BY created_at DESC").all(runId) as Record<string, unknown>[])
      : (this.db.prepare("SELECT * FROM artifacts ORDER BY created_at DESC").all() as Record<string, unknown>[]);
    return rows.map((row) => this.artifactFromRow(row));
  }

  upsertSecret(params: { name: string; description: string; provider: string; value: string }): BuilderSecret {
    const existing = this.db.prepare("SELECT * FROM secrets WHERE name = ?").get(params.name) as Record<string, unknown> | undefined;
    const timestamp = now();
    const record: BuilderSecret = {
      id: existing ? String(existing.id) : id("sec"),
      name: params.name,
      description: params.description,
      provider: params.provider,
      maskedValue: maskSecret(params.value),
      createdAt: existing ? String(existing.created_at) : timestamp,
      updatedAt: timestamp
    };
    this.db.prepare(`INSERT OR REPLACE INTO secrets (id, name, description, provider, value, masked_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.id,
      record.name,
      record.description,
      record.provider,
      params.value,
      record.maskedValue,
      record.createdAt,
      record.updatedAt
    );
    return record;
  }

  listSecrets(): BuilderSecret[] {
    return (this.db.prepare("SELECT id, name, description, provider, masked_value, created_at, updated_at FROM secrets ORDER BY name").all() as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      provider: String(row.provider),
      maskedValue: String(row.masked_value),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  dashboard(): { workflows: number; plugins: number; succeededRuns: number; failedRuns: number; recentRuns: BuilderRun[]; recentArtifacts: BuilderArtifact[] } {
    const workflows = Number((this.db.prepare("SELECT COUNT(*) as count FROM workflows").get() as { count: number }).count);
    const plugins = Number((this.db.prepare("SELECT COUNT(*) as count FROM plugins").get() as { count: number }).count);
    const succeededRuns = Number((this.db.prepare("SELECT COUNT(*) as count FROM runs WHERE status = 'succeeded'").get() as { count: number }).count);
    const failedRuns = Number((this.db.prepare("SELECT COUNT(*) as count FROM runs WHERE status = 'failed'").get() as { count: number }).count);
    return { workflows, plugins, succeededRuns, failedRuns, recentRuns: this.listRuns().slice(0, 5), recentArtifacts: this.listArtifacts().slice(0, 5) };
  }

  private createRunStep(runId: string, step: BuilderWorkflowStep, status: StepStatus, input: JsonObject): BuilderRunStep {
    const record: BuilderRunStep = {
      id: id("rs"),
      runId,
      workflowStepId: step.id,
      name: step.name,
      order: step.order,
      capabilityId: step.capabilityId,
      status,
      input
    };
    this.db.prepare(`INSERT INTO run_steps (id, run_id, workflow_step_id, name, step_order, capability_id, status, input) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      record.id,
      record.runId,
      record.workflowStepId,
      record.name,
      record.order,
      record.capabilityId,
      record.status,
      json(record.input)
    );
    return record;
  }

  private workflowFromRow(row: Record<string, unknown>): BuilderWorkflow {
    const steps = (this.db.prepare("SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order").all(row.id) as Record<string, unknown>[]).map((step) => ({
      id: String(step.id),
      name: String(step.name),
      description: String(step.description),
      order: Number(step.step_order),
      capabilityId: String(step.capability_id),
      input: parseJsonObject(step.input),
      requiredPermissions: parseJsonArray(step.required_permissions)
    }));
    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      category: String(row.category),
      inputSchema: parseJsonObject(row.input_schema),
      outputExpectations: parseJsonArray(row.output_expectations),
      enabled: Number(row.enabled) === 1,
      requiredPermissions: parseJsonArray(row.required_permissions),
      steps,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private pluginFromRow(row: Record<string, unknown>): BuilderPlugin {
    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      version: String(row.version),
      author: String(row.author),
      permissions: parseJsonArray(row.permissions),
      capabilities: parseJsonArray(row.capabilities),
      enabled: Number(row.enabled) === 1,
      manifest: parseJsonObject(row.manifest) as unknown as BuilderPluginManifest
    };
  }

  private capabilityFromRow(row: Record<string, unknown>): BuilderCapability {
    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      pluginId: String(row.plugin_id),
      inputSchema: parseJsonObject(row.input_schema),
      outputSchema: parseJsonObject(row.output_schema),
      requiredPermissions: parseJsonArray(row.required_permissions),
      enabled: Number(row.enabled) === 1
    };
  }

  private runFromRow(row: Record<string, unknown>): BuilderRun {
    return {
      id: String(row.id),
      workflowId: String(row.workflow_id),
      workflowName: String(row.workflow_name),
      status: String(row.status) as RunStatus,
      input: parseJsonObject(row.input),
      outputSummary: row.output_summary ? String(row.output_summary) : undefined,
      acceptedPermissions: parseJsonArray(row.accepted_permissions),
      error: row.error ? String(row.error) : undefined,
      createdAt: String(row.created_at),
      startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined
    };
  }

  private runStepFromRow(row: Record<string, unknown>): BuilderRunStep {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      workflowStepId: String(row.workflow_step_id),
      name: String(row.name),
      order: Number(row.step_order),
      capabilityId: String(row.capability_id),
      status: String(row.status) as StepStatus,
      input: parseJsonObject(row.input),
      output: row.output ? parseJsonObject(row.output) : undefined,
      error: row.error ? String(row.error) : undefined,
      startedAt: row.started_at ? String(row.started_at) : undefined,
      completedAt: row.completed_at ? String(row.completed_at) : undefined
    };
  }

  private logFromRow(row: Record<string, unknown>): BuilderLog {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      runStepId: row.run_step_id ? String(row.run_step_id) : undefined,
      level: String(row.level) as BuilderLog["level"],
      message: String(row.message),
      metadata: row.metadata ? parseJsonObject(row.metadata) : undefined,
      createdAt: String(row.created_at)
    };
  }

  private artifactFromRow(row: Record<string, unknown>): BuilderArtifact {
    return {
      id: String(row.id),
      runId: String(row.run_id),
      runStepId: row.run_step_id ? String(row.run_step_id) : undefined,
      title: String(row.title),
      type: String(row.type) as ArtifactType,
      content: String(row.content),
      metadata: row.metadata ? parseJsonObject(row.metadata) : undefined,
      createdAt: String(row.created_at)
    };
  }
}

export class RunExecutor {
  private readonly handlers = new Map(capabilities.map((capability) => [capability.id, capability]));

  constructor(private readonly store: BuilderOsStore) {}

  async triggerWorkflow(workflowId: string, input: JsonObject, acceptedPermissions: string[]): Promise<BuilderRun> {
    const workflow = this.store.getWorkflow(workflowId);
    if (!workflow) throw new Error(`Unknown workflow: ${workflowId}`);
    if (!workflow.enabled) throw new Error(`Workflow is disabled: ${workflow.name}`);

    const required = workflow.requiredPermissions.length > 0 ? workflow.requiredPermissions : requiredPermissionsForSteps(workflow.steps);
    const missing = required.filter((permission) => !acceptedPermissions.includes(permission));
    if (missing.length > 0) {
      throw new Error(`Missing required permissions: ${missing.join(", ")}`);
    }

    const run = this.store.createRun({ workflow, input, acceptedPermissions });
    await this.executeRun(run.id);
    return this.store.getRun(run.id) ?? run;
  }

  async executeRun(runId: string): Promise<void> {
    const run = this.store.getRun(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);

    this.store.updateRun(runId, { status: "running", startedAt: now() });
    this.store.createLog({ runId, level: "info", message: `Started workflow run for ${run.workflowName}.` });

    try {
      const steps = this.store.listRunSteps(runId);
      const outputs: JsonObject = {};
      for (const step of steps) {
        const handler = this.handlers.get(step.capabilityId);
        const capability = this.store.getCapability(step.capabilityId);
        if (!handler || !capability?.enabled) {
          throw new Error(`Capability is not available: ${step.capabilityId}`);
        }
        const missing = capability.requiredPermissions.filter((permission) => !run.acceptedPermissions.includes(permission));
        if (missing.length > 0) {
          throw new Error(`Step ${step.name} is missing permissions: ${missing.join(", ")}`);
        }

        this.store.updateRunStep(step.id, { status: "running", startedAt: now() });
        this.store.createLog({ runId, runStepId: step.id, level: "info", message: `Running step: ${step.name}.`, metadata: { capabilityId: step.capabilityId } });
        try {
          const output = await handler.handler({
            run,
            step: { id: step.workflowStepId, name: step.name, description: "", order: step.order, capabilityId: step.capabilityId, input: step.input, requiredPermissions: capability.requiredPermissions },
            input: step.input,
            store: this.store,
            log: (level, message, metadata) => this.store.createLog({ runId, runStepId: step.id, level, message, metadata }),
            createArtifact: (artifact) => this.store.createArtifact({ ...artifact, runId, runStepId: step.id })
          });
          outputs[step.name] = output;
          if (step.capabilityId === "research.note" && typeof output.note === "string") {
            this.store.createArtifact({ runId, runStepId: step.id, title: step.name, type: "markdown", content: output.note });
          }
          this.store.updateRunStep(step.id, { status: "succeeded", completedAt: now(), output });
          this.store.createLog({ runId, runStepId: step.id, level: "info", message: `Completed step: ${step.name}.` });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown step error";
          this.store.updateRunStep(step.id, { status: "failed", completedAt: now(), error: message });
          this.store.createLog({ runId, runStepId: step.id, level: "error", message });
          throw error;
        }
      }

      this.store.updateRun(runId, { status: "succeeded", completedAt: now(), outputSummary: `Completed ${steps.length} step(s) and created ${this.store.listArtifacts(runId).length} artifact(s).` });
      this.store.createLog({ runId, level: "info", message: "Workflow run succeeded.", metadata: outputs });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown run error";
      this.store.updateRun(runId, { status: "failed", completedAt: now(), error: message });
      this.store.createLog({ runId, level: "error", message });
    }
  }
}

export async function openBuilderOs(): Promise<{ store: BuilderOsStore; executor: RunExecutor }> {
  const store = await BuilderOsStore.open();
  return { store, executor: new RunExecutor(store) };
}
