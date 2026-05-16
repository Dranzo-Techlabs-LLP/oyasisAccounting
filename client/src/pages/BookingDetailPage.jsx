import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Building2,
  Bus,
  Car,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Pencil,
  IndianRupee,
  MailCheck,
  Paperclip,
  Plane,
  Plus,
  Receipt,
  Ship,
  Ticket,
  Train,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import PaymentForm from "../components/PaymentForm";
import BookingForm from "../components/BookingForm";
import InvoiceOptionsModal from "../components/InvoiceOptionsModal";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { downloadBlob, formatCurrency, formatDate, readBlobText, viewBlobInNewTab } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

const PAYEE_LABELS = {
  HOTEL: "Hotel",
  B2B: "B2B Partner",
  AGENT: "Agent",
  TRANSPORT: "Transport",
  GUIDE: "Guide",
  ACTIVITY: "Activity",
  AIRLINE: "Airline",
  OTHER: "Other"
};

const TICKET_TYPE_LABEL = {
  FLIGHT: "Flight", TRAIN: "Train", BUS: "Bus", CAR: "Car", BOAT: "Boat", FERRY: "Ferry", OTHER: "Other"
};
const TICKET_TYPE_ICON = {
  FLIGHT: Plane, TRAIN: Train, BUS: Bus, CAR: Car, BOAT: Ship, FERRY: Ship, OTHER: Ticket
};
const TICKET_TYPES_LIST = ["FLIGHT", "TRAIN", "BUS", "CAR", "BOAT", "FERRY", "OTHER"];

const formatDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return String(d); }
};

