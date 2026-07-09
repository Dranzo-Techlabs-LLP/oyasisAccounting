import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Upload, FileText, Download } from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "./FormPrimitives";
import { downloadBlob, formatCurrency, formatDate } from "../utils/formatters";

const formatBytes = (n) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const TICKET_TYPES = [
  ["FLIGHT", "Flight"], ["TRAIN", "Train"], ["BUS", "Bus"], ["CAR", "Car"],
  ["BOAT", "Boat"], ["FERRY", "Ferry"], ["OTHER", "Other"]
];

const todayISO = () => new Date().toISOString().slice(0, 10);

// Payment methods — mirrors the booking form / Add Payment modal. UPI default.
const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque", "Other"];

const initial = {
  customerId: "",
  ticketType: "FLIGHT",
  vendor: "",
  reference: "",
  fromLocation: "",
  toLocation: "",
  departAt: "",
  returnAt: "",
  passengers: 1,
  costPrice: 0,
  sellingPrice: 0,
  serviceFee: 0,
  discountAmount: 0,
  status: "BOOKED",
  supplierName: "",
  supplierPaid: false,
  supplierPaidDate: "",
  note: "",
  installments: [],
  customer: { fullName: "", phone: "", email: "", nationality: "", passportNo: "", address: "", notes: "" }
};

