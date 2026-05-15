import Link from "next/link";
import { RunWorkflowButton } from "../components/run-workflow-button";
import { StatusBadge } from "../components/status-badge";
import { getBuilderOs } from "../lib/builderos";

export default async function DashboardPage() {
  const { store } = await getBuilderOs();
  const data = store.dashboard();
  const workflows = store.listWorkflows().slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Local-first agentic runtime</p>
        <h2 className="mt-3 text-3xl font-black md:text-5xl">Run repeatable builder workflows safely.</h2>
        <p className="mt-4 max-w-3xl text-slate-300">BuilderOS is the self-hostable foundation for product research, repo reviews, launch checklists, documentation, and implementation planning.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[ ["Workflows", data.workflows], ["Installed plugins", data.plugins], ["Succeeded runs", data.succeededRuns], ["Failed runs", data.failedRuns] ].map(([label, value]) => (
          <div key={label} className="card"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Quick actions</h3><Link href="/workflows" className="text-sm text-emerald-300">All workflows</Link></div>
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 p-3">
                <div><p className="font-semibold">{workflow.name}</p><p className="text-sm text-slate-400">{workflow.category}</p></div>
                <RunWorkflowButton workflowId={workflow.id} permissions={workflow.requiredPermissions} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Recent runs</h3><Link href="/runs" className="text-sm text-emerald-300">View runs</Link></div>
          <div className="space-y-3">
            {data.recentRuns.length === 0 ? <p className="text-slate-400">No runs yet. Trigger a reference workflow.</p> : data.recentRuns.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`} className="block rounded-xl border border-slate-800 p-3 hover:bg-slate-800/60">
                <div className="flex items-center justify-between"><p className="font-semibold">{run.workflowName}</p><StatusBadge status={run.status} /></div>
                <p className="mt-1 text-xs text-slate-500">{run.createdAt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="text-xl font-bold">Recent artifacts</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.recentArtifacts.length === 0 ? <p className="text-slate-400">Artifacts created by runs will appear here.</p> : data.recentArtifacts.map((artifact) => (
            <Link key={artifact.id} href={`/runs/${artifact.runId}`} className="rounded-xl border border-slate-800 p-3 hover:bg-slate-800/60">
              <span className="badge">{artifact.type}</span><p className="mt-2 font-semibold">{artifact.title}</p><p className="text-xs text-slate-500">{artifact.createdAt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
