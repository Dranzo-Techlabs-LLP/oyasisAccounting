export function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--text)]">{label}</span>
      {children}
    </label>
  );
}

const fieldBase =
  "rounded-md border border-[var(--line)] bg-white px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[rgba(13,110,110,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[var(--text-soft)]";

export function Input(props) {
  return (
    <input
      {...props}
      className={`h-11 ${fieldBase} ${props.className || ""}`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`h-11 ${fieldBase} ${props.className || ""}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-24 py-3 ${fieldBase} ${props.className || ""}`}
    />
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]",
    secondary: "bg-white text-[var(--brand)] ring-1 ring-[var(--line)] hover:bg-slate-50",
    subtle: "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };

  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
    />
  );
}
