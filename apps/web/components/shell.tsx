import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Dashboard", "/"],
  ["Runs", "/runs"],
  ["Workflows", "/workflows"],
  ["Plugins", "/plugins"],
  ["Capabilities", "/capabilities"],
  ["Secrets", "/secrets"],
  ["Settings", "/settings"]
];

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1f2937,#020617_45%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-slate-800 bg-slate-950/70 p-5 md:w-72 md:border-b-0 md:border-r">
          <Link href="/" className="block rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">BuilderOS</p>
            <h1 className="mt-2 text-xl font-black">Agentic OS for builders</h1>
          </Link>
          <nav className="mt-6 grid gap-2">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Local-first MVP. Shell execution is mocked; secrets are masked in UI but not a production vault.
          </div>
        </aside>
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
