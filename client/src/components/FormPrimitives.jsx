export function Field({ label, hint, error, required, children }) {
  return (
    <label className="grid gap-1.5">
      {label && (
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-soft)]">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--text-faint)]">{hint}</span>
      ) : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-[10px] border border-[var(--line)] bg-white px-3 text-sm text-[var(--text)] " +
  "shadow-[0_1px_2px_rgba(13,50,50,0.04)] outline-none transition-all duration-150 " +
  "placeholder:text-[var(--text-faint)] " +
  "hover:border-[var(--line-strong)] " +
  "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-ring)] focus:shadow-[0_0_0_4px_rgba(13,110,110,0.08)] " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-[var(--text-soft)] disabled:opacity-90 " +
  "read-only:bg-slate-50/60";

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
      className={`h-11 appearance-none pr-9 ${fieldBase} ${props.className || ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f7676' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "12px",
        ...(props.style || {})
      }}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-[88px] py-2.5 ${fieldBase} ${props.className || ""}`}
    />
  );
}

export function Button({ variant = "primary", size = "md", className = "", ...props }) {
  const variants = {
    primary:
      "bg-[var(--brand)] text-white shadow-[0_2px_8px_rgba(13,110,110,0.22)] " +
      "hover:bg-[var(--brand-dark)] hover:shadow-[0_6px_18px_rgba(13,110,110,0.32)] " +
      "active:translate-y-[1px] active:shadow-[0_1px_2px_rgba(13,110,110,0.18)]",
    secondary:
      "bg-white text-[var(--brand)] ring-1 ring-[var(--line)] " +
      "hover:bg-[var(--surface-muted)] hover:ring-[var(--line-strong)] hover:text-[var(--brand-dark)] " +
      "active:translate-y-[1px]",
    subtle:
      "bg-[var(--surface-muted)] text-[var(--text)] hover:bg-slate-100 active:translate-y-[1px]",
    ghost:
      "bg-transparent text-[var(--text-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
    danger:
      "bg-rose-600 text-white shadow-[0_2px_8px_rgba(225,29,72,0.22)] " +
      "hover:bg-rose-700 hover:shadow-[0_6px_18px_rgba(225,29,72,0.32)] " +
      "active:translate-y-[1px]",
    success:
      "bg-emerald-600 text-white shadow-[0_2px_8px_rgba(5,150,105,0.22)] " +
      "hover:bg-emerald-700 active:translate-y-[1px]"
  };

  const sizes = {
    sm: "h-9 px-3 text-xs gap-1.5",
    md: "h-11 px-4 text-sm gap-2",
    lg: "h-12 px-5 text-base gap-2"
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-[10px] font-semibold transition-all duration-150 ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
    />
  );
}
