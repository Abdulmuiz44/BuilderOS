import Link from "next/link";
import { RunWorkflowButton } from "../../components/run-workflow-button";
import { getBuilderOs } from "../../lib/builderos";

export default async function WorkflowsPage() {
  const { store } = await getBuilderOs();
  const workflows = store.listWorkflows();
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Workflow system</p><h2 className="mt-2 text-3xl font-black">Reference workflows</h2><p className="mt-2 text-slate-400">JSON-defined repeatable builder processes with ordered capability steps and visible permissions.</p></div>
      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <section key={workflow.id} className="card">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="badge">{workflow.category}</span><span className="badge">{workflow.enabled ? "enabled" : "disabled"}</span></div>
                <Link href={`/workflows/${workflow.id}`} className="mt-3 block text-2xl font-bold hover:text-emerald-300">{workflow.name}</Link>
                <p className="mt-2 max-w-3xl text-slate-300">{workflow.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">{workflow.requiredPermissions.map((permission) => <span key={permission} className="badge">{permission}</span>)}</div>
              </div>
              <RunWorkflowButton workflowId={workflow.id} permissions={workflow.requiredPermissions} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
