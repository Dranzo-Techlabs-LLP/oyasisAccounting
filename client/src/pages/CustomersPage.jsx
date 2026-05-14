import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button, Input } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import CustomerForm from "../components/CustomerForm";
import { EmptyState, SkeletonBlock } from "../components/Feedback";

export default function CustomersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await api.get("/customers", { params: { q: query } });
    setItems(response.data.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
      setOpen(false);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save customer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9" placeholder="Search customer, phone or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} className="flex-1">
              Search
            </Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="flex-1">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-80" />
      ) : items.length === 0 ? (
        <EmptyState title="No customers found" message="Customer records will appear here once you start adding travellers." />
      ) : (
        <div className="panel rounded-lg p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--text-soft)]">
                <tr>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Passport</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)]">
                    <td className="py-3">
                      <p className="font-medium text-[var(--text)]">{item.fullName}</p>
                      <p className="text-xs text-[var(--text-soft)]">{item.nationality || "Traveller"}</p>
                    </td>
                    <td className="py-3">{item.phone}</td>
                    <td className="py-3">{item.email || "--"}</td>
                    <td className="py-3">{item.passportNo || "--"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" className="w-11 px-0" onClick={() => { setEditing(item); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          className="w-11 px-0"
                          onClick={async () => {
                            if (!window.confirm("Delete this customer?")) return;
                            await api.delete(`/customers/${item.id}`);
                            toast.success("Customer deleted");
                            load();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Customer" : "Add Customer"} width="max-w-2xl">
        <CustomerForm initialValues={editing} onSubmit={submit} busy={busy} />
      </Modal>
    </div>
  );
}
