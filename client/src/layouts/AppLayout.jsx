import { LogOut, Menu, TicketsPlane } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/FormPrimitives";

const pageTitles = {
  "/": "Dashboard",
  "/packages": "Travel Packages",
  "/customers": "Customers",
  "/bookings": "Bookings",
  "/overview": "Bookings Overview",
  "/accounts": "Accounts"
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell flex bg-transparent">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(247,251,251,0.86)] backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-white ring-1 ring-[var(--line)] lg:hidden"
              >
                <Menu className="h-4 w-4 text-[var(--brand)]" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  OasisGo Holidays
                </p>
                <h1 className="text-xl font-semibold text-[var(--text)]">
                  {pageTitles[pathname] || "Booking Details"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-md bg-white px-4 py-2 ring-1 ring-[var(--line)] sm:block">
                <p className="text-xs text-[var(--text-soft)]">Admin</p>
                <p className="text-sm font-semibold text-[var(--text)]">{user?.email}</p>
              </div>
              <Button variant="secondary" onClick={logout} className="w-11 px-0" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <div className="mb-6 rounded-lg bg-[linear-gradient(135deg,rgba(13,110,110,0.94),rgba(8,79,79,0.98))] px-6 py-6 text-white shadow-[0_24px_60px_rgba(13,110,110,0.18)]">
            <div className="flex items-center gap-3 text-[var(--accent)]">
              <TicketsPlane className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                Travel & Tourism Booking and Accounting
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-white/80">
              Keep departures, collections, invoices, and customer records aligned in one place.
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
