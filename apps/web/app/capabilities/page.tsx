import { getBuilderOs, pretty } from "../../lib/builderos";

export default async function CapabilitiesPage() {
  const { store } = await getBuilderOs();
  const capabilities = store.listCapabilities();
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Capability registry</p><h2 className="mt-2 text-3xl font-black">Capabilities</h2><p className="mt-2 text-slate-400">Actions workflows can call. Dangerous actions are mocked or conservative by default.</p></div>
      <div className="grid gap-4">
        {capabilities.map((capability) => <section key={capability.id} className="card"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="badge">{capability.id}</span><span className="badge">{capability.pluginId}</span><span className="badge">{capability.enabled ? "enabled" : "disabled"}</span></div><h3 className="mt-3 text-2xl font-bold">{capability.name}</h3><p className="mt-2 max-w-3xl text-slate-300">{capability.description}</p><div className="mt-4 flex flex-wrap gap-2">{capability.requiredPermissions.map((permission) => <span className="badge" key={permission}>{permission}</span>)}</div></div><div className="grid gap-3 lg:w-[34rem]"><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">Input {pretty(capability.inputSchema)}</pre><pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">Output {pretty(capability.outputSchema)}</pre></div></div></section>)}
      </div>
    </div>
  );
}