const formatBytes = (n) => {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [travellerOpen, setTravellerOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [invoiceOptsOpen, setInvoiceOptsOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      setItem(response.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  const loadFormDeps = async () => {
    try {
      const [c, p, s] = await Promise.all([
        api.get("/customers"),
        api.get("/packages"),
        api.get("/settings")
      ]);
      setCustomers(c.data.items || []);
      setPackages(p.data.items || []);
      setSettings(s.data);
    } catch { /* non-fatal */ }
  };

  const buildInvoiceUrl = (opts, inline) => {
    const params = new URLSearchParams();
    if (inline) params.set("inline", "1");
    if (opts.showGstin === false) params.set("showGstin", "0");
    if (opts.includeBank === false) params.set("includeBank", "0");
    if (opts.taxRate > 0) params.set("taxRate", String(opts.taxRate));
    if (opts.notes) params.set("notes", opts.notes);
    return `/invoices/${item.id}/pdf?${params.toString()}`;
  };

  const handleInvoice = async ({ action, ...opts }) => {
    try {
      setBusy(true);
      await api.post(`/invoices/${item.id}/generate`);
      const res = await api.get(buildInvoiceUrl(opts, action === "view"), { responseType: "blob" });
      const ct = res.data?.type || "";
      if (ct.includes("application/json") || ct.includes("text/plain")) {
        const msg = await readBlobText(res.data); throw new Error(msg);
      }
      if (action === "view") viewBlobInNewTab(res.data);
      else downloadBlob(res.data, `${item.bookingCode}-invoice.pdf`);
      setInvoiceOptsOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Invoice failed");
    } finally { setBusy(false); }
  };

  useEffect(() => { load(); loadFormDeps(); }, [bookingId]);

  const deleteBooking = async () => {
    if (!window.confirm(`Delete booking ${item.bookingCode}? This removes all payments, travellers, payouts, tickets, and attachments.`)) return;
    try {
      await api.delete(`/bookings/${item.id}`);
      toast.success("Booking deleted");
      navigate("/bookings");
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <SkeletonBlock className="h-[32rem]" />;
  if (!item) return <EmptyState title="Booking not found" message="The booking may have been removed or is unavailable." />;

  const total = Number(item.totalAmount || 0);
  const paid = Number(item.paidAmount || 0);
  const balance = Number(item.balanceDue || 0);
  const pct = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
  const totalPayouts = (item.payouts || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidPayouts = (item.payouts || []).filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingPayouts = totalPayouts - paidPayouts;
  const margin = total - totalPayouts;

  const deletePayment = async (paymentId) => {
    if (!window.confirm("Delete this payment? Balance will recalculate.")) return;
    try {
      await api.delete(`/bookings/${item.id}/payments/${paymentId}`);
      toast.success("Payment removed");
      load();
    } catch (error) { toast.error(error.response?.data?.message || "Unable to delete payment"); }
  };

  const deleteTraveller = async (id) => {
    if (!window.confirm("Remove this traveller?")) return;
    try { await api.delete(`/bookings/${item.id}/travellers/${id}`); toast.success("Traveller removed"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Unable to delete"); }
  };

  const deletePayout = async (id) => {
    if (!window.confirm("Remove this supplier payout?")) return;
    try { await api.delete(`/bookings/${item.id}/payouts/${id}`); toast.success("Payout removed"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Unable to delete"); }
  };

  const deleteTicket = async (id) => {
    if (!window.confirm("Remove this ticket?")) return;
    try { await api.delete(`/bookings/${item.id}/tickets/${id}`); toast.success("Ticket removed"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Unable to delete"); }
  };

  const markPayoutPaid = async (id) => {
    try { await api.patch(`/bookings/${item.id}/payouts/${id}/mark-paid`); toast.success("Marked paid"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Unable to update"); }
  };

  const deleteAttachment = async (id) => {
    if (!window.confirm("Delete this attachment?")) return;
    try { await api.delete(`/bookings/${item.id}/attachments/${id}`); toast.success("Attachment deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Unable to delete"); }
  };

  const uploadFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const fd = new FormData();
    Array.from(fileList).forEach((f) => fd.append("files", f));
    try {
      setBusy(true);
      await api.post(`/bookings/${item.id}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Files uploaded");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadAttachment = async (att) => {
    try {
      const res = await api.get(`/bookings/${item.id}/attachments/${att.id}`, { responseType: "blob" });
      downloadBlob(res.data, att.originalName);
    } catch (e) { toast.error("Download failed"); }
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT */}
        <div className="grid gap-5">
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-soft)]">{item.bookingCode}</p>
                <h2 className="mt-1 break-words text-xl font-semibold text-[var(--text)] sm:text-2xl">
                  {item.travelPackage.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">
                  {item.travelPackage.destination} · {formatDate(item.departureDate)}{item.endDate ? ` → ${formatDate(item.endDate)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={item.bookingStatus} />
                <StatusBadge value={item.paymentStatus} />
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="danger" onClick={deleteBooking}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Primary Customer</p>
                <p className="mt-3 text-base font-semibold text-[var(--text)]">{item.customer.fullName}</p>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{item.customer.phone}</p>
                <p className="break-all text-sm text-[var(--text-soft)]">{item.customer.email || "No email on file"}</p>
              </div>
              <div className="rounded-md bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Pax & pricing</p>
                <p className="mt-3 text-sm text-[var(--text)]">{item.adults} adults / {item.children} children</p>
                <p className="mt-1 text-sm text-[var(--text)]">{item.travelPackage.durationDays}D / {item.travelPackage.durationNights}N</p>
                <p className="mt-1 text-sm text-[var(--text)]">
                  Adult {formatCurrency(item.adultPriceOverride ?? item.travelPackage.priceAdult)}
                  {item.adultPriceOverride != null && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">CUSTOM</span>}
                  {" · "}
                  Child {formatCurrency(item.childPriceOverride ?? item.travelPackage.priceChild)}
                  {item.childPriceOverride != null && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">CUSTOM</span>}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Total", formatCurrency(total), IndianRupee, "text-[var(--brand)]"],
                ["Paid", formatCurrency(paid), Wallet, "text-emerald-700"],
                ["Balance", formatCurrency(balance), Receipt, balance > 0 ? "text-red-600" : "text-emerald-700"]
              ].map(([label, value, Icon, color]) => (
                <div key={label} className="rounded-md border border-[var(--line)] bg-white px-4 py-4">
                  <div className="flex items-center gap-2 text-[var(--text-soft)]">
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.16em]">{label}</span>
                  </div>
                  <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-soft)]">
                <span>Payment progress</span>
                <span className="font-medium text-[var(--text)]">{pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div className={`h-full ${pct >= 100 ? "bg-emerald-500" : "bg-[var(--brand)]"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* P&L strip */}
            <div className="mt-5 grid gap-3 rounded-md border border-[var(--line)] bg-white p-3 sm:grid-cols-3">
              <Stat label="Supplier Payouts" value={formatCurrency(totalPayouts)} accent="slate" />
              <Stat label="Pending Payouts" value={formatCurrency(pendingPayouts)} accent={pendingPayouts > 0 ? "red" : "emerald"} />
              <Stat label="Estimated Margin" value={formatCurrency(margin)} accent={margin >= 0 ? "emerald" : "red"} />
            </div>

            {/* Cost breakdown */}
            <div className="mt-5 rounded-md border border-[var(--line)] bg-white p-4">
              <h3 className="text-base font-semibold text-[var(--text)]">Cost Breakdown</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
                <div className="flex justify-between"><span>Adult fare × {item.adults}</span><span>{formatCurrency((item.adultPriceOverride ?? item.travelPackage.priceAdult) * item.adults)}</span></div>
                <div className="flex justify-between"><span>Child fare × {item.children}</span><span>{formatCurrency((item.childPriceOverride ?? item.travelPackage.priceChild) * item.children)}</span></div>
                {(item.extraCharges || []).map((c, i) => (
                  <div key={i} className="flex justify-between"><span>{c.label}</span><span>{formatCurrency(c.amount)}</span></div>
                ))}
                <div className="flex justify-between border-t border-[var(--line)] pt-2 font-medium"><span>Discount</span><span>- {formatCurrency(item.discountAmount)}</span></div>
                <div className="flex justify-between border-t border-[var(--line)] pt-2 font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            </div>
          </div>

          {/* Travellers */}
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <Users className="h-4 w-4" /> Travellers
                <span className="text-xs font-normal text-[var(--text-soft)]">({(item.travellers || []).length})</span>
              </h3>
              <Button variant="secondary" onClick={() => setTravellerOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add Traveller
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {(item.travellers || []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No travellers added.</p>
              ) : item.travellers.map((t) => (
                <div key={t.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {t.fullName}
                        {t.isPrimary && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Primary</span>}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {[t.age && `${t.age}y`, t.gender, t.passportNo && `Pass: ${t.passportNo}`, t.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                      {t.note && <p className="mt-2 text-sm text-[var(--text-soft)] break-words">{t.note}</p>}
                    </div>
                    <button onClick={() => deleteTraveller(t.id)} aria-label="Remove" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <Ticket className="h-4 w-4" /> Tickets
                <span className="text-xs font-normal text-[var(--text-soft)]">({(item.tickets || []).length})</span>
              </h3>
              <Button variant="secondary" onClick={() => setTicketOpen(true)}>
                <Plus className="h-4 w-4" /> Add Ticket
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {(item.tickets || []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No tickets booked.</p>
              ) : item.tickets.map((t) => {
                const Icon = TICKET_TYPE_ICON[t.ticketType] || Ticket;
                return (
                  <div key={t.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                            <Icon className="h-3 w-3" /> {TICKET_TYPE_LABEL[t.ticketType] || t.ticketType}
                          </span>
                          <p className="text-sm font-semibold text-[var(--text)]">{t.vendor || "—"}</p>
                          {t.reference && <span className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-soft)]">{t.reference}</span>}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            t.status === "BOOKED" ? "bg-emerald-100 text-emerald-700"
                            : t.status === "CANCELLED" ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-800"
                          }`}>{t.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                          {[
                            (t.fromLocation || t.toLocation) && `${t.fromLocation || "?"} → ${t.toLocation || "?"}`,
                            t.departAt && `Depart ${formatDateTime(t.departAt)}`,
                            t.returnAt && `Return ${formatDateTime(t.returnAt)}`,
                            t.passengers && `${t.passengers} pax`,
                            t.amount > 0 && formatCurrency(t.amount)
                          ].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {t.note && <p className="mt-2 text-sm text-[var(--text-soft)] break-words">{t.note}</p>}
                      </div>
                      <button onClick={() => deleteTicket(t.id)} aria-label="Remove" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Supplier Payouts */}
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <Building2 className="h-4 w-4" /> Supplier / B2B Payouts
                <span className="text-xs font-normal text-[var(--text-soft)]">({(item.payouts || []).length})</span>
              </h3>
              <Button variant="secondary" onClick={() => setPayoutOpen(true)}>
                <Plus className="h-4 w-4" /> Add Payout
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {(item.payouts || []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No supplier payouts logged.</p>
              ) : item.payouts.map((p) => (
                <div key={p.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">{PAYEE_LABELS[p.payeeType] || p.payeeType}</span>
                        <p className="text-sm font-semibold text-[var(--text)]">{p.payeeName}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          p.status === "PAID" ? "bg-emerald-100 text-emerald-700"
                          : p.status === "CANCELLED" ? "bg-slate-200 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                        }`}>{p.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {[
                          `Amount: ${formatCurrency(p.amount)}`,
                          p.dueDate && `Due ${formatDate(p.dueDate)}`,
                          p.paidDate && `Paid ${formatDate(p.paidDate)}`,
                          p.reference && `Ref: ${p.reference}`
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {p.note && <p className="mt-2 text-sm text-[var(--text-soft)] break-words">{p.note}</p>}
                    </div>
                    <div className="flex gap-1">
                      {p.status !== "PAID" && (
                        <button onClick={() => markPayoutPaid(p.id)} title="Mark paid" className="rounded-md border border-[var(--line)] p-2 text-emerald-600 hover:bg-emerald-50">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => deletePayout(p.id)} aria-label="Remove" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="grid gap-5">
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPaymentOpen(true)}>
                <Plus className="h-4 w-4" /> Add Payment
              </Button>
              <Button variant="secondary" onClick={() => setInvoiceOptsOpen(true)}>
                <FileText className="h-4 w-4" /> Invoice
              </Button>
              {item.invoice && (
                <Button variant="secondary" onClick={async () => {
                  await api.patch(`/invoices/${item.invoice.id}/sent`);
                  toast.success("Invoice marked as sent"); load();
                }}>
                  <MailCheck className="h-4 w-4" /> Mark Sent
                </Button>
              )}
            </div>

            <div className="mt-4 rounded-md bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">Invoice</p>
              <p className="mt-2 text-base font-semibold text-[var(--text)]">{item.invoice?.invoiceNumber || "Not generated yet"}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">
                {item.invoice ? `Issued ${formatDate(item.invoice.issuedDate)}` : "Generate the first invoice from this booking."}
              </p>
            </div>
          </div>

          {/* Payment history */}
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text)]">Payment History</h3>
              <span className="text-xs text-[var(--text-soft)]">{item.payments.length} installment{item.payments.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-3 space-y-2">
              {item.payments.length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No payments yet.</p>
              ) : item.payments.map((p, idx) => (
                <div key={p.id} className="rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 text-[10px] font-semibold text-[var(--text-soft)]">#{item.payments.length - idx}</span>
                        <p className="text-base font-semibold text-[var(--text)]">{formatCurrency(p.amount)}</p>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">{p.method} · {formatDate(p.paymentDate)}</p>
                      {p.note && <p className="mt-2 text-sm text-[var(--text-soft)] break-words">{p.note}</p>}
                    </div>
                    <button onClick={() => deletePayment(p.id)} aria-label="Delete" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {balance > 0 && (
              <button type="button" onClick={() => setPaymentOpen(true)}
                className="mt-3 w-full rounded-md border border-dashed border-[var(--line)] py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--surface-muted)]">
                + Record next installment ({formatCurrency(balance)} remaining)
              </button>
            )}
          </div>

          {/* Attachments */}
          <div className="panel rounded-lg p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <Paperclip className="h-4 w-4" /> Attachments
                <span className="text-xs font-normal text-[var(--text-soft)]">({(item.attachments || []).length})</span>
              </h3>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" /> {busy ? "Uploading..." : "Upload"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-[var(--text-soft)]">Passport scans, hotel vouchers, signed contracts, tickets — up to 10 MB each.</p>

            <div className="mt-3 space-y-2">
              {(item.attachments || []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">No files uploaded.</p>
              ) : item.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface-muted)]">
                      <FileText className="h-4 w-4 text-[var(--text-soft)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text)]">{a.originalName}</p>
                      <p className="text-xs text-[var(--text-soft)]">{formatBytes(a.size)} · {formatDate(a.uploadedAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => downloadAttachment(a)} aria-label="Download" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:text-[var(--brand)]">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteAttachment(a.id)} aria-label="Delete" className="rounded-md border border-[var(--line)] p-2 text-[var(--text-soft)] hover:border-red-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Payment */}
      {/* Invoice Options */}
      <InvoiceOptionsModal
        open={invoiceOptsOpen}
        onClose={() => setInvoiceOptsOpen(false)}
        settings={settings}
        busy={busy}
        onConfirm={handleInvoice}
      />

      {/* Edit Booking */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Booking" width="max-w-5xl">
        <BookingForm
          customers={customers}
          packages={packages}
          initialValues={item}
          busy={busy}
          onSubmit={async (payload) => {
            const pendingFiles = payload._pendingFiles || [];
            const jsonPayload = { ...payload };
            delete jsonPayload._pendingFiles;
            try {
              setBusy(true);
              await api.put(`/bookings/${item.id}`, jsonPayload);
              if (pendingFiles.length > 0) {
                const fd = new FormData();
                pendingFiles.forEach((f) => fd.append("files", f));
                try {
                  await api.post(`/bookings/${item.id}/attachments`, fd, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  toast.success(`${pendingFiles.length} file(s) attached`);
                } catch (e) {
                  toast.error(e.response?.data?.message || "Save ok but upload failed");
                }
              }
              toast.success("Booking updated");
              setEditOpen(false);
              load();
            } catch (e) {
              toast.error(e.response?.data?.message || "Update failed");
            } finally { setBusy(false); }
          }}
        />
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Add Payment" width="max-w-xl">
        <PaymentForm busy={busy} balance={balance}
          onSubmit={async (payload) => {
            try { setBusy(true); await api.post(`/bookings/${item.id}/payments`, payload); toast.success("Payment logged"); setPaymentOpen(false); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Unable to record payment"); }
            finally { setBusy(false); }
          }} />
      </Modal>

      {/* Add Traveller */}
      <Modal open={travellerOpen} onClose={() => setTravellerOpen(false)} title="Add Traveller" width="max-w-xl">
        <TravellerForm busy={busy}
          onSubmit={async (payload) => {
            try { setBusy(true); await api.post(`/bookings/${item.id}/travellers`, payload); toast.success("Traveller added"); setTravellerOpen(false); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Unable to add"); }
            finally { setBusy(false); }
          }} />
      </Modal>

      {/* Add Ticket */}
      <Modal open={ticketOpen} onClose={() => setTicketOpen(false)} title="Add Ticket" width="max-w-2xl">
        <TicketForm busy={busy} defaultPax={(item.adults || 0) + (item.children || 0) || 1}
          onSubmit={async (payload) => {
            try { setBusy(true); await api.post(`/bookings/${item.id}/tickets`, payload); toast.success("Ticket added"); setTicketOpen(false); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Unable to add"); }
            finally { setBusy(false); }
          }} />
      </Modal>

      {/* Add Payout */}
      <Modal open={payoutOpen} onClose={() => setPayoutOpen(false)} title="Add Supplier Payout" width="max-w-xl">
        <PayoutForm busy={busy}
          onSubmit={async (payload) => {
            try { setBusy(true); await api.post(`/bookings/${item.id}/payouts`, payload); toast.success("Payout added"); setPayoutOpen(false); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Unable to add"); }
            finally { setBusy(false); }
          }} />
      </Modal>
    </div>
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

function TravellerForm({ onSubmit, busy }) {
  const [f, setF] = useState({ fullName: "", age: "", gender: "", passportNo: "", phone: "", isPrimary: false, note: "" });
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, age: f.age === "" ? null : Number(f.age) }); }}>
      <Field label="Full name *"><Input value={f.fullName} required onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Age"><Input type="number" min="0" max="120" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></Field>
        <Field label="Gender">
          <Select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="">—</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
          </Select>
        </Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label="Passport no"><Input value={f.passportNo} onChange={(e) => setF({ ...f, passportNo: e.target.value })} /></Field>
      <Field label="Note"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
        <input type="checkbox" checked={f.isPrimary} onChange={(e) => setF({ ...f, isPrimary: e.target.checked })} />
        Mark as primary traveller
      </label>
      <div className="flex justify-end"><Button type="submit" disabled={busy || !f.fullName.trim()}>{busy ? "Saving..." : "Add Traveller"}</Button></div>
    </form>
  );
}

function TicketForm({ onSubmit, busy, defaultPax = 1 }) {
  const [f, setF] = useState({
    ticketType: "FLIGHT", vendor: "", reference: "", fromLocation: "", toLocation: "",
    departAt: "", returnAt: "", passengers: defaultPax, amount: "", status: "BOOKED", note: ""
  });
  return (
    <form className="grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...f,
        passengers: Number(f.passengers || 1),
        amount: Number(f.amount || 0),
        departAt: f.departAt || null,
        returnAt: f.returnAt || null
      });
    }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <Select value={f.ticketType} onChange={(e) => setF({ ...f, ticketType: e.target.value })}>
            {TICKET_TYPES_LIST.map((v) => <option key={v} value={v}>{TICKET_TYPE_LABEL[v]}</option>)}
          </Select>
        </Field>
        <Field label="Vendor / Operator"><Input value={f.vendor} placeholder="e.g. Indigo, IRCTC" onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
        <Field label="PNR / Reference"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="From"><Input value={f.fromLocation} onChange={(e) => setF({ ...f, fromLocation: e.target.value })} /></Field>
        <Field label="To"><Input value={f.toLocation} onChange={(e) => setF({ ...f, toLocation: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Departure"><Input type="datetime-local" value={f.departAt} onChange={(e) => setF({ ...f, departAt: e.target.value })} /></Field>
        <Field label="Return (optional)"><Input type="datetime-local" value={f.returnAt} onChange={(e) => setF({ ...f, returnAt: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Passengers"><Input type="number" min="0" value={f.passengers} onChange={(e) => setF({ ...f, passengers: e.target.value })} /></Field>
        <Field label="Amount"><Input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="BOOKED">Booked</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </Field>
      </div>
      <Field label="Note"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Add Ticket"}</Button></div>
    </form>
  );
}

function PayoutForm({ onSubmit, busy }) {
  const [f, setF] = useState({ payeeType: "HOTEL", payeeName: "", amount: "", status: "PENDING", dueDate: "", paidDate: "", reference: "", note: "" });
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, amount: Number(f.amount || 0) }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Payee Type">
          <Select value={f.payeeType} onChange={(e) => setF({ ...f, payeeType: e.target.value })}>
            {Object.entries(PAYEE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Payee name *"><Input value={f.payeeName} required onChange={(e) => setF({ ...f, payeeName: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount *"><Input type="number" min="0" step="0.01" value={f.amount} required onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due Date"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <Field label="Paid Date"><Input type="date" value={f.paidDate} onChange={(e) => setF({ ...f, paidDate: e.target.value })} /></Field>
      </div>
      <Field label="Reference"><Input placeholder="Voucher / PO / Txn no." value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
      <Field label="Note"><Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <div className="flex justify-end"><Button type="submit" disabled={busy || !f.payeeName.trim()}>{busy ? "Saving..." : "Add Payout"}</Button></div>
    </form>
  );
}
