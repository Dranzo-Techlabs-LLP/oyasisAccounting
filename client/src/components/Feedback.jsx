import { BriefcaseBusiness, LoaderCircle } from "lucide-react";

export function FullPageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="panel flex items-center gap-3 rounded-[14px] px-5 py-4 shadow-[0_8px_24px_rgba(13,110,110,0.10)]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[var(--brand)]" />
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton rounded-[10px] ${className}`} />;
}

export function EmptyState({ title, message, description, action, icon: Icon = BriefcaseBusiness }) {
  return (
    <div className="panel rounded-[14px] border border-dashed border-[var(--line)] px-6 py-12 text-center sm:px-10">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text)] sm:text-lg">{title}</h3>
      {(message || description) && (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--text-soft)]">{message || description}</p>
      )}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
