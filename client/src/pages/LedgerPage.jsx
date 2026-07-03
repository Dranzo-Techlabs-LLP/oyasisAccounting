import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { ArrowDownCircle, ArrowUpCircle, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select, Textarea } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { SkeletonBlock } from "../components/Feedback";
import { downloadBlob, formatCurrency, formatDate } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";

const COMMON_INCOME_CATS = ["Booking Payment", "Ticket Sale Payment", "B2B Invoice Payment", "Service Fee", "Refund Received", "Other Income"];
const COMMON_EXPENSE_CATS = ["Rent", "Salary", "Utilities", "Marketing", "Internet & Phone", "Software", "Travel", "Office Supplies", "Bank Charges", "Other Expense"];

export default function LedgerPage() {
  const { can } = useAuth();
  const canWrite = can("ledger", "write");
  const canDelete = can("ledger", "delete");
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await api.get("/ledger/report", { params: { month: m } });
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(month); }, [month]);

  const submit = async (payload) => {
    try {
      setBusy(true);
      if (editing) {
        await api.put(`/ledger/${editing.id.toString().replace(/^m-/, "")}`, payload);
        toast.success("Updated");
      } else {
        await api.post("/ledger", payload);
        toast.success("Entry added");
      }
      setOpen(false); setEditing(null); load(month);
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get("/ledger/export", { params: { month }, responseType: "blob" });
      downloadBlob(res.data, `ledger-${month}.csv`);
    } catch { toast.error("Export failed"); }
  };

  const columns = [
    {
      key: "txDate", label: "Date",
      accessor: (r) => r.txDate ? new Date(r.txDate) : null,
      render: (r) => formatDate(r.txDate)
    },
    {
      key: "kind", label: "Type",
      accessor: (r) => r.kind,
      filterType: "select",
      filterOptions: [{ value: "INCOME", label: "Income" }, { value: "EXPENSE", label: "Expense" }],
      render: (r) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
          r.kind === "INCOME" ? "bg-emerald-100 text-emerald-800 ring-emerald-300" : "bg-rose-100 text-rose-800 ring-rose-300"
        }`}>
          {r.kind === "INCOME" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
          {r.kind}
        </span>
      )
    },
    { key: "category", label: "Category", accessor: (r) => r.category, filterType: "text" },
    { key: "party", label: "Party", accessor: (r) => r.party || "—", filterType: "text" },
    { key: "reference", label: "Reference", accessor: (r) => r.reference || "—", filterType: "text" },
    {
      key: "amount", label: "Amount",
      accessor: (r) => Number(r.amount || 0),
      render: (r) => (
        <p className={`text-right font-semibold ${r.kind === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>
          {r.kind === "INCOME" ? "+" : "−"} {formatCurrency(r.amount)}
        </p>
      )
    },
    {
      key: "sourceType", label: "Source",
      accessor: (r) => r.sourceType,
      render: (r) => (
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">{r.sourceType || "Manual"}</span>
      )
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => {
        const isManual = String(r.id).startsWith("m-") || r.sourceType === "Manual";
        if (!isManual) {
          return <span className="text-xs text-[var(--text-faint)]">Auto</span>;
        }
        const realId = String(r.id).replace(/^m-/, "");
        return (
          <div className="flex gap-1">
            {canWrite && (
              <Button variant="secondary" className="w-9 px-0" onClick={() => { setEditing({ ...r, id: realId }); setOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" className="w-9 px-0" onClick={async () => {
                if (!window.confirm("Delete this entry?")) return;
                try { await api.delete(`/ledger/${realId}`); toast.success("Deleted"); load(month); }
                catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const summary = data?.summary || { income: 0, expense: 0, net: 0 };

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label={`Income · ${dayjs(`${month}-01`).format("MMM YYYY")}`} value={formatCurrency(summary.income)} accent="emerald" icon={ArrowDownCircle} />
        <KPI label="Expense" value={formatCurrency(summary.expense)} accent="red" icon={ArrowUpCircle} />
        <KPI label="Net" value={formatCurrency(summary.net)} accent={summary.net >= 0 ? "emerald" : "red"} />
        <KPI label="Entries" value={(data?.rows || []).length} />
      </div>

      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
          <Button variant="secondary" onClick={() => load(month)}>Reload</Button>
          <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          {canWrite && (
            <div className="ml-auto">
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--text-soft)]">
          Auto entries flow in from booking payments, ticket sale payments, B2B invoice payments, supplier payouts and ticket-sale supplier payments. Manual entries are editable.
        </p>
      </div>

      {/* Category breakdown */}
      {data?.byCategory && data.byCategory.length > 0 && (
        <div className="panel rounded-lg p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text)]">By Category</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.byCategory.map((c) => (
              <div key={`${c.kind}-${c.category}`} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{c.category}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">{c.kind} · {c.count} entries</p>
                </div>
                <p className={`text-sm font-semibold ${c.kind === "INCOME" ? "text-emerald-700" : "text-rose-700"}`}>
                  {c.kind === "INCOME" ? "+" : "−"} {formatCurrency(c.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="panel rounded-lg p-4">
          <DataTable
            rows={data?.rows || []}
            columns={columns}
            initialSort={{ key: "txDate", dir: "desc" }}
            searchKeys={["category", "party", "reference", "notes"]}
            emptyMessage="No transactions this month."
            rowKey={(r) => r.id}
          />
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Entry" : "Add Income / Expense"} width="max-w-xl">
        <EntryForm initialValues={editing} busy={busy} onSubmit={submit} />
      </Modal>
    </div>
  );
}

function KPI({ label, value, accent, icon: Icon }) {
  const map = { emerald: "text-emerald-700", red: "text-red-600" };
  return (
    <div className="panel rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[var(--text-soft)]">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <p className="text-[10px] uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-semibold ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}

function EntryForm({ initialValues, onSubmit, busy }) {
  const isEdit = Boolean(initialValues?.id);
  const [f, setF] = useState({
    kind: "INCOME",
    category: COMMON_INCOME_CATS[0],
    party: "",
    amount: "",
    txDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Bank Transfer",
    reference: "",
    notes: ""
  });

  useEffect(() => {
    if (initialValues) {
      setF({
        kind: initialValues.kind || "INCOME",
        category: initialValues.category || "",
        party: initialValues.party || "",
        amount: initialValues.amount ?? "",
        txDate: initialValues.txDate ? String(initialValues.txDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
        paymentMethod: initialValues.paymentMethod || "Bank Transfer",
        reference: initialValues.reference || "",
        notes: initialValues.notes || ""
      });
    }
  }, [initialValues]);

  const categories = f.kind === "INCOME" ? COMMON_INCOME_CATS : COMMON_EXPENSE_CATS;

  return (
    <form className="grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...f, amount: Number(f.amount) });
    }}>
      <div className="grid gap-2 sm:grid-cols-2">
        {["INCOME", "EXPENSE"].map((k) => (
          <button key={k} type="button" onClick={() => setF({ ...f, kind: k, category: (k === "INCOME" ? COMMON_INCOME_CATS : COMMON_EXPENSE_CATS)[0] })}
            className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-semibold transition ${
              f.kind === k
                ? (k === "INCOME" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-rose-300 bg-rose-50 text-rose-800")
                : "border-[var(--line)] text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"
            }`}>
            {k === "INCOME" ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
            {k}
          </button>
        ))}
      </div>

      <Field label="Category">
        <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          {!categories.includes(f.category) && f.category ? <option value={f.category}>{f.category}</option> : null}
        </Select>
      </Field>
      <Field label="Custom category">
        <Input placeholder="Override with custom text (optional)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount *">
          <Input type="number" min="0.01" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Date">
          <Input type="date" value={f.txDate} onChange={(e) => setF({ ...f, txDate: e.target.value })} />
        </Field>
        <Field label="Party / Person">
          <Input value={f.party} onChange={(e) => setF({ ...f, party: e.target.value })} placeholder="Customer, vendor or person" />
        </Field>
        <Field label="Payment Method">
          <Select value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Card</option>
            <option>Other</option>
          </Select>
        </Field>
      </div>

      <Field label="Reference">
        <Input value={f.reference} placeholder="Transaction id / invoice no. (optional)" onChange={(e) => setF({ ...f, reference: e.target.value })} />
      </Field>
      <Field label="Notes">
        <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !Number(f.amount) || !f.category}>
          {busy ? "Saving..." : isEdit ? "Save Entry" : "Add Entry"}
        </Button>
      </div>
    </form>
  );
}