export default function TicketSaleForm({ customers, initialValues, onSubmit, busy }) {
  const [form, setForm] = useState(initial);
  const [newCustomer, setNewCustomer] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [uploadingNow, setUploadingNow] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);
  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({
        ...initial,
        ...initialValues,
        customerId: initialValues.customerId || initialValues.customer?.id || "",
        departAt: initialValues.departAt ? String(initialValues.departAt).slice(0, 16) : "",
        returnAt: initialValues.returnAt ? String(initialValues.returnAt).slice(0, 16) : "",
        supplierPaidDate: initialValues.supplierPaidDate ? String(initialValues.supplierPaidDate).slice(0, 10) : "",
        // Sort oldest-first, and keep them editable (no locked flag) so the
        // user can amend or remove existing payments from the edit dialog.
        installments: (initialValues.payments || [])
          .slice()
          .sort((a, b) => {
            const d = new Date(a.paymentDate || 0) - new Date(b.paymentDate || 0);
            if (d !== 0) return d;
            return Number(a.id || 0) - Number(b.id || 0);
          })
          .map((p) => ({
            id: p.id, amount: p.amount,
            paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : todayISO(),
            method: p.method || "UPI", note: p.note || ""
          }))
      });
      setExistingAttachments(initialValues.attachments || []);
      setPendingFiles([]);
    } else {
      setForm(initial);
      setNewCustomer(false);
      setExistingAttachments([]);
      setPendingFiles([]);
    }
  }, [initialValues]);

  const onPickFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    const tooBig = arr.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) toast.error(`${tooBig.name} over 10 MB. Skipped.`);
    const accepted = arr.filter((f) => f.size <= MAX_FILE_BYTES);
    setPendingFiles((c) => [...c, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragCounter.current += 1;
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  };
  const onDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) onPickFiles(files);
  };
  const removePending = (i) => setPendingFiles((c) => c.filter((_, idx) => idx !== i));

  const uploadNow = async () => {
    if (!isEdit || pendingFiles.length === 0) return;
    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append("files", f));
    try {
      setUploadingNow(true);
      const res = await api.post(`/ticket-sales/${initialValues.id}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`${pendingFiles.length} file(s) uploaded`);
      setExistingAttachments(res.data?.attachments || []);
      setPendingFiles([]);
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally { setUploadingNow(false); }
  };

  const deleteExisting = async (attId) => {
    if (!isEdit) return;
    if (!window.confirm("Delete this attachment?")) return;
    try {
      const res = await api.delete(`/ticket-sales/${initialValues.id}/attachments/${attId}`);
      setExistingAttachments(res.data?.attachments || []);
      toast.success("Deleted");
    } catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
  };

  const downloadExisting = async (att) => {
    try {
      const res = await api.get(`/ticket-sales/${initialValues.id}/attachments/${att.id}`, { responseType: "blob" });
      downloadBlob(res.data, att.originalName);
    } catch { toast.error("Download failed"); }
  };

  const totals = useMemo(() => {
    const selling = Number(form.sellingPrice || 0);
    const fee = Number(form.serviceFee || 0);
    const disc = Math.min(Number(form.discountAmount || 0), selling + fee);
    const total = Math.max(selling + fee - disc, 0);
    const paid = form.installments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = Math.max(total - paid, 0);
    const cost = Number(form.costPrice || 0);
    return { total, paid, balance, margin: total - cost, cost };
  }, [form]);

  const updateInstallment = (idx, patch) =>
    setForm((c) => ({ ...c, installments: c.installments.map((p, i) => i === idx ? { ...p, ...patch } : p) }));
  const removeInstallment = (idx) =>
    setForm((c) => ({ ...c, installments: c.installments.filter((_, i) => i !== idx) }));
  const addInstallment = () =>
    setForm((c) => ({ ...c, installments: [...c.installments, { amount: "", paymentDate: todayISO(), method: "UPI", note: "" }] }));

  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      // Send the FULL payments list: existing rows keep their id (edited in
      // place), new rows omit it (created). The server reconciles — anything
      // not sent is deleted — so users can add, edit, or remove installments.
      const allPayments = form.installments
        .filter((p) => Number(p.amount) > 0)
        .map((p) => ({
          ...(p.id ? { id: Number(p.id) } : {}),
          amount: Number(p.amount),
          paymentDate: p.paymentDate || todayISO(),
          method: p.method || "UPI",
          note: p.note || ""
        }));
      const payload = {
        ...form,
        customerId: newCustomer ? undefined : Number(form.customerId),
        passengers: Number(form.passengers || 1),
        costPrice: Number(form.costPrice || 0),
        sellingPrice: Number(form.sellingPrice || 0),
        serviceFee: Number(form.serviceFee || 0),
        discountAmount: Number(form.discountAmount || 0),
        departAt: form.departAt || null,
        returnAt: form.returnAt || null,
        supplierPaidDate: form.supplierPaidDate || null,
        payments: allPayments
      };
      delete payload.installments;
      payload._pendingFiles = pendingFiles;
      onSubmit(newCustomer ? payload : { ...payload, customer: undefined });
    }}>

      {/* Ticket details */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Ticket Type">
          <Select value={form.ticketType} onChange={(e) => setForm({ ...form, ticketType: e.target.value })}>
            {TICKET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Vendor / Operator">
          <Input value={form.vendor} placeholder="Indigo, IRCTC, etc." onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        </Field>
        <Field label="PNR / Reference">
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From"><Input value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} /></Field>
        <Field label="To"><Input value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Departure"><Input type="datetime-local" value={form.departAt} onChange={(e) => setForm({ ...form, departAt: e.target.value })} /></Field>
        <Field label="Return (optional)"><Input type="datetime-local" value={form.returnAt} onChange={(e) => setForm({ ...form, returnAt: e.target.value })} /></Field>
        <Field label="Passengers"><Input type="number" min="1" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} /></Field>
      </div>

      {/* Customer */}
      <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--text)]">Customer</p>
          <button type="button" onClick={() => setNewCustomer((c) => !c)} className="text-sm font-medium text-[var(--brand)]">
            {newCustomer ? "Use existing customer" : "Add new customer"}
          </button>
        </div>
        {newCustomer ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Full name *" required value={form.customer.fullName} onChange={(e) => setForm({ ...form, customer: { ...form.customer, fullName: e.target.value } })} />
            <Input placeholder="Phone *" required value={form.customer.phone} onChange={(e) => setForm({ ...form, customer: { ...form.customer, phone: e.target.value } })} />
            <Input placeholder="Email" type="email" value={form.customer.email} onChange={(e) => setForm({ ...form, customer: { ...form.customer, email: e.target.value } })} />
            <Input placeholder="Nationality" value={form.customer.nationality} onChange={(e) => setForm({ ...form, customer: { ...form.customer, nationality: e.target.value } })} />
          </div>
        ) : (
          <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>)}
          </Select>
        )}
      </div>

      {/* Pricing */}
      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Pricing</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Cost Price">
            <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </Field>
          <Field label="Selling Price *">
            <Input type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </Field>
          <Field label="Service Fee">
            <Input type="number" min="0" step="0.01" value={form.serviceFee} onChange={(e) => setForm({ ...form, serviceFee: e.target.value })} />
          </Field>
          <Field label="Discount">
            <Input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-[var(--text-soft)]">
          Cost = what we pay supplier · Selling = what customer pays · Service Fee = markup added on top · Discount = subtracted from total.
        </p>
      </div>

      {/* Supplier */}
      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-[var(--text)]">Supplier</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Supplier name"><Input value={form.supplierName} placeholder="e.g. MakeMyTrip B2B" onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></Field>
          <Field label="Supplier paid date"><Input type="date" value={form.supplierPaidDate} disabled={!form.supplierPaid} onChange={(e) => setForm({ ...form, supplierPaidDate: e.target.value })} /></Field>
          <label className="mt-7 inline-flex items-center gap-2 text-sm text-[var(--text)]">
            <input type="checkbox" checked={form.supplierPaid} onChange={(e) => setForm({ ...form, supplierPaid: e.target.checked, supplierPaidDate: e.target.checked ? (form.supplierPaidDate || todayISO()) : "" })} />
            Supplier paid
          </label>
        </div>
      </div>

      {/* Installments */}
      <div className="rounded-md border border-[var(--line)] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Customer Payments</p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Money received. Can be split into installments.</p>
          </div>
          <button type="button" onClick={addInstallment} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
            <Plus className="h-4 w-4" /> Add installment
          </button>
        </div>
        {form.installments.length === 0 ? (
          <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No payments recorded.</p>
        ) : (
          <div className="space-y-2">
            {form.installments.map((p, i) => (
              <div key={p.id ?? `np-${i}`} className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3 lg:grid-cols-[140px_150px_140px_1fr_44px]">
                <Input type="number" min="0" placeholder="Amount" value={p.amount} onChange={(e) => updateInstallment(i, { amount: e.target.value })} />
                <Input type="date" value={p.paymentDate} onChange={(e) => updateInstallment(i, { paymentDate: e.target.value })} />
                <Select value={p.method || "UPI"} onChange={(e) => updateInstallment(i, { method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </Select>
                <Input placeholder="Note" value={p.note} onChange={(e) => updateInstallment(i, { note: e.target.value })} />
                <button type="button" onClick={() => removeInstallment(i)} aria-label="Remove"
                  className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="BOOKED">Booked</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </Field>
        <Field label="Note"><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </div>

      {/* Attachments */}
      <div
        className={`rounded-md border bg-white p-4 transition-colors ${
          dragOver ? "border-[var(--brand)] bg-[var(--surface-muted)] ring-2 ring-[var(--brand)] ring-opacity-30" : "border-[var(--line)]"
        }`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Attachments</p>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
              E-tickets, PNR screenshots, supplier invoices, passport scans. Max 10 MB per file. Drag files into this panel or click Choose files.
              {!isEdit && " Files upload after sale is created."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--surface-muted)]">
              <Upload className="h-4 w-4" /> Choose files
            </button>
            {isEdit && pendingFiles.length > 0 && (
              <button type="button" onClick={uploadNow} disabled={uploadingNow}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {uploadingNow ? "Uploading..." : `Upload ${pendingFiles.length} now`}
              </button>
            )}
          </div>
        </div>

        {isEdit && existingAttachments.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">Already uploaded</p>
            <div className="space-y-2">
              {existingAttachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--text-soft)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{a.originalName}</p>
                      <p className="text-xs text-[var(--text-soft)]">{formatBytes(a.size)} · {formatDate(a.uploadedAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => downloadExisting(a)} aria-label="Download" className="rounded-md border border-[var(--line)] bg-white p-1.5 text-[var(--text-soft)] hover:text-[var(--brand)]">
                      <Download className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteExisting(a.id)} aria-label="Delete" className="rounded-md border border-[var(--line)] bg-white p-1.5 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingFiles.length > 0 ? (
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {isEdit ? "Ready to upload" : "Will upload after creation"}
            </p>
            <div className="space-y-2">
              {pendingFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md border border-dashed border-[var(--brand)] bg-white p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{f.name}</p>
                      <p className="text-xs text-[var(--text-soft)]">{formatBytes(f.size)} · {f.type || "unknown"}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removePending(i)} aria-label="Remove"
                    className="rounded-md border border-[var(--line)] bg-white p-1.5 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !isEdit && existingAttachments.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-8 text-center transition-colors ${
                dragOver
                  ? "border-[var(--brand)] bg-white text-[var(--brand)]"
                  : "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--text-soft)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              }`}
            >
              <Upload className="h-5 w-5" />
              <p className="text-sm font-medium">
                {dragOver ? "Drop files to attach" : "Drag &amp; drop files here"}
              </p>
              <p className="text-xs">or click anywhere in this box to browse</p>
            </button>
          )
        )}
      </div>

      {/* Totals */}
      <div className="grid gap-3 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Cost" value={formatCurrency(totals.cost)} accent="slate" />
        <Stat label="Total Sale" value={formatCurrency(totals.total)} accent="brand" />
        <Stat label="Paid" value={formatCurrency(totals.paid)} accent="emerald" />
        <Stat label="Balance" value={formatCurrency(totals.balance)} accent={totals.balance > 0 ? "red" : "emerald"} />
        <Stat label="Margin" value={formatCurrency(totals.margin)} accent={totals.margin >= 0 ? "emerald" : "red"} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !form.sellingPrice}>
          {busy ? "Saving..." : isEdit ? "Save Ticket Sale" : "Create Ticket Sale"}
        </Button>
      </div>
    </form>
  );
}

function Stat({ label, value, accent }) {
  const map = { brand: "text-[var(--brand)]", emerald: "text-emerald-700", red: "text-red-600", slate: "text-slate-700" };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-1 text-base font-semibold ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}
