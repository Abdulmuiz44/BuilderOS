import { revalidatePath } from "next/cache";
import { getBuilderOs } from "../../lib/builderos";

export default async function SecretsPage() {
  const { store } = await getBuilderOs();
  const secrets = store.listSecrets();

  async function createSecret(formData: FormData) {
    "use server";
    const { store: actionStore } = await getBuilderOs();
    const name = String(formData.get("name") ?? "").trim();
    const value = String(formData.get("value") ?? "");
    if (!name || !value) throw new Error("Secret name and value are required.");
    actionStore.upsertSecret({ name, value, description: String(formData.get("description") ?? ""), provider: String(formData.get("provider") ?? "local") });
    revalidatePath("/secrets");
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Local secrets registry</p><h2 className="mt-2 text-3xl font-black">Secrets</h2><p className="mt-2 text-slate-400">Values are masked after saving and never displayed in the UI. MVP storage is isolated locally, but not a production vault.</p></div>
      <section className="card"><h3 className="text-xl font-bold">Add or update secret</h3><form action={createSecret} className="mt-4 grid gap-3 lg:grid-cols-4"><input name="name" placeholder="OPENAI_API_KEY" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /><input name="provider" placeholder="openai/github/vercel" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /><input name="description" placeholder="Description" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /><input name="value" type="password" placeholder="Secret value" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" /><button type="submit" className="rounded-xl bg-emerald-400 px-4 py-2 font-bold text-slate-950 lg:col-span-4">Save masked secret</button></form></section>
      <section className="card overflow-hidden p-0"><table className="w-full text-left text-sm"><thead className="bg-slate-950 text-slate-400"><tr><th className="p-4">Name</th><th className="p-4">Provider</th><th className="p-4">Masked value</th><th className="p-4">Updated</th></tr></thead><tbody>{secrets.length === 0 ? <tr><td className="p-4 text-slate-400" colSpan={4}>No secrets yet. Suggested names: OPENAI_API_KEY, GITHUB_TOKEN, VERCEL_TOKEN, NETLIFY_TOKEN.</td></tr> : secrets.map((secret) => <tr key={secret.id} className="border-t border-slate-800"><td className="p-4 font-semibold">{secret.name}<p className="text-xs font-normal text-slate-500">{secret.description}</p></td><td className="p-4 text-slate-300">{secret.provider}</td><td className="p-4 font-mono text-slate-300">{secret.maskedValue}</td><td className="p-4 text-slate-500">{secret.updatedAt}</td></tr>)}</tbody></table></section>
    </div>
  );
}
