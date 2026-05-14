import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { FullPageLoader, EmptyState } from "../components/Feedback";

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, bRes] = await Promise.all([
          api.get(`/customers/${customerId}`),
          api.get(`/bookings`, { params: { customerId } })
        ]);
        if (cancelled) return;
        setCustomer(cRes.data?.customer ?? cRes.data ?? null);
        setBookings(bRes.data?.items ?? []);
      } catch {
        if (!cancelled) {
          setCustomer(null);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) return <FullPageLoader />;
  if (!customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center text-sm text-slate-500">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to customers
        </Link>
        <EmptyState title="Customer not found" description="This customer record is unavailable." />
      </div>
    );
  }

  const customerBookings = bookings.filter(
    (b) => String(b.customerId) === String(customerId)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/customers" className="inline-flex items-center text-sm text-slate-500">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to customers
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{customer.fullName}</h1>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div><span className="font-medium text-slate-700">Phone:</span> {customer.phone || "—"}</div>
          <div><span className="font-medium text-slate-700">Email:</span> {customer.email || "—"}</div>
          <div><span className="font-medium text-slate-700">Nationality:</span> {customer.nationality || "—"}</div>
          <div><span className="font-medium text-slate-700">Passport:</span> {customer.passportNo || "—"}</div>
          <div className="sm:col-span-2"><span className="font-medium text-slate-700">Address:</span> {customer.address || "—"}</div>
          {customer.notes && (
            <div className="sm:col-span-2"><span className="font-medium text-slate-700">Notes:</span> {customer.notes}</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Bookings</h2>
          <Link to="/bookings" className="text-sm text-indigo-600 hover:underline">View all bookings</Link>
        </div>
        {customerBookings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">Code</th>
                  <th className="py-2">Package</th>
                  <th className="py-2">Departure</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {customerBookings.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link to={`/bookings/${b.id}`} className="text-indigo-600 hover:underline">
                        {b.bookingCode}
                      </Link>
                    </td>
                    <td className="py-2">{b.packageName || b.package?.name || "—"}</td>
                    <td className="py-2">
                      {b.departureDate ? new Date(b.departureDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="py-2">{b.bookingStatus || "—"}</td>
                    <td className="py-2 text-right">
                      {typeof b.totalAmount === "number"
                        ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(b.totalAmount)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
