import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, subtitle, children, onClose, width = "max-w-3xl", footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-2 py-4 backdrop-blur-md sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className={`fade-in panel w-full ${width} flex max-h-[92vh] flex-col overflow-hidden rounded-[16px] shadow-[0_32px_80px_rgba(13,110,110,0.18),0_8px_24px_rgba(13,50,50,0.10)]`}>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] bg-white/85 px-4 py-3.5 backdrop-blur sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h3 id="modal-title" className="truncate text-base font-semibold text-[var(--text)] sm:text-lg">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--text-soft)]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-soft)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-[var(--line)] bg-white/85 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
