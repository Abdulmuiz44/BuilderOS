#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BuilderOsClient } from "@builderos/sdk";

type ApiMode = "hosted" | "local";

type Profile = {
  name: string;
  baseUrl: string;
  mode: ApiMode;
  apiKey?: string;
  apiKeyEnvVar?: string;
};

type CliConfig = {
  defaultProfile?: string;
  profiles: Record<string, Profile>;
};

function printUsage(): void {
  console.log("Builder OS CLI");
  console.log("Usage:");
  console.log("  builder-os run <workflow-name> [json-input]");
  console.log("  builder-os usage summary --from <iso> --to <iso>");
  console.log("  builder-os usage by-route --from <iso> --to <iso>");
  console.log("  builder-os usage by-api-key --from <iso> --to <iso>");
  console.log("  builder-os runs list [--limit <n>] [--status success|error] [--workflow <name>] [--from <iso>] [--to <iso>] [--cursor <iso>]");
  console.log("  builder-os runs replay <request-id>");
  console.log("  builder-os keys list");
  console.log("  builder-os keys create [--scopes <comma-separated-scopes>]");
  console.log("  builder-os keys revoke <id>");
  console.log("  builder-os profile set <name> [--base-url <url>] [--mode hosted|local] [--api-key <key>] [--api-key-env <ENV_VAR>]");
  console.log("  builder-os profile use <name>");
  console.log("  builder-os profile list");
  console.log("  builder-os profile show [name]");
}

function getConfigPath(): string {
  if (process.env.BUILDER_OS_CONFIG_FILE) {
    return process.env.BUILDER_OS_CONFIG_FILE;
  }

  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("Could not determine home directory for CLI config.");
  }

  return join(home, ".builderos", "config.json");
}

function loadConfig(): CliConfig {
  const path = getConfigPath();

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as CliConfig;
    return {
      defaultProfile: parsed.defaultProfile,
      profiles: parsed.profiles ?? {}
    };
  } catch {
    return {
      profiles: {}
    };
  }
}

