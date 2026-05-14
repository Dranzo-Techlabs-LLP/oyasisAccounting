import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button, Input, Select } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import PackageForm from "../components/PackageForm";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency } from "../utils/formatters";

export default function PackagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await api.get("/packages", { params: filters });
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
        await api.put(`/packages/${editing.id}`, payload);
        toast.success("Package updated");
      } else {
        await api.post("/packages", payload);
        toast.success("Package created");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save package");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9" placeholder="Search package or destination" value={filters.q} onChange={(e) => setFilters((c) => ({ ...c, q: e.target.value }))} />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={load} className="flex-1">
              Apply
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="flex-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-64" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No packages yet" message="Create your first holiday package to start quoting and booking departures." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="panel overflow-hidden rounded-lg">
              {item.coverImageUrl ? (
                <img src={item.coverImageUrl} alt={item.name} className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 bg-[linear-gradient(135deg,#0d6e6e,#083f3f)]" />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text)]">{item.name}</h3>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">{item.destination}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-[var(--surface-muted)] px-3 py-3">
                    <p className="text-xs text-[var(--text-soft)]">Duration</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {item.durationDays}D / {item.durationNights}N
                    </p>
                  </div>
                  <div className="rounded-md bg-[var(--surface-muted)] px-3 py-3">
                    <p className="text-xs text-[var(--text-soft)]">Adult</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                      {formatCurrency(item.priceAdult)}
                    </p>
                  </div>
                  <div className="rounded-md bg-[var(--surface-muted)] px-3 py-3">
                    <p className="text-xs text-[var(--text-soft)]">Max pax</p>
                    <p className="mt-1 text-sm font-semibold text-[var(--text)]">{item.maxPax}</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="secondary" className="w-11 px-0" onClick={() => { setEditing(item); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="danger"
                    className="w-11 px-0"
                    onClick={async () => {
                      if (!window.confirm("Delete this package?")) return;
                      await api.delete(`/packages/${item.id}`);
                      toast.success("Package deleted");
                      load();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Package" : "Add Package"}>
        <PackageForm initialValues={editing} onSubmit={submit} busy={busy} />
      </Modal>
    </div>
  );
}
