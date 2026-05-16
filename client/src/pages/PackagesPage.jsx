import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/packages");
      setItems(response.data.items);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let out = items;
    if (query) {
      const q = query.toLowerCase();
      out = out.filter((p) =>
        p.name.toLowerCase().includes(q) || (p.destination || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) out = out.filter((p) => p.status === statusFilter);
    const dir = sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const an = Number(av), bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "") return (an - bn) * dir;
      return String(av || "").localeCompare(String(bv || "")) * dir;
    });
  }, [items, query, statusFilter, sortBy, sortDir]);

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9 pr-9" placeholder="Search package or destination" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-3 rounded-full p-1 text-[var(--text-soft)] hover:bg-[var(--surface-muted)]" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select className="w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <Select className="w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="destination">Sort: Destination</option>
            <option value="priceAdult">Sort: Adult Price</option>
            <option value="durationDays">Sort: Duration</option>
            <option value="maxPax">Sort: Max Pax</option>
          </Select>
          <Select className="w-32" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </Select>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-64" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No packages match" message="Try clearing search or status filter." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item) => (
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
