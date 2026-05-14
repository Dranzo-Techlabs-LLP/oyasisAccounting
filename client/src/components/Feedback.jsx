import { BriefcaseBusiness, LoaderCircle } from "lucide-react";

export function FullPageLoader({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="panel flex items-center gap-4 rounded-lg px-6 py-5">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--brand)]" />
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="panel rounded-lg border border-dashed border-[var(--line)] px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)]">
        <BriefcaseBusiness className="h-8 w-8 text-[var(--brand)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-soft)]">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
