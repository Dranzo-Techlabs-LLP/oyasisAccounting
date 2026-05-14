import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "./FormPrimitives";
import { formatCurrency } from "../utils/formatters";

const METHODS = ["Cash", "Bank Transfer", "UPI", "Card", "Cheque", "Other"];

export default function PaymentForm({ onSubmit, busy, balance }) {
  const [form, setForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "Bank Transfer",
    note: ""
  });

  const amountNum = Number(form.amount || 0);
  const projectedBalance =
    typeof balance === "number" ? Math.max(balance - amountNum, 0) : null;
  const overpay =
    typeof balance === "number" && amountNum > balance && balance > 0;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (amountNum <= 0) return;
        onSubmit({ ...form, amount: amountNum });
      }}
    >
      {typeof balance === "number" && (
        <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-soft)]">
          Current balance due: <span className="font-semibold text-[var(--text)]">{formatCurrency(balance)}</span>
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setForm((c) => ({ ...c, amount: String(balance) }))}
              className="ml-2 font-medium text-[var(--brand)] underline-offset-2 hover:underline"
            >
              Pay full
            </button>
          )}
        </div>
      )}

      <Field label="Amount *">
        <Input type="number" min="1" step="0.01" value={form.amount}
          onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} required />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payment Date">
          <Input type="date" value={form.paymentDate}
            onChange={(e) => setForm((c) => ({ ...c, paymentDate: e.target.value }))} />
        </Field>
        <Field label="Method">
          <Select value={form.method} onChange={(e) => setForm((c) => ({ ...c, method: e.target.value }))}>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Note">
        <Textarea rows={2} value={form.note}
          onChange={(e) => setForm((c) => ({ ...c, note: e.target.value }))}
          placeholder="e.g. Installment 2 of 3, ref no., received from..." />
      </Field>

      {amountNum > 0 && typeof balance === "number" && (
        <div className={`rounded-md px-3 py-2 text-xs ${overpay ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
          {overpay
            ? `Amount exceeds balance by ${formatCurrency(amountNum - balance)}.`
            : `After this payment, balance will be ${formatCurrency(projectedBalance)}.`}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || amountNum <= 0}>
          {busy ? "Saving..." : "Add Payment"}
        </Button>
      </div>
    </form>
  );
}
