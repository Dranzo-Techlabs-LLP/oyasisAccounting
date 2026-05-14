import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { Button, Input, Select } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import BookingForm from "../components/BookingForm";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

export default function BookingsPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [bookingRes, customerRes, packageRes] = await Promise.all([
      api.get("/bookings", { params: filters }),
      api.get("/customers"),
      api.get("/packages")
    ]);
    setItems(bookingRes.data.items);
    setCustomers(customerRes.data.items);
    setPackages(packageRes.data.items);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-soft)]" />
            <Input className="pl-9" placeholder="Search booking, customer or package" value={filters.q} onChange={(e) => setFilters((c) => ({ ...c, q: e.target.value }))} />
          </div>
          <Select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
            <option value="">All booking statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="TENTATIVE">Tentative</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
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
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState title="No bookings yet" message="Start with a booking to unlock invoices, collections, and monthly planning." />
      ) : (
        <div className="panel rounded-lg p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--text-soft)]">
                <tr>
                  <th className="pb-3 font-medium">Booking</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Departure</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)]">
                    <td className="py-3">
                      <p className="font-medium text-[var(--text)]">{item.travelPackage.name}</p>
                      <p className="text-xs text-[var(--text-soft)]">{item.bookingCode}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-[var(--text)]">{item.customer.fullName}</p>
                      <p className="text-xs text-[var(--text-soft)]">{item.travelPackage.destination}</p>
                    </td>
                    <td className="py-3">{formatDate(item.departureDate)}</td>
                    <td className="py-3">
                      <p className="font-medium text-[var(--text)]">{formatCurrency(item.totalAmount)}</p>
                      <p className="text-xs text-[var(--text-soft)]">Paid {formatCurrency(item.paidAmount)}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <StatusBadge value={item.bookingStatus} />
                        <StatusBadge value={item.paymentStatus} />
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/bookings/${item.id}`}>
                          <Button variant="secondary" className="w-11 px-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          className="w-11 px-0"
                          onClick={async () => {
                            const response = await api.get(`/bookings/${item.id}`);
                            setEditing(response.data);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger"
                          className="w-11 px-0"
                          onClick={async () => {
                            if (!window.confirm("Delete this booking?")) return;
                            try {
                              await api.delete(`/bookings/${item.id}`);
                              toast.success("Booking deleted");
                              load();
                            } catch (error) {
                              toast.error(error.response?.data?.message || "Unable to delete booking");
                            }
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

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
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
              setOpen(false);
              setEditing(null);
              load();
            } catch (error) {
              toast.error(error.response?.data?.message || "Unable to save booking");
            } finally {
              setBusy(false);
            }
          }}
          busy={busy}
        />
      </Modal>
    </div>
  );
}
