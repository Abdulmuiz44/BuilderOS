export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Settings</p><h2 className="mt-2 text-3xl font-black">Local runtime settings</h2><p className="mt-2 text-slate-400">BuilderOS starts as a local-first, self-hostable runtime. Cloud-ready deployment and multi-user settings come later.</p></div>
      <section className="card"><h3 className="text-xl font-bold">Environment</h3><dl className="mt-4 grid gap-4 md:grid-cols-2"><div><dt className="text-sm text-slate-400">Database</dt><dd className="mt-1 font-mono text-sm">BUILDEROS_DB_PATH or .builderos/builderos.sqlite</dd></div><div><dt className="text-sm text-slate-400">Runtime</dt><dd className="mt-1 font-mono text-sm">Next.js App Router + Node.js server actions</dd></div><div><dt className="text-sm text-slate-400">Safety</dt><dd className="mt-1 font-mono text-sm">Permissions checked before each run and step</dd></div><div><dt className="text-sm text-slate-400">Shell execution</dt><dd className="mt-1 font-mono text-sm">Mocked by default</dd></div></dl></section>
      <section className="card"><h3 className="text-xl font-bold">MVP boundaries</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300"><li>No plugin marketplace or upload flow.</li><li>No multi-tenant SaaS, billing, or browser automation.</li><li>No unrestricted shell execution.</li><li>Secrets are local MVP records, not a production-grade vault.</li></ul></section>
    </div>
  );
}
