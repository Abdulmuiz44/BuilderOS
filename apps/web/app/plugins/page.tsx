import { getBuilderOs, pretty } from "../../lib/builderos";

export default async function PluginsPage() {
  const { store } = await getBuilderOs();
  const plugins = store.listPlugins();
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Plugin runtime</p><h2 className="mt-2 text-3xl font-black">Installed plugins</h2><p className="mt-2 text-slate-400">Local code/JSON registered plugin manifests. Marketplace and ZIP upload are intentionally out of scope.</p></div>
      <div className="grid gap-4">
        {plugins.map((plugin) => <section key={plugin.id} className="card"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><div className="flex flex-wrap gap-2"><span className="badge">{plugin.id}</span><span className="badge">v{plugin.version}</span><span className="badge">{plugin.enabled ? "enabled" : "disabled"}</span></div><h3 className="mt-3 text-2xl font-bold">{plugin.name}</h3><p className="mt-2 text-slate-300">{plugin.description}</p><p className="mt-2 text-sm text-slate-500">Author: {plugin.author}</p><div className="mt-4 flex flex-wrap gap-2">{plugin.capabilities.map((capability) => <span className="badge" key={capability}>{capability}</span>)}</div><div className="mt-3 flex flex-wrap gap-2">{plugin.permissions.map((permission) => <span className="badge" key={permission}>{permission}</span>)}</div></div><pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300 lg:w-[28rem]">{pretty(plugin.manifest)}</pre></div></section>)}
      </div>
    </div>
  );
}
