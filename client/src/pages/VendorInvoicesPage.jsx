import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Copy, Download, Eye, FileText, MailCheck, Pencil, Plus, Send, Trash2, Wallet, X
} from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import VendorInvoiceForm from "../components/VendorInvoiceForm";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { SkeletonBlock } from "../components/Feedback";
import { downloadBlob, formatCurrency, formatDate, readBlobText, verifyPdfBlob, viewBlobInNewTab } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";

export default function VendorInvoicesPage() {
  const { can } = useAuth();
  const canWrite = can("vendorInvoices", "write");
  const canDelete = can("vendorInvoices", "delete");
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        api.get("/vendor-invoices"),
        api.get("/vendors"),
        api.get("/bookings")
      ]);
      setItems(a.data.items);
      setVendors(b.data.items);
      setBookings(c.data.items || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = items.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalCollected = items.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const totalOutstanding = items.reduce((s, i) => s + Number(i.balanceDue || 0), 0);

  const submit = async (payload) => {
    try {
      setBusy(true);
      if (editing) {
        await api.put(`/vendor-invoices/${editing.id}`, payload);
        toast.success("Invoice updated");
      } else {
        await api.post("/vendor-invoices", payload);
        toast.success("Invoice created");
      }
      setOpen(false); setEditing(null); load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const viewInvoice = async (row) => {
    try {
      const res = await api.get(`/vendor-invoices/${row.id}/pdf?inline=1`, { responseType: "blob" });
      const verdict = await verifyPdfBlob(res.data);
      if (!verdict.ok) {
        throw new Error(verdict.message);
      }
      viewBlobInNewTab(res.data);
    } catch (e) { toast.error(e.response?.data?.message || e.message || "View failed"); }
  };

  const downloadInvoice = async (row) => {
    try {
      const res = await api.get(`/vendor-invoices/${row.id}/pdf`, { responseType: "blob" });
      const verdict = await verifyPdfBlob(res.data);
      if (!verdict.ok) {
        throw new Error(verdict.message);
      }
      if (verdict.kind === "html") {
        // HTML invoice — open in new tab; user prints / saves from there.
        viewBlobInNewTab(res.data);
      } else {
        downloadBlob(res.data, `${row.invoiceNumber}.pdf`);
        toast.success("Downloaded");
      }
    } catch (e) { toast.error(e.response?.data?.message || e.message || "Download failed"); }
  };

  const markSent = async (id) => {
    try { await api.patch(`/vendor-invoices/${id}/mark-sent`); toast.success("Marked sent"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
  };
  const cancelInv = async (id) => {
    if (!window.confirm("Cancel this invoice?")) return;
    try { await api.patch(`/vendor-invoices/${id}/cancel`); toast.success("Cancelled"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Cancel failed"); }
  };
  const duplicate = async (id) => {
    try { await api.post(`/vendor-invoices/${id}/duplicate`); toast.success("Duplicated as DRAFT"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Duplicate failed"); }
  };
  const deleteInv = async (id) => {
    if (!window.confirm("Delete this invoice permanently?")) return;
    try { await api.delete(`/vendor-invoices/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
  };

  const columns = [
    {
      key: "invoiceNumber", label: "Invoice",
      accessor: (r) => r.invoiceNumber,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-mono text-sm font-semibold text-[var(--text)]">{r.invoiceNumber}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.reference || "—"}</p>
        </div>
      )
    },
    {
      key: "vendor.name", label: "Vendor",
      accessor: (r) => r.vendor?.name,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.vendor?.name || "—"}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.vendor?.type || ""}</p>
        </div>
      )
    },
    {
      key: "issueDate", label: "Date",
      accessor: (r) => r.issueDate ? new Date(r.issueDate) : null,
      render: (r) => (
        <div>
          <p>{formatDate(r.issueDate)}</p>
          {r.dueDate && <p className="text-xs text-[var(--text-soft)]">Due {formatDate(r.dueDate)}</p>}
        </div>
      )
    },
    {
      key: "totalAmount", label: "Amount",
      accessor: (r) => Number(r.totalAmount || 0),
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{formatCurrency(r.totalAmount)}</p>
          <p className="text-xs text-[var(--text-soft)]">Paid {formatCurrency(r.paidAmount)}</p>
        </div>
      )
    },
    {
      key: "balanceDue", label: "Balance",
      accessor: (r) => Number(r.balanceDue || 0),
      render: (r) => (
        <p className={`font-medium ${Number(r.balanceDue) > 0 ? "text-red-600" : "text-emerald-700"}`}>
          {formatCurrency(r.balanceDue)}
        </p>
      )
    },
    {
      key: "status", label: "Status",
      accessor: (r) => r.status,
      filterType: "select",
      filterOptions: [
        { value: "DRAFT", label: "Draft" },
        { value: "SENT", label: "Sent" },
        { value: "PAID", label: "Paid" },
        { value: "OVERDUE", label: "Overdue" },
        { value: "CANCELLED", label: "Cancelled" }
      ],
      render: (r) => <StatusBadge value={r.status} />
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button variant="secondary" className="w-9 px-0" title="View PDF" onClick={() => viewInvoice(r)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="secondary" className="w-9 px-0" title="Download PDF" onClick={() => downloadInvoice(r)}>
            <Download className="h-4 w-4" />
          </Button>
          {canWrite && r.status !== "PAID" && r.status !== "CANCELLED" && (
            <Button variant="secondary" className="w-9 px-0" title="Record Payment" onClick={() => setPaymentTarget(r)}>
              <Wallet className="h-4 w-4" />
            </Button>
          )}
          {canWrite && r.status === "DRAFT" && (
            <Button variant="secondary" className="w-9 px-0" title="Mark Sent" onClick={() => markSent(r.id)}>
              <Send className="h-4 w-4" />
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" className="w-9 px-0" title="Edit" onClick={async () => {
              const res = await api.get(`/vendor-invoices/${r.id}`);
              setEditing(res.data); setOpen(true);
            }}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" className="w-9 px-0" title="Duplicate" onClick={() => duplicate(r.id)}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {canWrite && r.status !== "CANCELLED" && (
            <Button variant="secondary" className="w-9 px-0" title="Cancel" onClick={() => cancelInv(r.id)}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" className="w-9 px-0" title="Delete" onClick={() => deleteInv(r.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KPI label="Invoiced" value={formatCurrency(totalRevenue)} />
        <KPI label="Collected" value={formatCurrency(totalCollected)} accent="emerald" />
        <KPI label="Outstanding" value={formatCurrency(totalOutstanding)} accent={totalOutstanding > 0 ? "red" : "emerald"} />
      </div>

      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">B2B Invoices</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Custom invoices to agents, corporate clients and B2B partners with line items.</p>
          </div>
          {canWrite && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="panel rounded-lg p-4">
          <DataTable
            rows={items}
            columns={columns}
            initialSort={{ key: "issueDate", dir: "desc" }}
            searchKeys={["invoiceNumber", "reference", "vendor.name"]}
            emptyMessage="No B2B invoices yet. Click 'New Invoice' to create one."
          />
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? `Edit ${editing.invoiceNumber}` : "New B2B Invoice"} width="max-w-5xl">
        <VendorInvoiceForm vendors={vendors} bookings={bookings} initialValues={editing} busy={busy} onSubmit={submit} />
      </Modal>

      {paymentTarget && (
        <Modal open={true} onClose={() => setPaymentTarget(null)} title={`Record Payment · ${paymentTarget.invoiceNumber}`} width="max-w-md">
          <PaymentForm
            balance={Number(paymentTarget.balanceDue)}
            busy={busy}
            onSubmit={async (payload) => {
              try {
                setBusy(true);
                await api.post(`/vendor-invoices/${paymentTarget.id}/payments`, payload);
                toast.success("Payment recorded · ledger entry created");
                setPaymentTarget(null);
                load();
              } catch (e) {
                toast.error(e.response?.data?.message || "Payment failed");
              } finally { setBusy(false); }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function KPI({ label, value, accent }) {
  const map = { emerald: "text-emerald-700", red: "text-red-600" };
  return (
    <div className="panel rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

function PaymentForm({ balance, onSubmit, busy }) {
  const [f, setF] = useState({
    amount: balance > 0 ? balance : "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Bank Transfer",
    reference: "",
    notes: ""
  });
  return (
    <form className="grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...f, amount: Number(f.amount) });
    }}>
      <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-soft)]">
        Balance due: <span className="font-semibold text-[var(--text)]">{formatCurrency(balance)}</span>
      </div>
      <Field label="Amount *"><Input type="number" min="1" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date"><Input type="date" value={f.paymentDate} onChange={(e) => setF({ ...f, paymentDate: e.target.value })} /></Field>
        <Field label="Method">
          <Select value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}>
            <option>Bank Transfer</option>
            <option>UPI</option>
            <option>Cash</option>
            <option>Cheque</option>
            <option>Card</option>
            <option>Other</option>
          </Select>
        </Field>
      </div>
      <Field label="Reference"><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Transaction id / cheque no." /></Field>
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !Number(f.amount)}>
          {busy ? "Saving..." : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}
