import { useEffect, useState } from "react";
import { Download, Eye } from "lucide-react";
import Modal from "./Modal";
import { Button, Field, Input, Select, Textarea } from "./FormPrimitives";

/**
 * Customisation dialog before invoice view/download.
 * onConfirm({ action: "view"|"download", showGstin, taxRate, includeBank, notes })
 */
export default function InvoiceOptionsModal({ open, onClose, onConfirm, settings, busy }) {
  const [showGstin, setShowGstin] = useState(true);
  const [includeBank, setIncludeBank] = useState(true);
  const [taxMode, setTaxMode] = useState("none"); // none | default | custom
  const [customTax, setCustomTax] = useState(18);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setShowGstin(true);
      setIncludeBank(true);
      setTaxMode("none");
      setCustomTax(Number(settings?.taxRate) > 0 ? Number(settings.taxRate) : 18);
      setNotes("");
    }
  }, [open, settings]);

  const taxRate =
    taxMode === "none" ? 0
    : taxMode === "default" ? Number(settings?.taxRate || 0)
    : Number(customTax || 0);

  const fire = (action) => {
    onConfirm({ action, showGstin, includeBank, taxRate, notes });
  };

  const gstinValue = settings?.gstin;

  return (
    <Modal open={open} onClose={onClose} title="Invoice Options" subtitle="Customise this invoice before view/download" width="max-w-xl">
      <div className="grid gap-4">
        {/* GSTIN toggle */}
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-3.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={showGstin}
              onChange={(e) => setShowGstin(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand-ring)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text)]">Include GSTIN / PAN on invoice header</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                {gstinValue
                  ? `Current GSTIN: ${gstinValue}`
                  : "No GSTIN configured in Settings → Tax & Bank."}
              </p>
            </div>
          </label>
        </div>

        {/* Tax rate */}
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-3.5">
          <p className="text-sm font-semibold text-[var(--text)]">Add GST line to total?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              ["none", "No GST", "Skip tax line"],
              ["default", `Default (${Number(settings?.taxRate || 0)}%)`, "From Settings"],
              ["custom", "Custom %", "Specify below"]
            ].map(([v, label, hint]) => (
              <label key={v} className={`cursor-pointer rounded-md border p-2.5 text-xs transition ${taxMode === v ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>
                <input type="radio" name="taxMode" value={v} checked={taxMode === v} onChange={() => setTaxMode(v)} className="sr-only" />
                <p className="font-semibold text-[var(--text)]">{label}</p>
                <p className="mt-0.5 text-[var(--text-soft)]">{hint}</p>
              </label>
            ))}
          </div>
          {taxMode === "custom" && (
            <div className="mt-3">
              <Field label="GST rate (%)">
                <Input type="number" min="0" max="100" step="0.01" value={customTax} onChange={(e) => setCustomTax(e.target.value)} />
              </Field>
            </div>
          )}
          {taxRate > 0 && (
            <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
              GST line will be added at <span className="font-semibold">{taxRate}%</span>. Total + balance recalculated on PDF.
            </p>
          )}
        </div>

        {/* Include bank */}
        <div className="rounded-[10px] border border-[var(--line)] bg-white p-3.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeBank}
              onChange={(e) => setIncludeBank(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand-ring)]"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text)]">Include bank / UPI payment details</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Footer block with account no, IFSC, UPI ID etc.</p>
            </div>
          </label>
        </div>

        {/* Notes */}
        <Field label="One-time note (printed near footer, optional)" hint="Use for invoice-specific message. Settings → Invoice Terms still applies.">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="secondary" onClick={() => fire("view")} disabled={busy}>
          <Eye className="h-4 w-4" /> View
        </Button>
        <Button onClick={() => fire("download")} disabled={busy}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
    </Modal>
  );
}
