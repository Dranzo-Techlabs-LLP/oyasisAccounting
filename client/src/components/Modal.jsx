export default function Modal({ open, title, children, onClose, width = "max-w-3xl" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/35 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-8">
      <div className={`panel w-full ${width} rounded-lg`}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-[var(--text-soft)] hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="max-h-[85vh] overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
