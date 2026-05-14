import { useEffect, useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

const colors = ["#0D6E6E", "#F5A623", "#0ea5a5", "#ef4444"];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/summary").then((response) => setData(response.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Dashboard unavailable" message="The summary could not be loaded." />;
  }

  const cards = [
    ["Bookings this month", data.kpis.bookingsThisMonth],
    ["Booking revenue (month)", formatCurrency(data.kpis.revenueThisMonth)],
    ["Pending booking payments", formatCurrency(data.kpis.pendingPayments)],
    ["Upcoming departures (7d)", data.kpis.upcomingDepartures]
  ];
  const ticketCards = [
    ["Ticket sales this month", data.kpis.ticketSalesThisMonth ?? 0],
    ["Ticket revenue (month)", formatCurrency(data.kpis.ticketRevenueThisMonth ?? 0)],
    ["Ticket margin (all time)", formatCurrency(data.kpis.ticketMargin ?? 0)],
    ["Ticket customer balance", formatCurrency(data.kpis.ticketPending ?? 0)]
  ];

  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Combined (Bookings + Ticket Sales)</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Total revenue (month)</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--brand)] xl:text-3xl">{formatCurrency(data.kpis.totalRevenueThisMonth ?? 0)}</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Customer balance pending</p>
            <p className="mt-3 text-2xl font-semibold text-red-600 xl:text-3xl">{formatCurrency(data.kpis.totalCustomerPending ?? 0)}</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Supplier payouts (all)</p>
            <p className="mt-3 text-2xl font-semibold text-slate-700 xl:text-3xl">{formatCurrency(data.kpis.supplierPayoutsAll ?? 0)}</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Supplier pending (to-pay)</p>
            <p className="mt-3 text-2xl font-semibold text-amber-700 xl:text-3xl">{formatCurrency(data.kpis.supplierPayoutsPending ?? 0)}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Package Bookings</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="panel rounded-lg p-5">
              <p className="text-sm text-[var(--text-soft)]">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text)] xl:text-3xl">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Ticket Sales</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ticketCards.map(([label, value]) => (
            <div key={label} className="panel rounded-lg p-5">
              <p className="text-sm text-[var(--text-soft)]">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text)] xl:text-3xl">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text)]">Monthly Revenue</h3>
            <span className="text-xs text-[var(--text-soft)]">Last 6 months</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByMonth}>
                <XAxis dataKey="month" stroke="#5f7676" tickLine={false} axisLine={false} />
                <YAxis stroke="#5f7676" tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="#0D6E6E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="panel rounded-lg p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">Booking Status Mix</h3>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.bookingStatuses} dataKey="value" nameKey="status" innerRadius={55} outerRadius={80}>
                    {data.bookingStatuses.map((item, index) => (
                      <Cell key={item.status} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel rounded-lg p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">Top Packages</h3>
            <div className="mt-4 space-y-3">
              {data.topPackages.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-md bg-[var(--surface-muted)] px-3 py-3">
                  <span className="text-sm font-medium text-[var(--text)]">{item.name}</span>
                  <span className="text-sm text-[var(--brand)]">{item.bookings} bookings</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel rounded-lg p-5">
        <h3 className="text-base font-semibold text-[var(--text)]">Recent Bookings</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--text-soft)]">
              <tr>
                <th className="pb-3 font-medium">Booking</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Departure</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBookings.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="py-3">
                    <p className="font-medium text-[var(--text)]">{item.packageName}</p>
                    <p className="text-xs text-[var(--text-soft)]">{item.bookingCode}</p>
                  </td>
                  <td className="py-3">{item.customerName}</td>
                  <td className="py-3">{formatDate(item.departureDate)}</td>
                  <td className="py-3">{formatCurrency(item.totalAmount)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <StatusBadge value={item.bookingStatus} />
                      <StatusBadge value={item.paymentStatus} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
