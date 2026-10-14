import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Ban, Copy, Download, Eye, Pencil, Plus, Send, Trash2, Wallet
} from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "../components/FormPrimitives";
import { RowActionButton, RowActionsMenu } from "../components/RowActions";
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
  const [busyRow, setBusyRow] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // B2B invoices is primary; vendors/bookings feed the form's dropdowns.
      // Settle independently so lacking read on vendors or bookings doesn't
      // blank out the invoice list. Only the primary failure is surfaced.
      const [a, b, c] = await Promise.allSettled([
        api.get("/vendor-invoices"),
        api.get("/vendors"),
        api.get("/bookings")
      ]);
      if (a.status === "fulfilled") setItems(a.value.data.items);
      else toast.error(a.reason?.response?.data?.message || "Failed to load");
      if (b.status === "fulfilled") setVendors(b.value.data.items);
      if (c.status === "fulfilled") setBookings(c.value.data.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = items.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalCollected = items.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const totalOutstanding = items.reduce((s, i) => s + Number(i.balanceDue || 0), 0);

  const submit = async (payload) => {
    try {
      setBusy(true);
      // The payment history travels with the invoice (payload.payments): the
      // server saves the invoice and its payments together and recomputes paid,
      // balance and status from them.
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

  // One row action at a time: a double-click on "Duplicate" would otherwise
  // create two copies, and Delete/Cancel shouldn't be fired twice either.
  const runRowAction = async (id, fn) => {
    if (busyRow !== null) return;
    setBusyRow(id);
    try { await fn(); } finally { setBusyRow(null); }
  };

  const markSent = async (row) => {
    try { await api.patch(`/vendor-invoices/${row.id}/mark-sent`); toast.success(`${row.invoiceNumber} marked as sent`); await load(); }
    catch (e) { toast.error(e.response?.data?.message || "Update failed"); }
  };
  const cancelInv = async (row) => {
    if (!window.confirm(`Cancel ${row.invoiceNumber}?\n\nIt will be marked CANCELLED. Payments already recorded stay in the ledger.`)) return;
    try { await api.patch(`/vendor-invoices/${row.id}/cancel`); toast.success(`${row.invoiceNumber} cancelled`); await load(); }
    catch (e) { toast.error(e.response?.data?.message || "Cancel failed"); }
  };
  const duplicate = async (row) => {
    try { await api.post(`/vendor-invoices/${row.id}/duplicate`); toast.success(`Copy of ${row.invoiceNumber} created as a draft`); await load(); }
    catch (e) { toast.error(e.response?.data?.message || "Duplicate failed"); }
  };
  const deleteInv = async (row) => {
    // The server also removes this invoice's payment entries from the ledger.
    if (!window.confirm(`Delete ${row.invoiceNumber} permanently?\n\nThis also removes its recorded payments from the income ledger and can't be undone.`)) return;
    try { await api.delete(`/vendor-invoices/${row.id}`); toast.success(`${row.invoiceNumber} deleted`); await load(); }
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
      render: (r) => {
        const payable = canWrite && r.status !== "PAID" && r.status !== "CANCELLED";
        const rowBusy = busyRow === r.id;
        const editInvoice = async () => {
          try {
            const res = await api.get(`/vendor-invoices/${r.id}`);
            setEditing(res.data); setOpen(true);
          } catch (e) { toast.error(e.response?.data?.message || "Couldn't open the invoice"); }
        };
        // Everything beyond the everyday actions lives in the menu. Read-only
        // users have no write actions, so Download stays one click away for them.
        const menuItems = [
          { label: "Download PDF", icon: Download, onClick: () => downloadInvoice(r) },
          { label: "Mark as sent", icon: Send, onClick: () => runRowAction(r.id, () => markSent(r)), hidden: !(canWrite && r.status === "DRAFT"), disabled: rowBusy },
          { label: "Duplicate", icon: Copy, onClick: () => runRowAction(r.id, () => duplicate(r)), hidden: !canWrite, disabled: rowBusy },
          { label: "Cancel invoice", icon: Ban, onClick: () => runRowAction(r.id, () => cancelInv(r)), hidden: !(canWrite && r.status !== "CANCELLED"), disabled: rowBusy },
          { label: "Delete invoice", icon: Trash2, tone: "danger", dividerBefore: true, onClick: () => runRowAction(r.id, () => deleteInv(r)), hidden: !canDelete, disabled: rowBusy }
        ];
        return (
          <div className="flex items-center gap-2">
            <RowActionButton icon={Eye} label="View invoice" text="View" showLabel onClick={() => viewInvoice(r)} />
            {canWrite && <RowActionButton icon={Pencil} label="Edit invoice" onClick={editInvoice} />}
            {payable && <RowActionButton icon={Wallet} label="Add payment" tone="primary" showLabel onClick={() => setPaymentTarget(r)} />}
            {canWrite || canDelete
              ? <RowActionsMenu label={`More actions for ${r.invoiceNumber}`} items={menuItems} />
              : <RowActionButton icon={Download} label="Download PDF" onClick={() => downloadInvoice(r)} />}
          </div>
        );
      }
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
