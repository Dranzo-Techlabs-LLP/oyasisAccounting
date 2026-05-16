import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Button, Input } from "../components/FormPrimitives";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

function OverviewList({ title, items }) {
  return (
    <section className="panel rounded-lg p-5">
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-soft)]">No bookings in this section for the selected month.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="rounded-md border border-[var(--line)] bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-[var(--text)]">{item.customer.fullName}</p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {item.travelPackage.name} | {item.travelPackage.destination}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">
                    {formatDate(item.departureDate)}{item.endDate ? ` → ${formatDate(item.endDate)}` : ""} | {item.adults + item.children} pax
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--text)]">{formatCurrency(item.totalAmount)}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                    Payouts {formatCurrency(item.payoutsTotal || 0)} · Margin <span className={(item.estimatedMargin || 0) >= 0 ? "text-emerald-700" : "text-red-600"}>{formatCurrency(item.estimatedMargin || 0)}</span>
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <StatusBadge value={item.paymentStatus} />
                    <Link to={`/bookings/${item.id}`}>
                      <Button variant="secondary">Open</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default function BookingsOverviewPage() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (targetMonth = month) => {
    setLoading(true);
    const response = await api.get("/bookings/overview", { params: { month: targetMonth } });
    setData(response.data);
    setLoading(false);
  };

  useEffect(() => {
    load(month);
  }, []);

  if (loading && !data) {
    return <SkeletonBlock className="h-[28rem]" />;
  }

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
          <Button variant="secondary" onClick={() => load(month)}>
            Load Month
          </Button>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Stat label="Bookings" value={data.summary.totalBookings} />
            <Stat label="Revenue" value={formatCurrency(data.summary.totalRevenue)} accent="brand" />
            <Stat label="Customer Pending" value={formatCurrency(data.summary.pendingPayments)} accent={data.summary.pendingPayments > 0 ? "red" : "emerald"} />
            <Stat label="Supplier Payouts" value={formatCurrency(data.summary.totalPayouts ?? 0)} accent="slate" />
            <Stat label="Supplier Pending" value={formatCurrency(data.summary.payoutsPending ?? 0)} accent={data.summary.payoutsPending > 0 ? "amber" : "emerald"} />
            <Stat label="Est. Margin" value={formatCurrency(data.summary.estimatedMargin ?? 0)} accent={(data.summary.estimatedMargin ?? 0) >= 0 ? "emerald" : "red"} />
          </div>

          {data.upcoming.length === 0 && data.past.length === 0 ? (
            <EmptyState title="No bookings this month" message="Try another month to inspect departure history and upcoming guests." />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <OverviewList title="Upcoming Bookings" items={data.upcoming} />
              <OverviewList title="Past Bookings" items={data.past} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }) {
  const map = { brand: "text-[var(--brand)]", emerald: "text-emerald-700", red: "text-red-600", amber: "text-amber-700", slate: "text-slate-700" };
  return (
    <div className="panel rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-soft)]">{label}</p>
      <p className={`mt-2 text-xl font-semibold xl:text-2xl ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}
