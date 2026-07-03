import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import BookingForm from "../components/BookingForm";
import DataTable from "../components/DataTable";
import { SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

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

  const load = async () => {
    setLoading(true);
    try {
      const [bookingRes, customerRes, packageRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/customers"),
        api.get("/packages")
      ]);
      setItems(bookingRes.data.items);
      setCustomers(customerRes.data.items);
      setPackages(packageRes.data.items);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load bookings");
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
