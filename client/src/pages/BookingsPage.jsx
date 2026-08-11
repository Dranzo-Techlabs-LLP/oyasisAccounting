import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import BookingForm from "../components/BookingForm";
import DataTable from "../components/DataTable";
import { SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

// "B2B Partners (ABC Travels)" for B2B bookings, otherwise the plain name.
const bookedByLabel = (r) =>
  r.bookedBy === "B2B Partners" && r.bookedByPartner
    ? `B2B Partners (${r.bookedByPartner})`
    : (r.bookedBy || "");

// Rank-badge styling for the agent leaderboard: gold / silver / bronze for the
// top three, neutral for the rest.
const RANK_STYLES = [
  "bg-yellow-100 text-yellow-800 ring-yellow-300",
  "bg-slate-100 text-slate-700 ring-slate-300",
  "bg-orange-100 text-orange-800 ring-orange-300"
];
const rankStyle = (i) => RANK_STYLES[i] || "bg-[var(--surface-muted)] text-[var(--text-soft)] ring-[var(--line)]";

export default function BookingsPage() {
  const { can } = useAuth();
  const canWrite = can("bookings", "write");
  const canDelete = can("bookings", "delete");
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  // Leaderboard of agents by number of bookings ("Booked By"). Recomputed from
  // the loaded bookings, so ranks reorder automatically as counts change.
  // B2B Partners are grouped together; bookings with no Booked By are ignored.
  const agentLeaderboard = useMemo(() => {
    const counts = new Map();
    for (const b of items) {
      const name = b.bookedBy;
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);
  const topCount = agentLeaderboard[0]?.count || 0;

  const load = async () => {
    setLoading(true);
    try {
      // Bookings is the primary resource; customers/packages are only needed to
      // populate the create/edit form. Settle independently so a role that can
      // view bookings but lacks customers/packages read (a 403 on those) still
      // gets the list instead of an empty page. Only the primary error surfaces.
      const [bookingRes, customerRes, packageRes] = await Promise.allSettled([
        api.get("/bookings"),
        api.get("/customers"),
        api.get("/packages")
      ]);
      if (bookingRes.status === "fulfilled") setItems(bookingRes.value.data.items);
      else toast.error(bookingRes.reason?.response?.data?.message || "Failed to load bookings");
      if (customerRes.status === "fulfilled") setCustomers(customerRes.value.data.items);
      if (packageRes.status === "fulfilled") setPackages(packageRes.value.data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      key: "bookingCode", label: "Booking",
      accessor: (r) => r.bookingCode,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.travelPackage?.name}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.bookingCode}</p>
        </div>
      )
    },
    {
      key: "customer.fullName", label: "Customer",
      accessor: (r) => r.customer?.fullName,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.customer?.fullName}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.travelPackage?.destination}</p>
        </div>
      )
    },
    {
      key: "bookedBy", label: "Booked By",
      accessor: (r) => bookedByLabel(r),
      filterType: "text",
      render: (r) => {
        const label = bookedByLabel(r);
        return label ? <p className="text-sm text-[var(--text)]">{label}</p> : <span className="text-xs text-[var(--text-faint)]">—</span>;
      }
    },
    {
      key: "departureDate", label: "Departure",
      accessor: (r) => r.departureDate ? new Date(r.departureDate) : null,
      render: (r) => (
        <div>
          <p>{formatDate(r.departureDate)}</p>
          {r.endDate && <p className="text-xs text-[var(--text-soft)]">to {formatDate(r.endDate)}</p>}
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
      key: "bookingStatus", label: "Booking Status",
      accessor: (r) => r.bookingStatus,
      filterType: "select",
      filterOptions: [
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "TENTATIVE", label: "Tentative" },
        { value: "CANCELLED", label: "Cancelled" },
        { value: "COMPLETED", label: "Completed" }
      ],
      render: (r) => <StatusBadge value={r.bookingStatus} />
    },
    {
      key: "paymentStatus", label: "Payment",
      accessor: (r) => r.paymentStatus,
      filterType: "select",
      filterOptions: [
        { value: "PENDING", label: "Pending" },
        { value: "PARTIAL", label: "Partial" },
        { value: "PAID", label: "Paid" }
      ],
      render: (r) => <StatusBadge value={r.paymentStatus} />
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Link to={`/bookings/${r.id}`}>
            <Button variant="secondary" className="w-10 px-0">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canWrite && (
            <Button variant="secondary" className="w-10 px-0" onClick={async () => {
              const res = await api.get(`/bookings/${r.id}`);
              setEditing(res.data); setOpen(true);
            }}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" className="w-10 px-0" onClick={async () => {
              if (!window.confirm("Delete this booking?")) return;
              try { await api.delete(`/bookings/${r.id}`); toast.success("Deleted"); load(); }
              catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
            }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Bookings</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Search, filter, and sort all package bookings.</p>
          </div>
          {canWrite && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> New Booking
            </Button>
          )}
        </div>
      </div>

      {!loading && (
        <div className="panel rounded-lg p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">Bookings by Agent</h3>
            <span className="text-xs text-[var(--text-soft)]">· ranked by total bookings</span>
          </div>
          {agentLeaderboard.length === 0 ? (
            <p className="rounded-md bg-[var(--surface-muted)] px-3 py-3 text-sm text-[var(--text-soft)]">
              No bookings have a “Booked By” agent yet. Set it on a booking and agents will be ranked here.
            </p>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {agentLeaderboard.map((a, i) => (
                <li key={a.name} className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-white px-3 py-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankStyle(i)}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--text)]">{a.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-[var(--text)]">
                        {a.count} <span className="text-xs font-normal text-[var(--text-soft)]">{a.count === 1 ? "booking" : "bookings"}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                      <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${topCount ? (a.count / topCount) * 100 : 0}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {loading ? (
        <SkeletonBlock className="h-96" />
      ) : (
        <div className="panel rounded-lg p-4">
          <DataTable
            rows={items}
            columns={columns}
            initialSort={{ key: "departureDate", dir: "desc" }}
            searchKeys={["bookingCode", "customer.fullName", "travelPackage.name", "travelPackage.destination"]}
            emptyMessage="No bookings match the current filters."
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "Edit Booking" : "Create Booking"}
        width="max-w-5xl"
      >
        <BookingForm
          customers={customers}
          packages={packages}
          initialValues={editing}
          onSubmit={async (payload) => {
            const pendingFiles = payload._pendingFiles || [];
            const jsonPayload = { ...payload };
            delete jsonPayload._pendingFiles;
            try {
              setBusy(true);
              let bookingId = editing?.id;
              if (editing) {
                await api.put(`/bookings/${editing.id}`, jsonPayload);
                toast.success("Booking updated");
              } else {
                const res = await api.post("/bookings", jsonPayload);
                bookingId = res.data?.id;
                toast.success("Booking created");
              }
              if (bookingId && pendingFiles.length > 0) {
                const fd = new FormData();
                pendingFiles.forEach((f) => fd.append("files", f));
                try {
                  await api.post(`/bookings/${bookingId}/attachments`, fd, {
                    headers: { "Content-Type": "multipart/form-data" }
                  });
                  toast.success(`${pendingFiles.length} file(s) attached`);
                } catch (e) {
                  toast.error(e.response?.data?.message || "Booking saved but file upload failed");
                }
              }
              setOpen(false); setEditing(null); load();
            } catch (error) {
              toast.error(error.response?.data?.message || "Unable to save booking");
            } finally { setBusy(false); }
          }}
          busy={busy}
        />
      </Modal>
    </div>
  );
}
