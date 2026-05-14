import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Download } from "lucide-react";
import { api } from "../api/client";
import { Button, Select } from "../components/FormPrimitives";
import { EmptyState, SkeletonBlock } from "../components/Feedback";
import { downloadBlob, formatCurrency, formatDate } from "../utils/formatters";
import StatusBadge from "../components/StatusBadge";

export default function AccountsPage() {
  const today = dayjs();
  const [month, setMonth] = useState(String(today.month() + 1));
  const [year, setYear] = useState(String(today.year()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (nextMonth = month, nextYear = year) => {
    setLoading(true);
    const response = await api.get("/accounts/summary", {
      params: { month: nextMonth, year: nextYear }
    });
    setData(response.data);
    setLoading(false);
  };

  useEffect(() => {
    load(month, year);
  }, []);

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-36">
            {Array.from({ length: 12 }).map((_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                {dayjs().month(index).format("MMMM")}
              </option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-32">
            {["2025", "2026", "2027"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => load(month, year)}>
            Apply
          </Button>
          <Button
            onClick={async () => {
              const response = await api.get("/accounts/export", {
                params: { month, year },
                responseType: "blob"
              });
              downloadBlob(response.data, `accounts-${year}-${month}.csv`);
            }}
          >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-[24rem]" />
      ) : !data ? (
        <EmptyState title="Accounts unavailable" message="The monthly accounting summary could not be loaded." />
      ) : (
        <>
          {/* Combined totals */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Combined</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Total revenue" value={formatCurrency((data.summary.totalRevenue ?? data.summary.totalInvoiced))} accent="brand" />
              <Kpi label="Total collected" value={formatCurrency((data.summary.totalCollectedAll ?? data.summary.totalCollected))} accent="emerald" />
              <Kpi label="Customer outstanding" value={formatCurrency((data.summary.totalOutstandingAll ?? data.summary.totalOutstanding))} accent="red" />
              <Kpi label="Supplier pending" value={formatCurrency(data.summary.supplierPending ?? 0)} accent="amber" />
            </div>
          </div>

          {/* Bookings summary */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Package Bookings (this month)</p>
            <div className="grid gap-4 xl:grid-cols-3">
              <Kpi label="Invoiced" value={formatCurrency(data.bookingSummary?.totalInvoiced ?? data.summary.totalInvoiced)} />
              <Kpi label="Collected" value={formatCurrency(data.bookingSummary?.totalCollected ?? data.summary.totalCollected)} />
              <Kpi label="Outstanding" value={formatCurrency(data.bookingSummary?.totalOutstanding ?? data.summary.totalOutstanding)} />
            </div>
          </div>

          {/* Ticket sales summary */}
          {data.ticketSummary && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">Ticket Sales (this month)</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Kpi label="Sales" value={formatCurrency(data.ticketSummary.totalSales)} accent="brand" />
                <Kpi label="Collected" value={formatCurrency(data.ticketSummary.totalCollected)} accent="emerald" />
                <Kpi label="Outstanding" value={formatCurrency(data.ticketSummary.totalOutstanding)} accent="red" />
                <Kpi label="Margin" value={formatCurrency(data.ticketSummary.totalMargin)} accent={(data.ticketSummary.totalMargin || 0) >= 0 ? "emerald" : "red"} />
                <Kpi label="Supplier pending" value={formatCurrency(data.ticketSummary.supplierPending)} accent="amber" />
              </div>
            </div>
          )}

          <div className="panel rounded-lg p-5">
            <h3 className="text-base font-semibold text-[var(--text)]">Invoices</h3>
            {data.invoices.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No invoices in this month" message="Generated invoices for the selected month will appear here." />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[var(--text-soft)]">
                    <tr>
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Issued</th>
                      <th className="pb-3 font-medium">Amounts</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-[var(--line)]">
                        <td className="py-3">
                          <p className="font-medium text-[var(--text)]">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-[var(--text-soft)]">{invoice.bookingCode}</p>
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-[var(--text)]">{invoice.customerName}</p>
                          <p className="text-xs text-[var(--text-soft)]">{invoice.packageName}</p>
                        </td>
                        <td className="py-3">{formatDate(invoice.issuedDate)}</td>
                        <td className="py-3">
                          <p>{formatCurrency(invoice.totalAmount)}</p>
                          <p className="text-xs text-[var(--text-soft)]">
                            Collected {formatCurrency(invoice.collectedAmount)} | Due {formatCurrency(invoice.outstandingAmount)}
                          </p>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <StatusBadge value={invoice.paymentStatus} />
                            {invoice.sentStatus ? <StatusBadge value="ACTIVE" /> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ticket sales table */}
          {data.ticketSales && data.ticketSales.length > 0 && (
            <div className="panel rounded-lg p-5">
              <h3 className="text-base font-semibold text-[var(--text)]">Ticket Sales</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[var(--text-soft)]">
                    <tr>
                      <th className="pb-3 font-medium">Sale</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Amounts</th>
                      <th className="pb-3 font-medium">Margin</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ticketSales.map((s) => (
                      <tr key={s.id} className="border-t border-[var(--line)]">
                        <td className="py-3">
                          <p className="font-medium text-[var(--text)]">{s.vendor || "—"}</p>
                          <p className="text-xs text-[var(--text-soft)]">{s.saleCode} · {s.reference || "no PNR"}</p>
                        </td>
                        <td className="py-3">{s.customerName}</td>
                        <td className="py-3">
                          <p>{s.route}</p>
                          <p className="text-xs text-[var(--text-soft)]">{formatDate(s.createdAt)}</p>
                        </td>
                        <td className="py-3">
                          <p>{formatCurrency(s.totalAmount)}</p>
                          <p className="text-xs text-[var(--text-soft)]">
                            Collected {formatCurrency(s.collectedAmount)} | Due {formatCurrency(s.outstandingAmount)}
                          </p>
                        </td>
                        <td className="py-3">
                          <p className={Number(s.margin) >= 0 ? "text-emerald-700" : "text-red-600"}>{formatCurrency(s.margin)}</p>
                          <p className={`text-xs ${s.supplierPaid ? "text-emerald-700" : "text-amber-700"}`}>Supplier {s.supplierPaid ? "paid" : "unpaid"}</p>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            <StatusBadge value={s.status} />
                            <StatusBadge value={s.paymentStatus} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }) {
  const map = { brand: "text-[var(--brand)]", emerald: "text-emerald-700", red: "text-red-600", amber: "text-amber-700" };
  return (
    <div className="panel rounded-lg p-5">
      <p className="text-sm text-[var(--text-soft)]">{label}</p>
      <p className={`mt-3 text-2xl font-semibold xl:text-3xl ${map[accent] || "text-[var(--text)]"}`}>{value}</p>
    </div>
  );
}