function saveConfig(config: CliConfig): void {
  const path = getConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function parseOptions(argv: string[]): { positional: string[]; options: Record<string, string> } {
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for option --${key}`);
    }

    options[key] = value;
    index += 1;
  }

  return { positional, options };
}

function parseInput(rawInput?: string): Record<string, unknown> {
  if (!rawInput) {
    return {};
  }

  try {
    return JSON.parse(rawInput) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON input. Pass a valid JSON object as the third argument.");
  }
}

function profileFromLegacyEnv(name = "legacy-env"): Profile {
  const baseUrl = process.env.BUILDER_OS_GATEWAY_URL ?? "http://localhost:8787";
  const localMode = process.env.BUILDER_OS_ALLOW_ANON_LOCAL === "true";
  const mode: ApiMode = localMode ? "local" : "hosted";

  return {
    name,
    baseUrl,
    mode,
    apiKey: process.env.BUILDER_OS_API_KEY
  };
}

function resolveProfile(config: CliConfig, profileName?: string): Profile {
  if (profileName) {
    const profile = config.profiles[profileName];
    if (!profile) {
      throw new Error(`Profile '${profileName}' not found.`);
    }
    return profile;
  }

  if (config.defaultProfile) {
    const profile = config.profiles[config.defaultProfile];
    if (profile) {
      return profile;
    }
  }

  return profileFromLegacyEnv();
}

function resolveApiKey(profile: Profile): string | undefined {
  if (profile.apiKey) {
    return profile.apiKey;
  }

  if (profile.apiKeyEnvVar) {
    return process.env[profile.apiKeyEnvVar];
  }

  return process.env.BUILDER_OS_API_KEY;
}

function clientFromProfile(profile: Profile): BuilderOsClient {
  if (profile.mode === "local") {
    return new BuilderOsClient({ baseUrl: profile.baseUrl, mode: "local" });
  }

  const apiKey = resolveApiKey(profile);
  if (!apiKey) {
    throw new Error(
      `Profile '${profile.name}' is hosted but no API key is configured. Set --api-key, --api-key-env, or BUILDER_OS_API_KEY.`
    );
  }

  return new BuilderOsClient({ baseUrl: profile.baseUrl, mode: "hosted", apiKey });
}

async function commandRun(args: string[], options: Record<string, string>): Promise<void> {
  const [workflowName, rawInput] = args;
  if (!workflowName) {
    throw new Error("Usage: builder-os run <workflow-name> [json-input]");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const input = parseInput(rawInput);

  const result = await client.runWorkflow({ workflowName, input });
  console.log(JSON.stringify(result, null, 2));
}

async function commandUsageSummary(options: Record<string, string>): Promise<void> {
  if (!options.from || !options.to) {
    throw new Error("Usage: builder-os usage summary --from <iso> --to <iso>");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const summary = await client.getUsageSummary({ from: options.from, to: options.to });
  console.log(JSON.stringify(summary, null, 2));
}

async function commandUsageByRoute(options: Record<string, string>): Promise<void> {
  if (!options.from || !options.to) {
    throw new Error("Usage: builder-os usage by-route --from <iso> --to <iso>");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const data = await client.getUsageByRoute({ from: options.from, to: options.to });
  console.log(JSON.stringify(data, null, 2));
}

async function commandUsageByApiKey(options: Record<string, string>): Promise<void> {
  if (!options.from || !options.to) {
    throw new Error("Usage: builder-os usage by-api-key --from <iso> --to <iso>");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const data = await client.getUsageByApiKey({ from: options.from, to: options.to });
  console.log(JSON.stringify(data, null, 2));
}

async function commandRunsList(options: Record<string, string>): Promise<void> {
  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const limit = options.limit ? Number(options.limit) : undefined;

  if (typeof limit === "number" && (!Number.isFinite(limit) || limit < 1)) {
    throw new Error("Invalid --limit value. Must be a positive number.");
  }

  const status = options.status;
  if (status && status !== "success" && status !== "error") {
    throw new Error("Invalid --status value. Must be success or error.");
  }

  const data = await client.listWorkflowRuns({
    limit,
    status: status as "success" | "error" | undefined,
    workflowName: options.workflow,
    from: options.from,
    to: options.to,
    cursor: options.cursor
  });
  console.log(JSON.stringify(data, null, 2));
}

async function commandRunsReplay(args: string[], options: Record<string, string>): Promise<void> {
  const [requestId] = args;
  if (!requestId) {
    throw new Error("Usage: builder-os runs replay <request-id>");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const response = await client.replayWorkflowRun(requestId);
  console.log(JSON.stringify(response, null, 2));
}

async function commandKeysList(options: Record<string, string>): Promise<void> {
  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const response = await client.listApiKeys();
  console.log(JSON.stringify(response, null, 2));
}

function parseScopeCsv(raw?: string): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function commandKeysCreate(options: Record<string, string>): Promise<void> {
  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const scopes = parseScopeCsv(options.scopes);
  const response = await client.createApiKey({ scopes });
  console.log(JSON.stringify(response, null, 2));
}

async function commandKeysRevoke(args: string[], options: Record<string, string>): Promise<void> {
  const [id] = args;
  if (!id) {
    throw new Error("Usage: builder-os keys revoke <id>");
  }

  const config = loadConfig();
  const profile = resolveProfile(config, options.profile);
  const client = clientFromProfile(profile);
  const response = await client.revokeApiKey(id);
  console.log(JSON.stringify(response, null, 2));
}

function commandProfileSet(args: string[], options: Record<string, string>): void {
  const [name] = args;
  if (!name) {
    throw new Error("Usage: builder-os profile set <name> [--base-url ...] [--mode ...]");
  }

  const config = loadConfig();
  const existing = config.profiles[name] ?? {
    name,
    baseUrl: "http://localhost:8787",
    mode: "hosted" as ApiMode
  };

  const modeOption = options.mode;
  if (modeOption && modeOption !== "hosted" && modeOption !== "local") {
    throw new Error("Invalid --mode value. Use hosted or local.");
  }

  const updated: Profile = {
    ...existing,
    name,
    baseUrl: options["base-url"] ?? existing.baseUrl,
    mode: (modeOption as ApiMode | undefined) ?? existing.mode
  };

  if (options["api-key"]) {
    updated.apiKey = options["api-key"];
  }
  if (options["api-key-env"]) {
    updated.apiKeyEnvVar = options["api-key-env"];
  }

  config.profiles[name] = updated;
  if (!config.defaultProfile) {
    config.defaultProfile = name;
  }

  saveConfig(config);
  console.log(`Profile '${name}' saved.`);
}

function commandProfileUse(args: string[]): void {
  const [name] = args;
  if (!name) {
    throw new Error("Usage: builder-os profile use <name>");
  }

  const config = loadConfig();
  if (!config.profiles[name]) {
    throw new Error(`Profile '${name}' not found.`);
  }

  config.defaultProfile = name;
  saveConfig(config);
  console.log(`Default profile set to '${name}'.`);
}

function commandProfileList(): void {
  const config = loadConfig();
  const names = Object.keys(config.profiles).sort();

  if (names.length === 0) {
    console.log("No profiles configured.");
    return;
  }

  for (const name of names) {
    const profile = config.profiles[name];
    const marker = config.defaultProfile === name ? "*" : " ";
    console.log(`${marker} ${profile.name} (${profile.mode}) ${profile.baseUrl}`);
  }
}

function commandProfileShow(args: string[]): void {
  const [name] = args;
  const config = loadConfig();
  const profile = resolveProfile(config, name);

  console.log(
    JSON.stringify(
      {
        name: profile.name,
        baseUrl: profile.baseUrl,
        mode: profile.mode,
        apiKeyConfigured: Boolean(resolveApiKey(profile)),
        apiKeyEnvVar: profile.apiKeyEnvVar
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const { positional, options } = parseOptions(process.argv.slice(2));
  const [group, command, ...rest] = positional;

  if (!group) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (group === "run") {
    await commandRun([command, ...rest], options);
    return;
  }

  if (group === "usage" && command === "summary") {
    await commandUsageSummary(options);
    return;
  }

  if (group === "usage" && command === "by-route") {
    await commandUsageByRoute(options);
    return;
  }

  if (group === "usage" && command === "by-api-key") {
    await commandUsageByApiKey(options);
    return;
  }

  if (group === "runs" && command === "list") {
    await commandRunsList(options);
    return;
  }

  if (group === "runs" && command === "replay") {
    await commandRunsReplay(rest, options);
    return;
  }

  if (group === "keys" && command === "list") {
    await commandKeysList(options);
    return;
  }

  if (group === "keys" && command === "create") {
    await commandKeysCreate(options);
    return;
  }

  if (group === "keys" && command === "revoke") {
    await commandKeysRevoke(rest, options);
    return;
  }

  if (group === "profile") {
    if (command === "set") {
      commandProfileSet(rest, options);
      return;
    }
    if (command === "use") {
      commandProfileUse(rest);
      return;
    }
    if (command === "list") {
      commandProfileList();
      return;
    }
    if (command === "show") {
      commandProfileShow(rest);
      return;
    }
  }

  printUsage();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  console.error(message);
  process.exitCode = 1;
});
