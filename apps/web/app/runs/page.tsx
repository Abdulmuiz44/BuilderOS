import Link from "next/link";
import { StatusBadge } from "../../components/status-badge";
import { duration, getBuilderOs } from "../../lib/builderos";

export default async function RunsPage() {
  const { store } = await getBuilderOs();
  const runs = store.listRuns();
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Execution engine</p><h2 className="mt-2 text-3xl font-black">Runs</h2><p className="mt-2 text-slate-400">Manual workflow executions with sequential step tracking, logs, errors, and artifacts.</p></div>
      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Workflow</th><th className="p-4">Status</th><th className="p-4">Started</th><th className="p-4">Completed</th><th className="p-4">Duration</th><th className="p-4">Artifacts</th></tr></thead><tbody>{runs.length === 0 ? <tr><td className="p-4 text-slate-400" colSpan={6}>No runs yet.</td></tr> : runs.map((run) => <tr key={run.id} className="border-t border-slate-800 hover:bg-slate-800/40"><td className="p-4"><Link className="font-semibold hover:text-emerald-300" href={`/runs/${run.id}`}>{run.workflowName}</Link>{run.error ? <p className="mt-1 text-xs text-red-300">{run.error}</p> : null}</td><td className="p-4"><StatusBadge status={run.status} /></td><td className="p-4 text-slate-400">{run.startedAt ?? "—"}</td><td className="p-4 text-slate-400">{run.completedAt ?? "—"}</td><td className="p-4 text-slate-400">{duration(run.startedAt, run.completedAt)}</td><td className="p-4 text-slate-400">{store.listArtifacts(run.id).length}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
