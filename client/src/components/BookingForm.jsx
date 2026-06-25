import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2, Users, Building2, Wallet, CalendarDays, Paperclip, FileText, Upload, Download, Ticket, Plane, Train, Bus, Car, Ship } from "lucide-react";
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

const todayISO = () => new Date().toISOString().slice(0, 10);

// Payment methods offered for booking installments. Mirrors PaymentForm /
// QuickPayment so the choices stay consistent across the app. UPI is the
// default in India, so it's first in the list.
const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Card", "Cheque", "Other"];

const PAYEE_TYPES = [
  ["HOTEL", "Hotel"],
  ["B2B", "B2B Partner"],
  ["AGENT", "Agent"],
  ["TRANSPORT", "Transport"],
  ["GUIDE", "Guide"],
  ["ACTIVITY", "Activity"],
  ["AIRLINE", "Airline"],
  ["OTHER", "Other"]
];

const TICKET_TYPES = [
  ["FLIGHT", "Flight"],
  ["TRAIN", "Train"],
  ["BUS", "Bus"],
  ["CAR", "Car"],
  ["BOAT", "Boat"],
  ["FERRY", "Ferry"],
  ["OTHER", "Other"]
];

const initialForm = {
  customerId: "",
  packageId: "",
  departureDate: "",
  endDate: "",
  adults: 2,
  children: 0,
  adultPriceOverride: "",
  childPriceOverride: "",
  priceOverrideEnabled: false,
  discountType: "NONE",
  discountValue: 0,
  bookingStatus: "CONFIRMED",
  notes: "",
  extraCharges: [{ label: "Visa Fees", amount: 0 }],
  installments: [],
  travellers: [],
  payouts: [],
  tickets: [],
  customer: {
    fullName: "",
    phone: "",
    email: "",
    nationality: "",
    passportNo: "",
    address: "",
    notes: ""
  }
};

