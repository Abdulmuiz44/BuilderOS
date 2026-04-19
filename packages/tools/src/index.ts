export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  output: Record<string, unknown>;
}

export interface Tool {
  name: string;
  run: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export class InMemoryToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.name);

    if (!tool) {
      throw new Error(`Unknown tool: ${call.name}`);
    }

    return tool.run(call.input);
  }
}
