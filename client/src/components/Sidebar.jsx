import {
  CalendarDays,
  LayoutDashboard,
  PanelLeftClose,
  Package2,
  Plane,
  ReceiptText,
  TicketsPlane,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/packages", icon: Package2, label: "Packages" },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/bookings", icon: TicketsPlane, label: "Bookings" },
  { to: "/ticket-sales", icon: Plane, label: "Ticket Sales" },
  { to: "/overview", icon: CalendarDays, label: "Overview" },
  { to: "/accounts", icon: ReceiptText, label: "Accounts" }
];

export default function Sidebar({ mobileOpen = false, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm transition lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-white/10 bg-[linear-gradient(180deg,#0c5f5f_0%,#084747_100%)] text-white shadow-[0_28px_80px_rgba(8,79,79,0.32)] transition-transform lg:static lg:min-h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="border-b border-white/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[rgba(245,166,35,0.18)]">
            <TicketsPlane className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-lg font-semibold">OasisGo Holidays</p>
            <p className="text-xs text-white/65">Travel operations cockpit</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[rgba(245,166,35,0.18)] text-white ring-1 ring-[rgba(245,166,35,0.28)]"
                  : "text-white/75 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      </aside>
    </>
  );
}
