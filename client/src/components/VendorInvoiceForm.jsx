import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "./FormPrimitives";
import { formatCurrency } from "../utils/formatters";

const todayISO = () => new Date().toISOString().slice(0, 10);

const blankItem = () => ({
  description: "",
  hsnCode: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
  discountAmount: 0
});

const initial = {
  vendorId: "",
  issueDate: todayISO(),
  dueDate: "",
  status: "DRAFT",
  currency: "INR",
  reference: "",
  notes: "",
  terms: "",
  showGstin: true,
  includeBank: true,
  items: [blankItem()]
};

export default function VendorInvoiceForm({ vendors, initialValues, onSubmit, busy }) {
  const [form, setForm] = useState(initial);
  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({
        ...initial,
        ...initialValues,
        vendorId: initialValues.vendorId || initialValues.vendor?.id || "",
        issueDate: initialValues.issueDate ? String(initialValues.issueDate).slice(0, 10) : todayISO(),
        dueDate: initialValues.dueDate ? String(initialValues.dueDate).slice(0, 10) : "",
        items: (initialValues.items || []).map((it) => ({
          id: it.id,
          description: it.description || "",
          hsnCode: it.hsnCode || "",
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice ?? 0,
          taxRate: it.taxRate ?? 0,
          discountAmount: it.discountAmount ?? 0
        }))
      });
    } else {
      setForm(initial);
    }
  }, [initialValues]);

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0, discount = 0, total = 0;
    for (const it of form.items) {
      const qty = Number(it.quantity || 0);
      const unit = Number(it.unitPrice || 0);
      const disc = Number(it.discountAmount || 0);
      const lineGross = qty * unit;
      const lineAfterDisc = Math.max(lineGross - disc, 0);
      const lineTax = lineAfterDisc * (Number(it.taxRate || 0) / 100);
      subtotal += lineGross;
      discount += disc;
      tax += lineTax;
      total += lineAfterDisc + lineTax;
    }
    return { subtotal, tax, discount, total };
  }, [form.items]);

  const setItem = (idx, patch) => {
    setForm((c) => ({
      ...c,
      items: c.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    }));
  };
  const addItem = () => setForm((c) => ({ ...c, items: [...c.items, blankItem()] }));
  const removeItem = (idx) => setForm((c) => ({
    ...c,
    items: c.items.length > 1 ? c.items.filter((_, i) => i !== idx) : c.items
  }));

  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        vendorId: Number(form.vendorId),
        issueDate: form.issueDate || todayISO(),
        dueDate: form.dueDate || null,
        items: form.items
          .filter((it) => it.description && Number(it.unitPrice) >= 0)
          .map((it, i) => ({
            ...it,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unitPrice || 0),
            taxRate: Number(it.taxRate || 0),
            discountAmount: Number(it.discountAmount || 0),
            position: i
          }))
      });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vendor / B2B Partner *" required>
          <Select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} required>
            <option value="">Select a vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.gstin ? `· ${v.gstin}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reference / PO No.">
          <Input value={form.reference} placeholder="Customer PO, contract no. etc." onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
        <Field label="Issue Date">
          <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
        </Field>
        <Field label="Due Date">
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="AED">AED</option>
          </Select>
        </Field>
      </div>

      {/* Line items */}
      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Line Items</p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Add custom items. Tax % is applied to (qty × rate − discount).</p>
          </div>
          <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>

        <div className="space-y-3">
          {form.items.map((it, i) => {
            const qty = Number(it.quantity || 0);
            const unit = Number(it.unitPrice || 0);
            const disc = Number(it.discountAmount || 0);
            const lineGross = qty * unit;
            const lineAfterDisc = Math.max(lineGross - disc, 0);
            const lineTax = lineAfterDisc * (Number(it.taxRate || 0) / 100);
            const lineTotal = lineAfterDisc + lineTax;
            return (
              <div key={i} className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                <div className="grid gap-2 lg:grid-cols-[1.5fr_90px_90px_110px_80px_80px_40px]">
                  <Input placeholder="Description (service / line)" value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })} />
                  <Input placeholder="HSN/SAC" value={it.hsnCode}
                    onChange={(e) => setItem(i, { hsnCode: e.target.value })} />
                  <Input type="number" min="0" step="0.01" placeholder="Qty" value={it.quantity}
                    onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  <Input type="number" min="0" step="0.01" placeholder="Rate" value={it.unitPrice}
                    onChange={(e) => setItem(i, { unitPrice: e.target.value })} />
                  <Input type="number" min="0" step="0.01" placeholder="Disc." value={it.discountAmount}
                    onChange={(e) => setItem(i, { discountAmount: e.target.value })} />
                  <Input type="number" min="0" max="100" step="0.01" placeholder="Tax %" value={it.taxRate}
                    onChange={(e) => setItem(i, { taxRate: e.target.value })} />
                  <button type="button" onClick={() => removeItem(i)} aria-label="Remove"
                    disabled={form.items.length === 1}
                    className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center justify-between text-xs text-[var(--text-soft)]">
                  <span>Line: {qty} × {formatCurrency(unit)} − {formatCurrency(disc)} + tax</span>
                  <span className="font-semibold text-[var(--text)]">{formatCurrency(lineTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Notes (printed on invoice)">
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <Field label="Terms (printed on invoice)">
          <Textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })}
            placeholder="Payment due within 15 days etc." />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4 rounded-md border border-[var(--line)] bg-white p-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.showGstin} onChange={(e) => setForm({ ...form, showGstin: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--line)] text-[var(--brand)]" />
          <span>Show GSTIN/PAN on invoice</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.includeBank} onChange={(e) => setForm({ ...form, includeBank: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--line)] text-[var(--brand)]" />
          <span>Show bank / UPI details</span>
        </label>
      </div>

      {/* Totals */}
      <div className="grid gap-3 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Subtotal</p>
          <p className="mt-1 text-base font-semibold text-[var(--text)]">{formatCurrency(totals.subtotal)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Discount</p>
          <p className="mt-1 text-base font-semibold text-[var(--text)]">- {formatCurrency(totals.discount)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Tax (GST)</p>
          <p className="mt-1 text-base font-semibold text-[var(--text)]">{formatCurrency(totals.tax)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">Total</p>
          <p className="mt-1 text-base font-semibold text-[var(--brand)]">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !form.vendorId || form.items.length === 0}>
          {busy ? "Saving..." : isEdit ? "Save Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
