import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, Plane, TicketsPlane } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import { SkeletonBlock } from "../components/Feedback";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency, formatDate } from "../utils/formatters";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BOOKING_COLOR = "bg-emerald-100 text-emerald-800 ring-emerald-300";
const TICKET_COLOR  = "bg-sky-100 text-sky-800 ring-sky-300";

// ---------------------------------------------------------------------------
// Calendar event colours by "Booked By".
//
// To add a new team member + colour in the future, add ONE entry here keyed
// by the exact "Booked By" value. Each entry has:
//   chip   - the pill classes for the event (light bg + dark text = readable)
//   border - the left/outline border on the day-detail card
//   dot    - the little status dot shown before the name
// Any Tailwind colour family works (e.g. teal/pink/indigo) — just follow the
// 100 / 800 / 300 / 500 shade pattern below.
// ---------------------------------------------------------------------------
const BOOKED_BY_COLORS = {
  "Shameer":      { chip: "bg-emerald-100 text-emerald-800 ring-emerald-300", border: "border-emerald-300", dot: "bg-emerald-500" },
  "Abhijith":     { chip: "bg-blue-100 text-blue-800 ring-blue-300",          border: "border-blue-300",    dot: "bg-blue-500" },
  "Sahla":        { chip: "bg-red-100 text-red-800 ring-red-300",             border: "border-red-300",     dot: "bg-red-500" },
  "Adithya":      { chip: "bg-purple-100 text-purple-800 ring-purple-300",    border: "border-purple-300",  dot: "bg-purple-500" },
  "Shahana":      { chip: "bg-orange-100 text-orange-800 ring-orange-300",    border: "border-orange-300",  dot: "bg-orange-500" },
  "B2B Partners": { chip: "bg-yellow-100 text-yellow-800 ring-yellow-300",    border: "border-yellow-300",  dot: "bg-yellow-500" }
};

// Fallback for bookings with no "Booked By" (older records) — original green.
const DEFAULT_BOOKING_COLORS = { chip: BOOKING_COLOR, border: "border-emerald-300", dot: "bg-emerald-500" };
const TICKET_COLORS = { chip: TICKET_COLOR, border: "border-sky-300", dot: "bg-sky-500" };

