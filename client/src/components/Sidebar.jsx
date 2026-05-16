import {
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Package2,
  Plane,
  ReceiptText,
  Settings,
  Shield,
  TicketsPlane,
  UsersRound,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ITEMS = [
  { key: "dashboard",   to: "/",             icon: LayoutDashboard, label: "Dashboard" },
  { key: "packages",    to: "/packages",     icon: Package2,        label: "Packages" },
  { key: "customers",   to: "/customers",    icon: Users,           label: "Customers" },
  { key: "bookings",    to: "/bookings",     icon: TicketsPlane,    label: "Bookings" },
  { key: "ticketSales", to: "/ticket-sales", icon: Plane,           label: "Ticket Sales" },
  { key: "calendar",    to: "/calendar",     icon: CalendarRange,   label: "Calendar" },
  { key: "overview",    to: "/overview",     icon: ClipboardList,   label: "Overview" },
  { key: "accounts",    to: "/accounts",     icon: ReceiptText,     label: "Accounts" }
];

const ADMIN_ITEMS = [
  { key: "users",    to: "/users",    icon: UsersRound, label: "Users" },
  { key: "settings", to: "/settings", icon: Settings,   label: "Settings" }
];

const canSeeMenu = (user, key) => {
  if (user?.role === "ADMIN") return true;
  const map = user?.permissions?.menu;
  // If no menu map saved yet, default ALLOW (back-compat).
  if (!map || typeof map !== "object") return true;
  return map[key] !== false;
};

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const visibleItems = ITEMS.filter((i) => canSeeMenu(user, i.key));
  const visibleAdminItems = isAdmin ? ADMIN_ITEMS : [];
  const initials = (user?.fullName || user?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 text-white shadow-[0_28px_80px_rgba(22,42,82,0.32)] transition-transform duration-200 lg:static lg:min-h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background:
            "radial-gradient(circle at top right, rgba(240,136,38,0.20), transparent 38%), radial-gradient(circle at bottom left, rgba(169,212,233,0.10), transparent 40%), linear-gradient(180deg, #1d3a6e 0%, #162a52 100%)"
        }}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[12px] bg-white p-1 ring-1 ring-white/20">
            <img src="/oyasis-logo.png" alt="OyasisGo Holidays" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">OyasisGo Holidays</p>
            <p className="truncate text-[11px] text-white/60">Travel operations</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleItems.length > 0 && (
            <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Workspace</p>
          )}
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-[rgba(245,166,35,0.32)]"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-[var(--accent)]" : "text-white/60 group-hover:text-white"}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                </>
              )}
            </NavLink>
          ))}

          {visibleAdminItems.length > 0 && (
            <>
              <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Admin</p>
              {visibleAdminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/12 text-white ring-1 ring-[rgba(245,166,35,0.32)]"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-[var(--accent)]" : "text-white/60 group-hover:text-white"}`} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User card */}
        {user && (
          <div className="border-t border-white/10 px-3 py-3">
            <div className="flex items-center gap-3 rounded-[10px] bg-white/5 px-2.5 py-2 ring-1 ring-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[#3b1f00]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.fullName || user.email}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-white/60">
                  <Shield className="h-3 w-3" /> {user.role}
                </p>
              </div>
              {logout && (
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
