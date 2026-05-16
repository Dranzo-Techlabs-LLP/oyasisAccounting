import { useEffect, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "./FormPrimitives";

const TYPES = [
  ["B2B", "B2B Partner"],
  ["AGENT", "Travel Agent"],
  ["CORPORATE", "Corporate Client"],
  ["SUPPLIER", "Supplier"],
  ["HOTEL", "Hotel"],
  ["TRANSPORT", "Transport"],
  ["AIRLINE", "Airline"],
  ["OTHER", "Other"]
];

const initial = {
  name: "", type: "B2B", contactName: "", email: "", phone: "",
  address: "", city: "", state: "", country: "", postalCode: "",
  gstin: "", pan: "", openingBalance: 0, notes: "", isActive: true
};

export default function VendorForm({ initialValues, onSubmit, busy }) {
  const [form, setForm] = useState(initial);
  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({ ...initial, ...initialValues });
    } else {
      setForm(initial);
    }
  }, [initialValues]);

  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...form, openingBalance: Number(form.openingBalance || 0) });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *" required>
          <Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Contact Person">
          <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Opening Balance">
          <Input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
        </Field>
      </div>

      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Address</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Street"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="Postal Code"><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
        </div>
      </div>

      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Tax</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} /></Field>
          <Field label="PAN"><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} /></Field>
        </div>
      </div>

      <Field label="Notes">
        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>

      <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="h-4 w-4 rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand-ring)]" />
        Active
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !form.name}>{busy ? "Saving..." : isEdit ? "Save Vendor" : "Add Vendor"}</Button>
      </div>
    </form>
  );
}
