import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import CustomerForm from "../components/CustomerForm";
import DataTable from "../components/DataTable";
import { SkeletonBlock } from "../components/Feedback";

export default function CustomersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/customers");
      setItems(response.data.items);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (payload) => {
    try {
      setBusy(true);
      if (editing) {
        await api.put(`/customers/${editing.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", payload);
        toast.success("Customer added");
      }
      setOpen(false); setEditing(null); load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save customer");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "fullName", label: "Name",
      accessor: (r) => r.fullName,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.fullName}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.nationality || "Traveller"}</p>
        </div>
      )
    },
    { key: "phone", label: "Phone", accessor: (r) => r.phone, filterType: "text" },
    { key: "email", label: "Email", accessor: (r) => r.email || "--", filterType: "text" },
    { key: "passportNo", label: "Passport", accessor: (r) => r.passportNo || "--", filterType: "text" },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => (
        <div className="flex gap-2">
          <Button variant="secondary" className="w-10 px-0" onClick={() => { setEditing(r); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" className="w-10 px-0" onClick={async () => {
            if (!window.confirm("Delete this customer?")) return;
            try { await api.delete(`/customers/${r.id}`); toast.success("Customer deleted"); load(); }
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
            <h2 className="text-base font-semibold text-[var(--text)]">Customers</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Search, filter, and sort customer records.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Customer
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
            initialSort={{ key: "fullName", dir: "asc" }}
            searchKeys={["fullName", "phone", "email", "passportNo"]}
            emptyMessage="No customers match the current filters."
          />
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Customer" : "Add Customer"} width="max-w-2xl">
        <CustomerForm initialValues={editing} onSubmit={submit} busy={busy} />
      </Modal>
    </div>
  );
}
