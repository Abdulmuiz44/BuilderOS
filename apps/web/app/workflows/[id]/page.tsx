import { notFound } from "next/navigation";
import { RunWorkflowButton } from "../../../components/run-workflow-button";
import { getBuilderOs, pretty } from "../../../lib/builderos";

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await getBuilderOs();
  const workflow = store.getWorkflow(id);
  if (!workflow) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div><span className="badge">{workflow.category}</span><h2 className="mt-3 text-4xl font-black">{workflow.name}</h2><p className="mt-3 max-w-3xl text-slate-300">{workflow.description}</p></div>
        <RunWorkflowButton workflowId={workflow.id} permissions={workflow.requiredPermissions} />
      </div>
      <section className="card"><h3 className="text-xl font-bold">Required permissions</h3><div className="mt-3 flex flex-wrap gap-2">{workflow.requiredPermissions.map((permission) => <span className="badge" key={permission}>{permission}</span>)}</div></section>
      <section className="card"><h3 className="text-xl font-bold">Ordered steps</h3><div className="mt-4 space-y-3">{workflow.steps.map((step) => <div key={step.id} className="rounded-xl border border-slate-800 p-4"><p className="text-sm text-slate-500">Step {step.order} · {step.capabilityId}</p><h4 className="mt-1 font-bold">{step.name}</h4><p className="mt-1 text-slate-400">{step.description}</p><pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{pretty(step.input)}</pre></div>)}</div></section>
      <section className="grid gap-6 lg:grid-cols-2"><div className="card"><h3 className="text-xl font-bold">Input schema</h3><pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{pretty(workflow.inputSchema)}</pre></div><div className="card"><h3 className="text-xl font-bold">Expected outputs</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">{workflow.outputExpectations.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
    </div>
  );
}