// Resolve the colour set for any calendar event. Ticket sales keep their blue;
// bookings are coloured by Booked By (B2B Partners is always yellow, whatever
// partner name was typed).
const eventColors = (ev) => {
  if (ev.kind !== "booking") return TICKET_COLORS;
  return BOOKED_BY_COLORS[ev.bookedBy] || DEFAULT_BOOKING_COLORS;
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState({ bookings: true, ticketSales: true });
  const [dayDetail, setDayDetail] = useState(null);

  const load = async (m = month) => {
    setLoading(true);
    try {
      const res = await api.get("/calendar", { params: { month: m } });
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load calendar");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(month); }, [month]);

  const cells = useMemo(() => {
    const start = dayjs(`${month}-01`).startOf("month");
    const end = start.endOf("month");
    const gridStart = start.subtract(start.day(), "day"); // Sun
    const gridEnd = end.add(6 - end.day(), "day");
    const days = [];
    let cur = gridStart;
    while (cur.isBefore(gridEnd) || cur.isSame(gridEnd, "day")) {
      days.push(cur);
      cur = cur.add(1, "day");
    }
    return { start, end, days };
  }, [month]);

  // Map events by date key
  const eventsByDay = useMemo(() => {
    const map = {};
    const push = (key, ev) => {
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    };
    if (data && show.bookings) {
      for (const b of data.bookings || []) {
        if (!b.departureDate) continue;
        push(dayjs(b.departureDate).format("YYYY-MM-DD"), { ...b });
      }
    }
    if (data && show.ticketSales) {
      for (const s of data.ticketSales || []) {
        if (!s.departureDate) continue;
        push(dayjs(s.departureDate).format("YYYY-MM-DD"), { ...s });
      }
    }
    return map;
  }, [data, show]);

  const goPrev = () => setMonth(dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM"));
  const goNext = () => setMonth(dayjs(`${month}-01`).add(1, "month").format("YYYY-MM"));
  const goToday = () => setMonth(dayjs().format("YYYY-MM"));

  const monthLabel = dayjs(`${month}-01`).format("MMMM YYYY");
  const totalEvents = (data?.bookings?.length || 0) + (data?.ticketSales?.length || 0);

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Calendar</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Bookings (green) + Ticket Sales (blue) by departure date.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={goPrev} className="rounded-md border border-[var(--line)] p-2 hover:bg-[var(--surface-muted)]" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="min-w-[140px] text-center text-sm font-semibold text-[var(--text)]">{monthLabel}</p>
            <button onClick={goNext} className="rounded-md border border-[var(--line)] p-2 hover:bg-[var(--surface-muted)]" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
            <Button variant="secondary" onClick={goToday}>Today</Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={show.bookings} onChange={(e) => setShow({ ...show, bookings: e.target.checked })} />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ${BOOKING_COLOR}`}>
              <TicketsPlane className="h-3 w-3" /> Bookings <span className="font-semibold">({data?.bookings?.length ?? 0})</span>
            </span>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={show.ticketSales} onChange={(e) => setShow({ ...show, ticketSales: e.target.checked })} />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ${TICKET_COLOR}`}>
              <Plane className="h-3 w-3" /> Ticket sales <span className="font-semibold">({data?.ticketSales?.length ?? 0})</span>
            </span>
          </label>
          <span className="text-[var(--text-soft)]">{totalEvents} total events</span>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-[40rem]" />
      ) : (
        <div className="panel overflow-hidden rounded-lg">
          {/* Header row */}
          <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[var(--surface-muted)] text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-soft)]">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          {/* Day grid */}
          <div className="grid grid-cols-7 bg-white">
            {cells.days.map((d) => {
              const key = d.format("YYYY-MM-DD");
              const events = eventsByDay[key] || [];
              const inMonth = d.month() === cells.start.month();
              const isToday = d.isSame(dayjs(), "day");
              return (
                <button
                  key={key}
                  onClick={() => events.length > 0 && setDayDetail({ date: key, events })}
                  className={`min-h-[110px] border-b border-r border-[var(--line)] p-1.5 text-left align-top ${inMonth ? "" : "bg-slate-50/60 text-[var(--text-soft)]"} ${events.length > 0 ? "cursor-pointer hover:bg-[var(--surface-muted)]" : "cursor-default"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-[var(--brand)] font-bold text-white" : "text-[var(--text)]"}`}>
                      {d.date()}
                    </span>
                    {events.length > 0 && (
                      <span className="text-[10px] font-medium text-[var(--text-soft)]">{events.length}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map((ev) => {
                      const colors = eventColors(ev);
                      return (
                        <div key={`${ev.kind}-${ev.id}`}
                          className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${colors.chip}`}
                          title={`${ev.code} · ${ev.customer || ""} · ${ev.title || ""}${ev.kind === "booking" && ev.bookedBy ? ` · Booked by ${ev.bookedBy === "B2B Partners" && ev.bookedByPartner ? `B2B Partners (${ev.bookedByPartner})` : ev.bookedBy}` : ""}`}
                        >
                          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                          <span className="truncate">{ev.customer || ev.title}</span>
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <div className="text-[10px] font-medium text-[var(--text-soft)]">+ {events.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!dayDetail} onClose={() => setDayDetail(null)} title={dayDetail ? dayjs(dayDetail.date).format("dddd, DD MMM YYYY") : ""} width="max-w-2xl">
        {dayDetail && (
          <div className="space-y-2">
            {dayDetail.events.map((ev) => {
              const colors = eventColors(ev);
              return (
              <button
                key={`${ev.kind}-${ev.id}`}
                onClick={() => {
                  setDayDetail(null);
                  if (ev.kind === "booking") navigate(`/bookings/${ev.id}`);
                  else navigate(`/ticket-sales`);
                }}
                className={`block w-full rounded-md border p-3 text-left transition hover:bg-[var(--surface-muted)] ${colors.border}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${colors.chip}`}>
                        {ev.kind === "booking" ? "Booking" : "Ticket Sale"}
                      </span>
                      <span className="text-sm font-semibold text-[var(--text)]">{ev.code}</span>
                      {ev.kind === "booking" && ev.bookedBy && (
                        <span className="text-[10px] font-medium text-[var(--text-soft)]">
                          · {ev.bookedBy === "B2B Partners" && ev.bookedByPartner ? `B2B Partners (${ev.bookedByPartner})` : ev.bookedBy}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text)]">{ev.title}</p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {ev.customer}
                      {ev.destination && ` · ${ev.destination}`}
                      {ev.from && ` · ${ev.from} → ${ev.to}`}
                      {" · "}
                      {ev.pax} pax
                    </p>
                    {ev.endDate && (
                      <p className="text-xs text-[var(--text-soft)]">Ends {formatDate(ev.endDate)}</p>
                    )}
                    {ev.returnDate && (
                      <p className="text-xs text-[var(--text-soft)]">Return {formatDate(ev.returnDate)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text)]">{formatCurrency(ev.amount)}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      <StatusBadge value={ev.bookingStatus || ev.status} />
                      <StatusBadge value={ev.paymentStatus} />
                    </div>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