export default function BookingForm({
  customers,
  packages,
  initialValues,
  onSubmit,
  busy
}) {
  const [form, setForm] = useState(initialForm);
  const [newCustomer, setNewCustomer] = useState(false);
  const [section, setSection] = useState("details");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [uploadingNow, setUploadingNow] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);
  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      // Show installments oldest-first so the order matches the booking
      // detail Payment History and is consistent with how invoices read.
      // Fall back to id when timestamps tie (e.g. legacy midnight rows).
      const existingPayments = (initialValues.payments || [])
        .slice()
        .sort((a, b) => {
          const d = new Date(a.paymentDate || 0) - new Date(b.paymentDate || 0);
          if (d !== 0) return d;
          return Number(a.id || 0) - Number(b.id || 0);
        })
        .map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate ? String(p.paymentDate).slice(0, 10) : todayISO(),
          method: p.method || "UPI",
          note: p.note || ""
        }));
      setForm({
        ...initialForm,
        ...initialValues,
        customerId: initialValues.customerId || initialValues.customer?.id || "",
        packageId: initialValues.packageId || initialValues.travelPackage?.id || "",
        departureDate: initialValues.departureDate?.slice(0, 10) || "",
        endDate: initialValues.endDate?.slice(0, 10) || "",
        adultPriceOverride: initialValues.adultPriceOverride ?? "",
        childPriceOverride: initialValues.childPriceOverride ?? "",
        priceOverrideEnabled: initialValues.adultPriceOverride != null || initialValues.childPriceOverride != null,
        extraCharges:
          initialValues.extraCharges?.length > 0 ? initialValues.extraCharges : initialForm.extraCharges,
        installments: existingPayments,
        travellers: (initialValues.travellers || []).map((t) => ({
          id: t.id, fullName: t.fullName || "", age: t.age ?? "", gender: t.gender || "",
          passportNo: t.passportNo || "", phone: t.phone || "", isPrimary: !!t.isPrimary,
          note: t.note || ""
        })),
        payouts: (initialValues.payouts || []).map((p) => ({
          id: p.id, payeeType: p.payeeType, payeeName: p.payeeName,
          amount: p.amount, status: p.status,
          dueDate: p.dueDate ? String(p.dueDate).slice(0, 10) : "",
          paidDate: p.paidDate ? String(p.paidDate).slice(0, 10) : "",
          reference: p.reference || "", note: p.note || ""
        })),
        tickets: (initialValues.tickets || []).map((t) => ({
          id: t.id,
          ticketType: t.ticketType || "FLIGHT",
          vendor: t.vendor || "",
          reference: t.reference || "",
          fromLocation: t.fromLocation || "",
          toLocation: t.toLocation || "",
          departAt: t.departAt ? String(t.departAt).slice(0, 16) : "",
          returnAt: t.returnAt ? String(t.returnAt).slice(0, 16) : "",
          passengers: t.passengers ?? 1,
          amount: t.amount || 0,
          status: t.status || "BOOKED",
          note: t.note || ""
        }))
      });
      setExistingAttachments(initialValues.attachments || []);
      setPendingFiles([]);
    } else {
      setForm(initialForm);
      setNewCustomer(false);
      setSection("details");
      setExistingAttachments([]);
      setPendingFiles([]);
    }
  }, [initialValues]);

  const selectedPackage = packages.find((item) => item.id === Number(form.packageId));

  // Auto-suggest end date when package + departure set and end date empty.
  useEffect(() => {
    if (!selectedPackage || !form.departureDate || form.endDate) return;
    const dur = Number(selectedPackage.durationDays || 0);
    if (dur > 0) {
      const dep = new Date(form.departureDate);
      const end = new Date(dep);
      end.setDate(dep.getDate() + (dur - 1));
      setForm((c) => ({ ...c, endDate: end.toISOString().slice(0, 10) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.packageId, form.departureDate]);

  // Resolve a price override. 0 and empty are treated as "no override" so a
  // half-filled override doesn't silently zero out the booking's totals (the
  // package default kicks in instead). A real override must be > 0.
  const resolveOverride = (raw) => {
    if (!form.priceOverrideEnabled) return null;
    if (raw === "" || raw == null) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  };
  const adultOverride = resolveOverride(form.adultPriceOverride);
  const childOverride = resolveOverride(form.childPriceOverride);
  const adultFellBack = form.priceOverrideEnabled && adultOverride == null && form.adultPriceOverride !== "";
  const childFellBack = form.priceOverrideEnabled && childOverride == null && form.childPriceOverride !== "";
  const effectiveAdultRate = adultOverride != null ? adultOverride : Number(selectedPackage?.priceAdult || 0);
  const effectiveChildRate = childOverride != null ? childOverride : Number(selectedPackage?.priceChild || 0);

  const liveTotals = useMemo(() => {
    if (!selectedPackage) return { total: 0, subtotal: 0, paid: 0, balance: 0, payouts: 0, margin: 0 };
    const extras = form.extraCharges.reduce((s, i) => s + Number(i.amount || 0), 0);
    const subtotal =
      effectiveAdultRate * Number(form.adults) +
      effectiveChildRate * Number(form.children) +
      extras;
    const discount =
      form.discountType === "FLAT"
        ? Number(form.discountValue || 0)
        : form.discountType === "PERCENTAGE"
          ? subtotal * (Number(form.discountValue || 0) / 100)
          : 0;
    const total = Math.max(subtotal - Math.min(discount, subtotal), 0);
    const paid = form.installments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = Math.max(total - paid, 0);
    const payouts = form.payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { subtotal, total, paid, balance, payouts, margin: total - payouts };
  }, [selectedPackage, form]);

  /* ===== generic updaters ===== */
  const setList = (key, fn) => setForm((c) => ({ ...c, [key]: fn(c[key]) }));
  const updateAt = (key, index, patch) =>
    setList(key, (arr) => arr.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  const removeAt = (key, index) => setList(key, (arr) => arr.filter((_, i) => i !== index));

  /* ===== Installments ===== */
  const addInstallment = () =>
    setList("installments", (arr) => [...arr, { amount: "", paymentDate: todayISO(), method: "UPI", note: "" }]);
  const splitEqually = (count) => {
    const remaining = Math.max(liveTotals.total - liveTotals.paid, 0);
    if (!count || remaining <= 0) return;
    const each = Math.round((remaining / count) * 100) / 100;
    const newOnes = Array.from({ length: count }, (_, i) => ({
      amount: i === count - 1 ? Math.max(remaining - each * (count - 1), 0) : each,
      paymentDate: todayISO(),
      method: "UPI",
      note: `Installment ${i + 1}/${count}`
    }));
    setList("installments", (arr) => [...arr, ...newOnes]);
  };

  /* ===== Travellers ===== */
  const addTraveller = () =>
    setList("travellers", (arr) => [
      ...arr,
      { fullName: "", age: "", gender: "", passportNo: "", phone: "", isPrimary: false, note: "" }
    ]);

  /* ===== Payouts ===== */
  const addPayout = () =>
    setList("payouts", (arr) => [
      ...arr,
      { payeeType: "HOTEL", payeeName: "", amount: "", status: "PENDING", dueDate: "", paidDate: "", reference: "", note: "" }
    ]);

  /* ===== Tickets ===== */
  const addTicket = (preset) =>
    setList("tickets", (arr) => [
      ...arr,
      {
        ticketType: preset || "FLIGHT",
        vendor: "",
        reference: "",
        fromLocation: "",
        toLocation: "",
        departAt: "",
        returnAt: "",
        passengers: Number(form.adults) + Number(form.children) || 1,
        amount: "",
        status: "BOOKED",
        note: ""
      }
    ]);

  /* ===== Attachments ===== */
  const onPickFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const arr = Array.from(fileList);
    const tooBig = arr.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name} is over 10 MB. Skipped.`);
    }
    const accepted = arr.filter((f) => f.size <= MAX_FILE_BYTES);
    setPendingFiles((curr) => [...curr, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePending = (index) =>
    setPendingFiles((curr) => curr.filter((_, i) => i !== index));

  // Drag-and-drop on the Files tab. The counter trick avoids flicker when a
  // drag passes over child elements (each child fires enter/leave).
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragCounter.current += 1;
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) onPickFiles(files);
  };

  const uploadNowToExisting = async () => {
    if (!isEdit || pendingFiles.length === 0) return;
    const fd = new FormData();
    pendingFiles.forEach((f) => fd.append("files", f));
    try {
      setUploadingNow(true);
      const res = await api.post(`/bookings/${initialValues.id}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(`${pendingFiles.length} file(s) uploaded`);
      setExistingAttachments(res.data?.attachments || []);
      setPendingFiles([]);
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally {
      setUploadingNow(false);
    }
  };

  const deleteExistingAttachment = async (attId) => {
    if (!isEdit) return;
    if (!window.confirm("Delete this attachment?")) return;
    try {
      const res = await api.delete(`/bookings/${initialValues.id}/attachments/${attId}`);
      setExistingAttachments(res.data?.attachments || []);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    }
  };

  const downloadExistingAttachment = async (att) => {
    try {
      const res = await api.get(`/bookings/${initialValues.id}/attachments/${att.id}`, { responseType: "blob" });
      downloadBlob(res.data, att.originalName);
    } catch { toast.error("Download failed"); }
  };

  const overpaid = liveTotals.paid > liveTotals.total && liveTotals.total > 0;

  const tabClass = (key) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      section === key
        ? "bg-[var(--brand)] text-white"
        : "bg-white text-[var(--text-soft)] ring-1 ring-[var(--line)] hover:text-[var(--text)]"
    }`;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const allPayments = form.installments
          .map((p) => ({
            ...(p.id ? { id: p.id } : {}),
            amount: Number(p.amount || 0),
            paymentDate: p.paymentDate || todayISO(),
            method: p.method || "UPI",
            note: p.note || ""
          }))
          .filter((p) => p.amount > 0);
        const allTravellers = form.travellers
          .filter((t) => t.fullName.trim())
          .map((t) => ({
            ...(t.id ? { id: t.id } : {}),
            fullName: t.fullName.trim(),
            age: t.age === "" ? null : Number(t.age),
            gender: t.gender || null,
            passportNo: t.passportNo || null,
            phone: t.phone || null,
            isPrimary: !!t.isPrimary,
            note: t.note || null
          }));
        const allPayouts = form.payouts
          .filter((p) => p.payeeName.trim())
          .map((p) => ({
            ...(p.id ? { id: p.id } : {}),
            payeeType: p.payeeType || "OTHER",
            payeeName: p.payeeName.trim(),
            amount: Number(p.amount || 0),
            status: p.status || "PENDING",
            dueDate: p.dueDate || null,
            paidDate: p.paidDate || null,
            reference: p.reference || null,
            note: p.note || null
          }));
        const allTickets = form.tickets
          .filter((t) => t.vendor || t.reference || t.fromLocation || t.toLocation)
          .map((t) => ({
            ...(t.id ? { id: t.id } : {}),
            ticketType: t.ticketType || "FLIGHT",
            vendor: t.vendor || null,
            reference: t.reference || null,
            fromLocation: t.fromLocation || null,
            toLocation: t.toLocation || null,
            departAt: t.departAt || null,
            returnAt: t.returnAt || null,
            passengers: Number(t.passengers || 1),
            amount: Number(t.amount || 0),
            status: t.status || "BOOKED",
            note: t.note || null
          }));
        const payload = {
          ...form,
          customerId: newCustomer ? undefined : Number(form.customerId),
          packageId: Number(form.packageId),
          adults: Number(form.adults),
          children: Number(form.children),
          endDate: form.endDate || null,
          adultPriceOverride: adultOverride,
          childPriceOverride: childOverride,
          discountValue: Number(form.discountValue),
          extraCharges: form.extraCharges
            .filter((item) => item.label)
            .map((item) => ({ ...item, amount: Number(item.amount || 0) })),
          payments: allPayments,
          travellers: allTravellers,
          payouts: allPayouts,
          tickets: allTickets,
          amountPaid: allPayments.reduce((sum, p) => sum + p.amount, 0)
        };
        delete payload.installments;
        // Files travel out-of-band — caller uploads them after booking is created/updated.
        payload._pendingFiles = pendingFiles;
        onSubmit(newCustomer ? payload : { ...payload, customer: undefined });
      }}
    >
      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-5 -mt-1 flex flex-wrap gap-2 border-b border-[var(--line)] bg-white px-5 py-3">
        <button type="button" className={tabClass("details")} onClick={() => setSection("details")}>
          <CalendarDays className="h-3.5 w-3.5" /> Booking
        </button>
        <button type="button" className={tabClass("travellers")} onClick={() => setSection("travellers")}>
          <Users className="h-3.5 w-3.5" /> Travellers <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{form.travellers.length}</span>
        </button>
        <button type="button" className={tabClass("payments")} onClick={() => setSection("payments")}>
          <Wallet className="h-3.5 w-3.5" /> Payments <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{form.installments.length}</span>
        </button>
        <button type="button" className={tabClass("payouts")} onClick={() => setSection("payouts")}>
          <Building2 className="h-3.5 w-3.5" /> Suppliers <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{form.payouts.length}</span>
        </button>
        <button type="button" className={tabClass("tickets")} onClick={() => setSection("tickets")}>
          <Ticket className="h-3.5 w-3.5" /> Tickets <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{form.tickets.length}</span>
        </button>
        <button type="button" className={tabClass("attachments")} onClick={() => setSection("attachments")}>
          <Paperclip className="h-3.5 w-3.5" /> Files <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">{existingAttachments.length + pendingFiles.length}</span>
        </button>
      </div>

      {section === "details" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Travel Package">
              <Select value={form.packageId} onChange={(e) => setForm((c) => ({ ...c, packageId: e.target.value }))} required>
                <option value="">Select a package</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} - {item.destination}</option>
                ))}
              </Select>
              {selectedPackage && (
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  Default {formatCurrency(selectedPackage.priceAdult)}/adult · {formatCurrency(selectedPackage.priceChild)}/child · {selectedPackage.durationDays}D {selectedPackage.durationNights}N
                </p>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Departure Date">
                <Input type="date" value={form.departureDate} onChange={(e) => setForm((c) => ({ ...c, departureDate: e.target.value }))} required />
              </Field>
              <Field label="End Date">
                <Input type="date" value={form.endDate} min={form.departureDate || undefined}
                  onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} />
              </Field>
            </div>
          </div>

          {/* Custom pricing override */}
          <div className="rounded-md border border-[var(--line)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Custom Package Pricing</p>
                <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                  Package prices are just estimates. Override per-booking to lock in the negotiated rate.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={form.priceOverrideEnabled}
                  onChange={(e) => setForm((c) => ({
                    ...c,
                    priceOverrideEnabled: e.target.checked,
                    adultPriceOverride: e.target.checked
                      ? (c.adultPriceOverride !== "" ? c.adultPriceOverride : (selectedPackage?.priceAdult ?? ""))
                      : c.adultPriceOverride,
                    childPriceOverride: e.target.checked
                      ? (c.childPriceOverride !== "" ? c.childPriceOverride : (selectedPackage?.priceChild ?? ""))
                      : c.childPriceOverride
                  }))}
                />
                Override default pricing
              </label>
            </div>
            {form.priceOverrideEnabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label={`Adult rate ${selectedPackage ? `(default ${formatCurrency(selectedPackage.priceAdult)})` : ""}`}>
                  <Input type="number" min="0" step="0.01" value={form.adultPriceOverride}
                    onChange={(e) => setForm((c) => ({ ...c, adultPriceOverride: e.target.value }))} />
                  {adultFellBack && (
                    <p className="mt-1 text-xs text-amber-700">Override is 0 — package default will be used.</p>
                  )}
                </Field>
                <Field label={`Child rate ${selectedPackage ? `(default ${formatCurrency(selectedPackage.priceChild)})` : ""}`}>
                  <Input type="number" min="0" step="0.01" value={form.childPriceOverride}
                    onChange={(e) => setForm((c) => ({ ...c, childPriceOverride: e.target.value }))} />
                  {childFellBack && (
                    <p className="mt-1 text-xs text-amber-700">Override is 0 — package default will be used.</p>
                  )}
                </Field>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Adults">
              <Input type="number" min="1" value={form.adults} onChange={(e) => setForm((c) => ({ ...c, adults: e.target.value }))} />
            </Field>
            <Field label="Children">
              <Input type="number" min="0" value={form.children} onChange={(e) => setForm((c) => ({ ...c, children: e.target.value }))} />
            </Field>
            <Field label="Discount Type">
              <Select value={form.discountType} onChange={(e) => setForm((c) => ({ ...c, discountType: e.target.value }))}>
                <option value="NONE">None</option>
                <option value="FLAT">Flat</option>
                <option value="PERCENTAGE">Percentage</option>
              </Select>
            </Field>
            <Field label="Discount Value">
              <Input type="number" min="0" value={form.discountValue} onChange={(e) => setForm((c) => ({ ...c, discountValue: e.target.value }))} disabled={form.discountType === "NONE"} />
            </Field>
          </div>

          <div className="rounded-md border border-[var(--line)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">Extra Charges</p>
              <button type="button" onClick={() => setList("extraCharges", (arr) => [...arr, { label: "", amount: 0 }])}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
                <Plus className="h-4 w-4" /> Add item
              </button>
            </div>
            <div className="grid gap-2">
              {form.extraCharges.map((charge, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_140px_40px]">
                  <Input value={charge.label} placeholder="Charge label" onChange={(e) => updateAt("extraCharges", index, { label: e.target.value })} />
                  <Input type="number" min="0" value={charge.amount} placeholder="Amount" onChange={(e) => updateAt("extraCharges", index, { amount: e.target.value })} />
                  <button type="button" aria-label="Remove" onClick={() => removeAt("extraCharges", index)}
                    className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] text-[var(--text-soft)] hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text)]">Primary Customer</p>
              <button type="button" onClick={() => setNewCustomer((c) => !c)} className="text-sm font-medium text-[var(--brand)]">
                {newCustomer ? "Use existing customer" : "Add new customer"}
              </button>
            </div>
            {newCustomer ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Full name *" value={form.customer.fullName} required onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, fullName: e.target.value } }))} />
                <Input placeholder="Phone *" value={form.customer.phone} required onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, phone: e.target.value } }))} />
                <Input placeholder="Email" type="email" value={form.customer.email} onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, email: e.target.value } }))} />
                <Input placeholder="Nationality" value={form.customer.nationality} onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, nationality: e.target.value } }))} />
                <Input placeholder="Passport no" value={form.customer.passportNo} onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, passportNo: e.target.value } }))} />
                <Input placeholder="Address" value={form.customer.address} onChange={(e) => setForm((c) => ({ ...c, customer: { ...c.customer, address: e.target.value } }))} />
              </div>
            ) : (
              <Select value={form.customerId} onChange={(e) => setForm((c) => ({ ...c, customerId: e.target.value }))} required>
                <option value="">Select customer</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>{item.fullName} - {item.phone}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Booking Status">
              <Select value={form.bookingStatus} onChange={(e) => setForm((c) => ({ ...c, bookingStatus: e.target.value }))}>
                <option value="CONFIRMED">Confirmed</option>
                <option value="TENTATIVE">Tentative</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </Field>
            <Field label="Internal Notes">
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
            </Field>
          </div>
        </>
      )}

      {section === "travellers" && (
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Travellers / Tourist Clients</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">List all people travelling under this booking. Primary customer is auto-tracked above.</p>
            </div>
            <button type="button" onClick={addTraveller} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
              <Plus className="h-4 w-4" /> Add traveller
            </button>
          </div>
          {form.travellers.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No travellers added.</p>
          ) : (
            <div className="space-y-3">
              {form.travellers.map((t, i) => (
                <div key={t.id ?? `nt-${i}`} className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3 lg:grid-cols-[1.4fr_80px_110px_1.1fr_1.1fr_44px]">
                  <Input placeholder="Full name" value={t.fullName} disabled={t.locked} onChange={(e) => updateAt("travellers", i, { fullName: e.target.value })} />
                  <Input type="number" placeholder="Age" value={t.age} disabled={t.locked} onChange={(e) => updateAt("travellers", i, { age: e.target.value })} />
                  <Select value={t.gender} disabled={t.locked} onChange={(e) => updateAt("travellers", i, { gender: e.target.value })}>
                    <option value="">Gender</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="O">Other</option>
                  </Select>
                  <Input placeholder="Passport no" value={t.passportNo} disabled={t.locked} onChange={(e) => updateAt("travellers", i, { passportNo: e.target.value })} />
                  <Input placeholder="Phone" value={t.phone} disabled={t.locked} onChange={(e) => updateAt("travellers", i, { phone: e.target.value })} />
                  <button type="button" disabled={t.locked} onClick={() => removeAt("travellers", i)}
                    aria-label="Remove"
                    className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "payments" && (
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Customer Payment Plan</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Money received from the customer. Balance updates live.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isEdit && liveTotals.total > 0 && (
                <>
                  <button type="button" onClick={() => splitEqually(2)} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--text-soft)] hover:bg-[var(--surface-muted)]">Split 2</button>
                  <button type="button" onClick={() => splitEqually(3)} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--text-soft)] hover:bg-[var(--surface-muted)]">Split 3</button>
                  <button type="button" onClick={() => splitEqually(4)} className="rounded-md border border-[var(--line)] px-2 py-1 text-xs text-[var(--text-soft)] hover:bg-[var(--surface-muted)]">Split 4</button>
                </>
              )}
              <button type="button" onClick={addInstallment} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
                <Plus className="h-4 w-4" /> Add installment
              </button>
            </div>
          </div>

          {form.installments.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No installments yet.</p>
          ) : (
            <div className="space-y-3">
              {form.installments.map((p, i) => (
                <div key={p.id ?? `np-${i}`} className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3 lg:grid-cols-[140px_150px_140px_1fr_44px]">
                  <Input type="number" min="0" placeholder="Amount" value={p.amount} disabled={p.locked} onChange={(e) => updateAt("installments", i, { amount: e.target.value })} />
                  <Input type="date" value={p.paymentDate} disabled={p.locked} onChange={(e) => updateAt("installments", i, { paymentDate: e.target.value })} />
                  <Select value={p.method || "UPI"} disabled={p.locked} onChange={(e) => updateAt("installments", i, { method: e.target.value })}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                  <Input placeholder="Note" value={p.note} disabled={p.locked} onChange={(e) => updateAt("installments", i, { note: e.target.value })} />
                  <button type="button" disabled={p.locked} onClick={() => removeAt("installments", i)} aria-label="Remove"
                    className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {overpaid && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Paid amount exceeds total. Balance capped at 0.
            </p>
          )}
        </div>
      )}

      {section === "payouts" && (
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Supplier / B2B Payouts</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Money going OUT to hotels, B2B partners, agents, transport providers for this booking. Used for margin tracking.</p>
            </div>
            <button type="button" onClick={addPayout} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
              <Plus className="h-4 w-4" /> Add payout
            </button>
          </div>
          {form.payouts.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No supplier payouts.</p>
          ) : (
            <div className="space-y-3">
              {form.payouts.map((p, i) => (
                <div key={p.id ?? `po-${i}`} className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <div className="grid gap-2 lg:grid-cols-[140px_1.5fr_120px_120px_44px]">
                    <Select value={p.payeeType} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { payeeType: e.target.value })}>
                      {PAYEE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                    <Input placeholder="Payee / Vendor name" value={p.payeeName} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { payeeName: e.target.value })} />
                    <Input type="number" min="0" placeholder="Amount" value={p.amount} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { amount: e.target.value })} />
                    <Select value={p.status} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { status: e.target.value })}>
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="CANCELLED">Cancelled</option>
                    </Select>
                    <button type="button" disabled={p.locked} onClick={() => removeAt("payouts", i)} aria-label="Remove"
                      className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <Input type="date" placeholder="Due date" value={p.dueDate} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { dueDate: e.target.value })} />
                    <Input placeholder="Reference no." value={p.reference} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { reference: e.target.value })} />
                    <Input placeholder="Note" value={p.note} disabled={p.locked} onChange={(e) => updateAt("payouts", i, { note: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "tickets" && (
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Ticket Bookings</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">Flights, trains, buses, cars, boats — anything with a PNR / reference no.</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => addTicket("FLIGHT")} className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"><Plane className="h-3.5 w-3.5" /> Flight</button>
              <button type="button" onClick={() => addTicket("TRAIN")} className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"><Train className="h-3.5 w-3.5" /> Train</button>
              <button type="button" onClick={() => addTicket("BUS")} className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"><Bus className="h-3.5 w-3.5" /> Bus</button>
              <button type="button" onClick={() => addTicket("CAR")} className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"><Car className="h-3.5 w-3.5" /> Car</button>
              <button type="button" onClick={() => addTicket("BOAT")} className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-xs font-medium text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"><Ship className="h-3.5 w-3.5" /> Boat</button>
              <button type="button" onClick={() => addTicket("OTHER")} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]"><Plus className="h-4 w-4" /> Add ticket</button>
            </div>
          </div>

          {form.tickets.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No tickets booked.</p>
          ) : (
            <div className="space-y-3">
              {form.tickets.map((t, i) => (
                <div key={t.id ?? `nt-${i}`} className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <div className="grid gap-2 lg:grid-cols-[130px_1.2fr_1fr_110px_44px]">
                    <Select value={t.ticketType} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { ticketType: e.target.value })}>
                      {TICKET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                    <Input placeholder="Vendor / Operator (e.g. Indigo, IRCTC)" value={t.vendor} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { vendor: e.target.value })} />
                    <Input placeholder="PNR / Ref no." value={t.reference} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { reference: e.target.value })} />
                    <Select value={t.status} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { status: e.target.value })}>
                      <option value="BOOKED">Booked</option>
                      <option value="PENDING">Pending</option>
                      <option value="CANCELLED">Cancelled</option>
                    </Select>
                    <button type="button" disabled={t.locked} onClick={() => removeAt("tickets", i)} aria-label="Remove"
                      className="flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white text-[var(--text-soft)] hover:text-red-600 disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Input placeholder="From" value={t.fromLocation} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { fromLocation: e.target.value })} />
                    <Input placeholder="To" value={t.toLocation} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { toLocation: e.target.value })} />
                    <Input type="datetime-local" value={t.departAt} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { departAt: e.target.value })} />
                    <Input type="datetime-local" value={t.returnAt} placeholder="Return (optional)" disabled={t.locked} onChange={(e) => updateAt("tickets", i, { returnAt: e.target.value })} />
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <Input type="number" min="0" placeholder="Passengers" value={t.passengers} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { passengers: e.target.value })} />
                    <Input type="number" min="0" step="0.01" placeholder="Amount" value={t.amount} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { amount: e.target.value })} />
                    <Input placeholder="Note" value={t.note} disabled={t.locked} onChange={(e) => updateAt("tickets", i, { note: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "attachments" && (
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
                Passport scans, hotel vouchers, signed contracts, tickets. Max 10 MB per file. Drag files anywhere into this panel or click Choose files.
                {!isEdit && " Files upload after the booking is created."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--surface-muted)]">
                <Upload className="h-4 w-4" /> Choose files
              </button>
              {isEdit && pendingFiles.length > 0 && (
                <button type="button" onClick={uploadNowToExisting} disabled={uploadingNow}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {uploadingNow ? "Uploading..." : `Upload ${pendingFiles.length} now`}
                </button>
              )}
            </div>
          </div>

          {/* Existing (edit mode) */}
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
                      <button type="button" onClick={() => downloadExistingAttachment(a)} aria-label="Download"
                        className="rounded-md border border-[var(--line)] bg-white p-1.5 text-[var(--text-soft)] hover:text-[var(--brand)]">
                        <Download className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => deleteExistingAttachment(a.id)} aria-label="Delete"
                        className="rounded-md border border-[var(--line)] bg-white p-1.5 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending (will upload on save, or upload-now button in edit mode) */}
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
                        <p className="text-xs text-[var(--text-soft)]">{formatBytes(f.size)} · {f.type || "unknown type"}</p>
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
      )}

      {/* Totals strip — visible on all sections */}
      <div className="grid gap-3 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Subtotal" value={formatCurrency(liveTotals.subtotal)} />
        <Stat label="Total Payable" value={formatCurrency(liveTotals.total)} accent="brand" />
        <Stat label="Paid" value={formatCurrency(liveTotals.paid)} accent="emerald" />
        <Stat label="Balance Due" value={formatCurrency(liveTotals.balance)} accent={liveTotals.balance > 0 ? "red" : "emerald"} />
        <Stat label="Payouts" value={formatCurrency(liveTotals.payouts)} accent="slate" />
        <Stat label="Margin" value={formatCurrency(liveTotals.margin)} accent={liveTotals.margin >= 0 ? "emerald" : "red"} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : isEdit ? "Save Booking" : "Create Booking"}
        </Button>
      </div>

      {!isEdit && pendingFiles.length > 0 && (
        <p className="text-xs text-[var(--text-soft)]">
          {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} queued. They will upload right after the booking is created.
        </p>
      )}
    </form>
  );
}

function Stat({ label, value, accent }) {
  const map = {
    brand: "text-[var(--brand)]",
    emerald: "text-emerald-700",
    red: "text-red-600",
    slate: "text-slate-700"
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-1 text-base font-semibold ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}
