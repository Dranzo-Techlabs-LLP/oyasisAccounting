import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

// ---------------------------------------------------------------------------
// Row actions for data tables.
//
// A row should show the one or two things people do all the time as clear,
// properly sized buttons, and tuck everything else (and anything destructive)
// into a "More actions" menu. Dumping 6-7 identical icon squares in every row
// makes each one hard to find and easy to mis-tap.
//
//   <RowActionButton icon={Eye} label="View" onClick={...} />
//   <RowActionButton icon={Wallet} label="Add payment" tone="primary" />
//   <RowActionsMenu label="More actions for B2B-2026-0006" items={[...]} />
// ---------------------------------------------------------------------------

const BASE =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] text-sm font-medium " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50";

const TONES = {
  default:
    "bg-white text-[var(--brand)] ring-1 ring-[var(--line)] hover:bg-[var(--surface-muted)] hover:ring-[var(--line-strong)]",
  primary:
    "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-dark)]"
};

// A 40px button with a 18px icon. With `showLabel` the text appears from the
// `xl` breakpoint up; below that it collapses to an icon, which keeps its name
// through `aria-label` and a tooltip so it's never an unlabeled mystery button.
// `label` is the full accessible name ("View invoice"); `text` is what's printed
// on the button when it has room, and can be shorter ("View").
export function RowActionButton({ icon: Icon, label, text, onClick, tone = "default", showLabel = false, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`${BASE} ${TONES[tone] || TONES.default} ${showLabel ? "w-10 xl:w-auto xl:px-3.5" : "w-10"} ${className}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {showLabel && <span className="hidden whitespace-nowrap xl:inline">{text || label}</span>}
    </button>
  );
}

const ITEM =
  "flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm font-medium outline-none " +
  "transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50";

// items: [{ label, icon, onClick, tone?: "danger", hidden?, disabled?, dividerBefore? }]
export function RowActionsMenu({ label = "More actions", items }) {
  const visible = items.filter((i) => !i.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Place the panel under the trigger, right-aligned, flipping above it when
  // there isn't room below. Fixed positioning + a portal means the table's
  // overflow container can never clip it.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const h = panelRef.current.offsetHeight;
    const below = window.innerHeight - t.bottom;
    const placeAbove = below < h + 12 && t.top > h + 12;
    // clientWidth excludes the page scrollbar, which is what `right:` on a
    // fixed element is measured against.
    setPos({
      right: Math.max(8, document.documentElement.clientWidth - t.right),
      top: placeAbove ? t.top - h - 6 : t.bottom + 6
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(true); }
    };
    // Scrolling or resizing would leave a fixed panel floating in the wrong spot.
    const onMove = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, close]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open && pos) panelRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open, pos]);

  const onMenuKeyDown = (e) => {
    const els = Array.from(panelRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || []);
    if (els.length === 0) return;
    const i = els.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); els[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); els[els.length - 1].focus(); }
    else if (e.key === "Tab") close();
  };

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title="More actions"
        onClick={() => { setPos(null); setOpen((o) => !o); }}
        className={`${BASE} w-10 ${open ? "bg-[var(--surface-muted)] text-[var(--brand-dark)] ring-1 ring-[var(--line-strong)]" : TONES.default}`}
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={pos ? { right: pos.right, top: pos.top } : { visibility: "hidden", right: 0, top: 0 }}
          className="fixed z-[60] min-w-[210px] rounded-xl bg-white p-1 text-[var(--text)] shadow-[0_12px_32px_rgba(20,36,71,0.18)] ring-1 ring-[var(--line)]"
        >
          {visible.map((item, idx) => {
            const Icon = item.icon;
            const danger = item.tone === "danger";
            return (
              <div key={item.label}>
                {item.dividerBefore && idx > 0 && <div role="separator" className="my-1 h-px bg-[var(--line)]" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { close(); item.onClick?.(); }}
                  className={`${ITEM} ${danger
                    ? "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50"
                    : "hover:bg-[var(--surface-muted)] focus-visible:bg-[var(--surface-muted)]"}`}
                >
                  {Icon && <Icon className={`h-[18px] w-[18px] shrink-0 ${danger ? "" : "text-[var(--text-soft)]"}`} aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
