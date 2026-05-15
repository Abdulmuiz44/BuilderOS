import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBuilderOs } from "../lib/builderos";

export function RunWorkflowButton({ workflowId, permissions }: { workflowId: string; permissions: string[] }) {
  async function runWorkflow() {
    "use server";
    const { executor } = await getBuilderOs();
    const run = await executor.triggerWorkflow(
      workflowId,
      {
        idea: "Self-hosted builder workflow OS",
        audience: "developers and indie hackers",
        product: "BuilderOS",
        cta: "Run your first workflow",
        feature: "Local workflow executor",
        constraints: "Local-first and safe by default",
        project: "BuilderOS",
        launchDate: new Date().toISOString().slice(0, 10),
        repoPath: ".",
        focus: "architecture"
      },
      permissions
    );
    revalidatePath("/");
    revalidatePath("/runs");
    redirect(`/runs/${run.id}`);
  }

  return (
    <form action={runWorkflow}>
      <button className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300" type="submit">
        Run workflow
      </button>
    </form>
  );
}
