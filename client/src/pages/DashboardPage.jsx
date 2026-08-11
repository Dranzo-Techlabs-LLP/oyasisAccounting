import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

const colors = ["#0D6E6E", "#F5A623", "#0ea5a5", "#ef4444"];

const monthRange = (d) => ({ from: d.startOf("month").format("YYYY-MM-DD"), to: d.endOf("month").format("YYYY-MM-DD") });

// Preset windows the dashboard can report on. Each returns the filter state.
const PRESETS = {
  thisMonth: () => ({ key: "thisMonth", ...monthRange(dayjs()) }),
  lastMonth: () => ({ key: "lastMonth", ...monthRange(dayjs().subtract(1, "month")) }),
  thisYear:  () => ({ key: "thisYear", from: dayjs().startOf("year").format("YYYY-MM-DD"), to: dayjs().endOf("year").format("YYYY-MM-DD") }),
  all:       () => ({ key: "all", all: true })
};
const PRESET_LABELS = [["thisMonth", "This month"], ["lastMonth", "Last month"], ["thisYear", "This year"], ["all", "All time"]];

// A human label for the active window, shown across the dashboard headings.
const rangeLabel = (f) => {
  if (f.all) return "All time";
  const from = dayjs(f.from), to = dayjs(f.to);
  const isWholeMonth = f.from === from.startOf("month").format("YYYY-MM-DD")
    && f.to === from.endOf("month").format("YYYY-MM-DD");
  if (isWholeMonth) return from.format("MMMM YYYY");
  return `${from.format("DD MMM YYYY")} – ${to.format("DD MMM YYYY")}`;
};

function FilterBar({ filter, setFilter }) {
  const [from, setFrom] = useState(filter.from || "");
  const [to, setTo] = useState(filter.to || "");
  const applyCustom = () => {
    if (!from || !to) return;
    const [a, b] = from <= to ? [from, to] : [to, from];
    setFilter({ key: "custom", from: a, to: b });
  };
  return (
    <div className="panel rounded-lg p-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Quick range</p>
          <select
            value={PRESETS[filter.key] ? filter.key : ""}
            onChange={(e) => { if (e.target.value) setFilter(PRESETS[e.target.value]()); }}
            className="h-9 rounded-md border border-[var(--line)] bg-white px-2 text-sm">
            {!PRESETS[filter.key] && <option value="">Custom…</option>}
            {PRESET_LABELS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Pick a month</p>
          <input type="month" value={filter.key === "month" ? dayjs(filter.from).format("YYYY-MM") : ""}
            onChange={(e) => { if (e.target.value) setFilter({ key: "month", ...monthRange(dayjs(`${e.target.value}-01`)) }); }}
            className="h-9 rounded-md border border-[var(--line)] bg-white px-2 text-sm" />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Custom range</p>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-md border border-[var(--line)] bg-white px-2 text-sm" />
            <span className="text-[var(--text-soft)]">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-md border border-[var(--line)] bg-white px-2 text-sm" />
            <button type="button" onClick={applyCustom} disabled={!from || !to}
              className="h-9 rounded-md bg-[var(--brand)] px-3 text-sm font-medium text-white disabled:opacity-40">
              Apply
            </button>
          </div>
        </div>

        <div className="ml-auto self-center text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">Showing</p>
          <p className="text-sm font-semibold text-[var(--text)]">{rangeLabel(filter)}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(PRESETS.all());

  const query = useMemo(
    () => (filter.all ? "?all=1" : `?from=${filter.from}&to=${filter.to}`),
    [filter]
  );
  const label = rangeLabel(filter);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    api.get(`/dashboard/summary${query}`)
      .then((response) => { if (!ignore) setData(response.data); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [query]);

  if (loading) {
    return (
      <div className="grid gap-5">
        <FilterBar filter={filter} setFilter={setFilter} />
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
    return (
      <div className="grid gap-5">
        <FilterBar filter={filter} setFilter={setFilter} />
        <EmptyState title="Dashboard unavailable" message="The summary could not be loaded." />
      </div>
    );
  }

  const cards = [
    ["Bookings", data.kpis.bookingsThisMonth],
    ["Booking revenue", formatCurrency(data.kpis.revenueThisMonth)],
    ["Pending booking payments", formatCurrency(data.kpis.pendingPayments)],
    ["Departures in range", data.kpis.upcomingDepartures]
  ];
  const ticketCards = [
    ["Ticket sales", data.kpis.ticketSalesThisMonth ?? 0],
    ["Ticket revenue", formatCurrency(data.kpis.ticketRevenueThisMonth ?? 0)],
    ["Ticket margin", formatCurrency(data.kpis.ticketMargin ?? 0)],
    ["Ticket customer balance", formatCurrency(data.kpis.ticketPending ?? 0)]
  ];

  return (
    <div className="grid gap-5">
      <FilterBar filter={filter} setFilter={setFilter} />

      {/* P&L snapshot */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">P&L Snapshot · {label}</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Total Income</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-700 xl:text-3xl">{formatCurrency(data.kpis.incomeThisMonth ?? 0)}</p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">Bookings + Ticket Sales + Manual</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Total Expense</p>
            <p className="mt-3 text-2xl font-semibold text-rose-600 xl:text-3xl">{formatCurrency(data.kpis.expenseThisMonth ?? 0)}</p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">Manual entries · payouts auto-mirror</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Net</p>
            <p className={`mt-3 text-2xl font-semibold xl:text-3xl ${(data.kpis.netThisMonth ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatCurrency(data.kpis.netThisMonth ?? 0)}
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">Income − Expense</p>
          </div>
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">B2B Outstanding</p>
            <p className="mt-3 text-2xl font-semibold text-amber-700 xl:text-3xl">{formatCurrency(data.kpis.vendorOutstanding ?? 0)}</p>
            <p className="mt-1 text-[10px] text-[var(--text-faint)]">Across DRAFT / SENT / OVERDUE</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Combined (Bookings + Ticket Sales)</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="panel rounded-lg p-5">
            <p className="text-sm text-[var(--text-soft)]">Total revenue</p>
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
            <h3 className="text-base font-semibold text-[var(--text)]">Revenue by Month</h3>
            <span className="text-xs text-[var(--text-soft)]">{label}</span>
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
