#!/usr/bin/env node

import { BuilderOsClient } from "@builderos/sdk";

type CliArgs = {
  command?: string;
  workflowName?: string;
  rawInput?: string;
};

function parseArgs(argv: string[]): CliArgs {
  const [command, workflowName, rawInput] = argv;
  return { command, workflowName, rawInput };
}

function printUsage(): void {
  console.log("Builder OS CLI");
  console.log("Usage:");
  console.log("  builder-os run <workflow-name> [json-input]");
  console.log("Example:");
  console.log("  builder-os run echo '{\"message\":\"hello\"}'");
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

async function main(): Promise<void> {
  const { command, workflowName, rawInput } = parseArgs(process.argv.slice(2));

  if (command !== "run" || !workflowName) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const baseUrl = process.env.BUILDER_OS_GATEWAY_URL ?? "http://localhost:8787";
  const apiKey = process.env.BUILDER_OS_API_KEY;

  if (!apiKey && process.env.BUILDER_OS_ALLOW_ANON_LOCAL !== "true") {
    console.error("BUILDER_OS_API_KEY is required unless BUILDER_OS_ALLOW_ANON_LOCAL=true is set.");
    process.exitCode = 1;
    return;
  }

  const client = new BuilderOsClient({ baseUrl, apiKey });
  const input = parseInput(rawInput);

  const result = await client.runWorkflow({ workflowName, input });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  console.error(message);
  process.exitCode = 1;
});
