import type { WorkflowContext, WorkflowDefinition } from "@builderos/types";

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

  async run(
    workflowName: string,
    input: Record<string, unknown>,
    ctx: WorkflowContext
  ): Promise<Record<string, unknown>> {
    const workflow = this.workflows.get(workflowName);

    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    return workflow.run(input, ctx);
  }
}
