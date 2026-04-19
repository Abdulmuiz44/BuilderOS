import type { WorkflowDefinition } from "@builderos/types";

const echoWorkflow: WorkflowDefinition = {
  name: "echo",
  description: "Echoes input message and metadata.",
  async run(input, ctx) {
    const message = typeof input.message === "string" ? input.message : "hello from builder os";

    return {
      echoedMessage: message,
      requestId: ctx.requestId,
      mode: ctx.mode,
      timestamp: new Date().toISOString()
    };
  }
};

export function createDefaultWorkflowRegistry(): WorkflowDefinition[] {
  return [echoWorkflow];
}
