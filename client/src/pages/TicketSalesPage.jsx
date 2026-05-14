import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Eye, Pencil, Plus, Search, Trash2, Plane, Train, Bus, Car, Ship, Ticket } from "lucide-react";
import { api } from "../api/client";
import { Button, Input, Select } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import TicketSaleForm from "../components/TicketSaleForm";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

const TYPE_ICON = { FLIGHT: Plane, TRAIN: Train, BUS: Bus, CAR: Car, BOAT: Ship, FERRY: Ship, OTHER: Ticket };

export default function TicketSalesPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [salesRes, customerRes] = await Promise.all([
      api.get("/ticket-sales", { params: filters }),
      api.get("/customers")
    ]);
    setItems(salesRes.data.items);
    setCustomers(customerRes.data.items);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = items.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalMargin = items.reduce((s, i) => s + Number(i.margin || 0), 0);
  const totalPending = items.reduce((s, i) => s + Number(i.balanceDue || 0), 0);
  const supplierPending = items.filter((i) => !i.supplierPaid).reduce((s, i) => s + Number(i.costPrice || 0), 0);

  const markSupplierPaid = async (id) => {
    try { await api.patch(`/ticket-sales/${id}/mark-supplier-paid`); toast.success("Supplier marked paid"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
  };

  return (
    <div className="grid gap-5">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Total Sales" value={formatCurrency(totalRevenue)} />
        <KPI label="Total Margin" value={formatCurrency(totalMargin)} accent={totalMargin >= 0 ? "emerald" : "red"} />
        <KPI label="Customer Balance" value={formatCurrency(totalPending)} accent={totalPending > 0 ? "red" : "emerald"} />
        <KPI label="Supplier Pending" value={formatCurrency(supplierPending)} accent={supplierPending > 0 ? "amber" : "emerald"} />
      </div>

      <div className="panel rounded-lg p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9" placeholder="Search code, PNR, vendor, customer" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="BOOKED">Booked</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} className="flex-1">Apply</Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="flex-1">
              <Plus className="h-4 w-4" /> New Sale
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState title="No ticket sales yet" message="Standalone ticket bookings (not tied to a tour package) appear here." />
      ) : (
        <div className="panel rounded-lg p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--text-soft)]">
                <tr>
                  <th className="pb-3 font-medium">Sale</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Route / Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Margin</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => {
                  const Icon = TYPE_ICON[s.ticketType] || Ticket;
                  return (
                    <tr key={s.id} className="border-t border-[var(--line)]">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-muted)]">
                            <Icon className="h-3.5 w-3.5 text-[var(--text-soft)]" />
                          </span>
                          <div>
                            <p className="font-medium text-[var(--text)]">{s.vendor || "—"}</p>
                            <p className="text-xs text-[var(--text-soft)]">{s.saleCode} · {s.reference || "no PNR"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-[var(--text)]">{s.customer?.fullName || "—"}</p>
                        <p className="text-xs text-[var(--text-soft)]">{s.customer?.phone}</p>
                      </td>
                      <td className="py-3">
                        <p className="text-[var(--text)]">{(s.fromLocation || "?")} → {(s.toLocation || "?")}</p>
                        <p className="text-xs text-[var(--text-soft)]">{s.departAt ? formatDate(s.departAt) : "—"}</p>
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-[var(--text)]">{formatCurrency(s.totalAmount)}</p>
                        <p className="text-xs text-[var(--text-soft)]">Paid {formatCurrency(s.paidAmount)}</p>
                      </td>
                      <td className="py-3">
                        <p className={`font-medium ${Number(s.margin) >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(s.margin)}</p>
                        <p className={`text-xs ${s.supplierPaid ? "text-emerald-700" : "text-amber-700"}`}>
                          Supplier {s.supplierPaid ? "paid" : "unpaid"}
                        </p>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge value={s.status} />
                          <StatusBadge value={s.paymentStatus} />
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button variant="secondary" className="w-10 px-0" onClick={() => setViewing(s)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" className="w-10 px-0" onClick={async () => {
                            const res = await api.get(`/ticket-sales/${s.id}`);
                            setEditing(res.data); setOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!s.supplierPaid && (
                            <Button variant="secondary" className="px-2 text-xs" onClick={() => markSupplierPaid(s.id)}>
                              Pay supplier
                            </Button>
                          )}
                          <Button variant="danger" className="w-10 px-0" onClick={async () => {
                            if (!window.confirm("Delete this ticket sale?")) return;
                            try { await api.delete(`/ticket-sales/${s.id}`); toast.success("Deleted"); load(); }
                            catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Ticket Sale" : "New Ticket Sale"} width="max-w-5xl">
        <TicketSaleForm
          customers={customers}
          initialValues={editing}
          busy={busy}
          onSubmit={async (payload) => {
            const pendingFiles = payload._pendingFiles || [];
            const jsonPayload = { ...payload };
            delete jsonPayload._pendingFiles;
            try {
              setBusy(true);
              let saleId = editing?.id;
              if (editing) {
                await api.put(`/ticket-sales/${editing.id}`, jsonPayload);
                toast.success("Updated");
              } else {
                const res = await api.post("/ticket-sales", jsonPayload);
                saleId = res.data?.id;
                toast.success("Created");
              }
              if (saleId && pendingFiles.length > 0) {
                const fd = new FormData();
                pendingFiles.forEach((f) => fd.append("files", f));
                try {
                  await api.post(`/ticket-sales/${saleId}/attachments`, fd, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  toast.success(`${pendingFiles.length} file(s) attached`);
                } catch (e) {
                  toast.error(e.response?.data?.message || "Sale saved but upload failed");
                }
              }
              setOpen(false); setEditing(null); load();
            } catch (e) {
              toast.error(e.response?.data?.message || "Save failed");
            } finally { setBusy(false); }
          }}
        />
      </Modal>

      {viewing && (
        <Modal open={true} onClose={() => setViewing(null)} title={`${viewing.saleCode} · ${viewing.vendor || "Ticket"}`} width="max-w-2xl">
          <div className="grid gap-3 text-sm">
            <Row label="Customer">{viewing.customer?.fullName} · {viewing.customer?.phone}</Row>
            <Row label="Type">{viewing.ticketType} · {viewing.reference || "no PNR"}</Row>
            <Row label="Route">{viewing.fromLocation || "?"} → {viewing.toLocation || "?"}</Row>
            <Row label="Depart">{viewing.departAt ? new Date(viewing.departAt).toLocaleString() : "—"}</Row>
            <Row label="Return">{viewing.returnAt ? new Date(viewing.returnAt).toLocaleString() : "—"}</Row>
            <Row label="Pax">{viewing.passengers}</Row>
            <Row label="Cost / Sell / Fee / Disc">
              {formatCurrency(viewing.costPrice)} / {formatCurrency(viewing.sellingPrice)} / {formatCurrency(viewing.serviceFee)} / {formatCurrency(viewing.discountAmount)}
            </Row>
            <Row label="Total">{formatCurrency(viewing.totalAmount)}</Row>
            <Row label="Paid / Balance">{formatCurrency(viewing.paidAmount)} / {formatCurrency(viewing.balanceDue)}</Row>
            <Row label="Margin">
              <span className={Number(viewing.margin) >= 0 ? "text-emerald-700" : "text-red-600"}>{formatCurrency(viewing.margin)}</span>
            </Row>
            <Row label="Supplier">{viewing.supplierName || "—"} {viewing.supplierPaid ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">PAID</span> : <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">UNPAID</span>}</Row>
            {viewing.note && <Row label="Note">{viewing.note}</Row>}

            <div>
              <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Payments ({(viewing.payments || []).length})</p>
              {(viewing.payments || []).length === 0 ? (
                <p className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-soft)]">No payments yet.</p>
              ) : (
                <div className="space-y-2">
                  {viewing.payments.map((p) => (
                    <div key={p.id} className="flex items-start justify-between rounded-md border border-[var(--line)] bg-white p-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{formatCurrency(p.amount)}</p>
                        <p className="text-[var(--text-soft)]">{p.method} · {formatDate(p.paymentDate)}</p>
                        {p.note && <p className="mt-1 text-[var(--text-soft)]">{p.note}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete this payment?")) return;
                          try {
                            const res = await api.delete(`/ticket-sales/${viewing.id}/payments/${p.id}`);
                            setViewing(res.data);
                            load();
                          } catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
                        }}
                        className="rounded-md border border-[var(--line)] p-1.5 text-[var(--text-soft)] hover:text-red-600"
                        aria-label="Delete payment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {Number(viewing.balanceDue) > 0 && (
                <QuickPayment saleId={viewing.id} balance={Number(viewing.balanceDue)} onDone={async () => {
                  const res = await api.get(`/ticket-sales/${viewing.id}`);
                  setViewing(res.data); load();
                }} />
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-2 border-b border-[var(--line)] py-1.5 last:border-0">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <div className="text-sm text-[var(--text)]">{children}</div>
    </div>
  );
}

function KPI({ label, value, accent }) {
  const map = { emerald: "text-emerald-700", red: "text-red-600", amber: "text-amber-700" };
  return (
    <div className="panel rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

function QuickPayment({ saleId, balance, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 rounded-md border border-dashed border-[var(--line)] p-3">
      <p className="mb-2 text-xs font-medium text-[var(--text-soft)]">Quick add payment (balance {formatCurrency(balance)})</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <Input type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Card</option><option>Cheque</option>
        </Select>
        <Button disabled={busy || !Number(amount)} onClick={async () => {
          try {
            setBusy(true);
            await api.post(`/ticket-sales/${saleId}/payments`, { amount: Number(amount), paymentDate: new Date().toISOString().slice(0, 10), method, note: "" });
            toast.success("Payment added");
            setAmount("");
            await onDone();
          } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
          finally { setBusy(false); }
        }}>Add</Button>
      </div>
    </div>
  );
}
