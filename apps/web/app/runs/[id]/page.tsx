import { notFound } from "next/navigation";
import { StatusBadge } from "../../../components/status-badge";
import { duration, getBuilderOs, pretty } from "../../../lib/builderos";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await getBuilderOs();
  const run = store.getRun(id);
  if (!run) notFound();
  const steps = store.listRunSteps(run.id);
  const logs = store.listLogs(run.id);
  const artifacts = store.listArtifacts(run.id);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Run detail</p><h2 className="mt-2 text-3xl font-black">{run.workflowName}</h2><p className="mt-2 font-mono text-xs text-slate-500">{run.id}</p></div><StatusBadge status={run.status} /></div>
      <section className="grid gap-4 md:grid-cols-4">{[["Created", run.createdAt], ["Started", run.startedAt ?? "—"], ["Completed", run.completedAt ?? "—"], ["Duration", duration(run.startedAt, run.completedAt)]].map(([label, value]) => <div className="card" key={label}><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-sm font-bold">{value}</p></div>)}</section>
      {run.error ? <section className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-red-100"><h3 className="font-bold">Error</h3><p className="mt-2">{run.error}</p></section> : null}
      <section className="card"><h3 className="text-xl font-bold">Step timeline</h3><div className="mt-4 space-y-3">{steps.map((step) => <div key={step.id} className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">Step {step.order} · {step.capabilityId}</p><h4 className="font-bold">{step.name}</h4></div><StatusBadge status={step.status} /></div>{step.error ? <p className="mt-2 text-sm text-red-300">{step.error}</p> : null}<pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{pretty(step.output ?? step.input)}</pre></div>)}</div></section>
      <section className="grid gap-6 lg:grid-cols-2"><div className="card"><h3 className="text-xl font-bold">Logs</h3><div className="mt-4 space-y-2">{logs.map((log) => <div key={log.id} className="rounded-xl border border-slate-800 p-3"><span className="badge">{log.level}</span><p className="mt-2 text-sm">{log.message}</p><p className="mt-1 text-xs text-slate-500">{log.createdAt}</p></div>)}</div></div><div className="card"><h3 className="text-xl font-bold">Input payload</h3><pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">{pretty(run.input)}</pre><h3 className="mt-5 text-xl font-bold">Output summary</h3><p className="mt-2 text-slate-300">{run.outputSummary ?? "—"}</p></div></section>
      <section className="card"><h3 className="text-xl font-bold">Artifacts</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{artifacts.length === 0 ? <p className="text-slate-400">No artifacts created.</p> : artifacts.map((artifact) => <article key={artifact.id} className="rounded-xl border border-slate-800 p-4"><span className="badge">{artifact.type}</span><h4 className="mt-2 font-bold">{artifact.title}</h4><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-sm text-slate-300">{artifact.content}</pre></article>)}</div></section>
    </div>
  );
}
