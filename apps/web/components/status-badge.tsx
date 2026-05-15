const colors: Record<string, string> = {
  queued: "border-slate-600 text-slate-300",
  pending: "border-slate-600 text-slate-300",
  running: "border-blue-500/60 text-blue-300",
  succeeded: "border-emerald-500/60 text-emerald-300",
  failed: "border-red-500/60 text-red-300",
  canceled: "border-amber-500/60 text-amber-300",
  skipped: "border-amber-500/60 text-amber-300"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${colors[status] ?? colors.pending}`}>{status}</span>;
}
