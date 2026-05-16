import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Trash2, Building2 } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import VendorForm from "../components/VendorForm";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { SkeletonBlock } from "../components/Feedback";

const TYPE_LABEL = {
  B2B: "B2B Partner", AGENT: "Agent", CORPORATE: "Corporate",
  SUPPLIER: "Supplier", HOTEL: "Hotel", TRANSPORT: "Transport",
  AIRLINE: "Airline", OTHER: "Other"
};

export default function VendorsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/vendors");
      setItems(res.data.items);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (payload) => {
    try {
      setBusy(true);
      if (editing) {
        await api.put(`/vendors/${editing.id}`, payload);
        toast.success("Vendor updated");
      } else {
        await api.post("/vendors", payload);
        toast.success("Vendor added");
      }
      setOpen(false); setEditing(null); load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const columns = [
    {
      key: "name", label: "Name",
      accessor: (r) => r.name,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.name}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.contactName || "—"}</p>
        </div>
      )
    },
    {
      key: "type", label: "Type",
      accessor: (r) => r.type,
      filterType: "select",
      filterOptions: Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l })),
      render: (r) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">
          <Building2 className="h-3 w-3" /> {TYPE_LABEL[r.type] || r.type}
        </span>
      )
    },
    { key: "phone", label: "Phone", accessor: (r) => r.phone || "—", filterType: "text" },
    { key: "email", label: "Email", accessor: (r) => r.email || "—", filterType: "text" },
    { key: "gstin", label: "GSTIN", accessor: (r) => r.gstin || "—", filterType: "text" },
    {
      key: "isActive", label: "Status",
      accessor: (r) => r.isActive ? "Active" : "Inactive",
      filterType: "select",
      filterOptions: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }],
      render: (r) => <StatusBadge value={r.isActive ? "ACTIVE" : "INACTIVE"} />
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="secondary" className="w-10 px-0" onClick={() => { setEditing(r); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" className="w-10 px-0" onClick={async () => {
            if (!window.confirm(`Delete vendor ${r.name}?`)) return;
            try { await api.delete(`/vendors/${r.id}`); toast.success("Deleted"); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Vendors & B2B Partners</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Agents, corporate clients, hotels and suppliers you bill or pay.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Vendor
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-80" />
      ) : (
        <div className="panel rounded-lg p-4">
          <DataTable
            rows={items}
            columns={columns}
            initialSort={{ key: "name", dir: "asc" }}
            searchKeys={["name", "contactName", "email", "phone", "gstin"]}
            emptyMessage="No vendors yet."
          />
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Vendor" : "Add Vendor"} width="max-w-2xl">
        <VendorForm initialValues={editing} onSubmit={submit} busy={busy} />
      </Modal>
    </div>
  );
}
