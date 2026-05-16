import { LogOut, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/FormPrimitives";

const pageTitles = {
  "/": ["Dashboard", "Today's snapshot across bookings, ticket sales, and accounts."],
  "/packages": ["Travel Packages", "Holiday packages you sell to customers."],
  "/customers": ["Customers", "All travellers and contact records."],
  "/bookings": ["Bookings", "Package bookings, installments, and travellers."],
  "/ticket-sales": ["Ticket Sales", "Standalone flight, train, car, and boat sales."],
  "/calendar": ["Calendar", "All departures at a glance."],
  "/overview": ["Bookings Overview", "Monthly view by departure date."],
  "/accounts": ["Accounts", "Invoices, collections, margins, and supplier payouts."],
  "/vendors": ["Vendors & B2B", "Agents, corporate clients, hotels and suppliers."],
  "/b2b-invoices": ["B2B Invoices", "Custom invoices with line items for B2B partners."],
  "/ledger": ["Income & Expense", "Manual entries + auto entries from bookings, sales, payouts."],
  "/settings": ["Settings", "Business details, branding, document series, and bank info."],
  "/users": ["Users & Roles", "Team accounts and permissions."]
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const initials = (user?.fullName || user?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  let key = pathname;
  if (pathname.startsWith("/bookings/") && pathname !== "/bookings") key = "/bookings";
  if (pathname.startsWith("/customers/") && pathname !== "/customers") key = "/customers";
  const [title, subtitle] = pageTitles[key] || ["Detail", ""];

  return (
    <div className="app-shell flex bg-transparent">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(247,251,251,0.84)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white ring-1 ring-[var(--line)] transition hover:bg-[var(--surface-muted)] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4 text-[var(--brand)]" />
            </button>

            <img src="/oyasis-logo.png" alt="OyasisGo Holidays" className="hidden h-10 w-10 shrink-0 rounded-md object-contain sm:block" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                OyasisGo Holidays
              </p>
              <h1 className="truncate text-lg font-semibold text-[var(--text)] sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-center gap-3 rounded-[10px] bg-white px-3 py-1.5 ring-1 ring-[var(--line)] md:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-bold text-white">
                  {initials}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold leading-tight text-[var(--text)]">{user?.fullName || user?.email}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-soft)]">{user?.role}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={logout} className="!h-10 !w-10 !px-0" title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="fade-in px-4 py-5 sm:px-6 lg:px-8">
          {subtitle && (
            <div className="mb-5 hidden sm:block">
              <p className="text-sm text-[var(--text-soft)]">{subtitle}</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
