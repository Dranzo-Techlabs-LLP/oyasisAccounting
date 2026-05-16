import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff, Lock, Mail, TicketsPlane } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Button, Field, Input } from "../components/FormPrimitives";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    email: "admin@oasisgoholidays.com",
    password: "Admin@123"
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch branding for login screen (public-ish — no auth required for logo file, settings GET is auth-only)
    // Logo URL is the only useful public bit; fall back silently
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  const businessName = settings?.businessName || "OyasisGo Holidays";
  const logoSrc = settings?.logoUrl || "/oyasis-logo.png";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left brand panel (desktop) */}
      <section
        className="relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-14"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(240,136,38,0.22), transparent 40%), radial-gradient(circle at bottom left, rgba(169,212,233,0.14), transparent 38%), linear-gradient(140deg,#162a52,#1d3a6e_45%,#2a4f93)"
        }}
      >
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt={businessName} className="h-14 w-14 rounded-[12px] bg-white object-contain p-1.5 ring-1 ring-white/20" />
          <div>
            <p className="text-xl font-semibold">{businessName}</p>
            <p className="text-sm text-white/65">Travel booking and accounts control room</p>
          </div>
        </div>

        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Keep every departure, invoice, and customer story in one calm place.
          </h1>
          <p className="mt-5 text-sm text-white/75 sm:text-base">
            Built for travel teams who need bookings, collections, package operations, and month-end visibility without spreadsheet drift.
          </p>
        </div>

        <div className="grid max-w-xl grid-cols-3 gap-3">
          {[
            ["1-click", "Invoice PDF"],
            ["Live", "Calendar view"],
            ["Multi", "User roles"]
          ].map(([value, label]) => (
            <div key={label} className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-lg font-semibold">{value}</p>
              <p className="mt-1 text-xs text-white/65">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Right login card */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="panel w-full max-w-md rounded-[16px] p-7 sm:p-9">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logoSrc} alt={businessName} className="h-10 w-10 rounded-md object-contain" />
            <p className="font-semibold text-[var(--text)]">{businessName}</p>
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)] lg:mt-0">Sign in</p>
          <h2 className="mt-1.5 text-2xl font-semibold text-[var(--text)] sm:text-3xl">Welcome back</h2>
          <p className="mt-1.5 text-sm text-[var(--text-soft)]">
            Manage bookings, departures, and invoices.
          </p>

          <form
            className="mt-7 grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                setBusy(true);
                await login(form);
                toast.success("Welcome back");
              } catch (error) {
                toast.error(error.response?.data?.message || "Unable to login");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--text-faint)]" />
                <Input type="email" autoComplete="email" required className="pl-9"
                  value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--text-faint)]" />
                <Input type={showPw ? "text" : "password"} autoComplete="current-password" required className="pl-9 pr-10"
                  value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-2.5 flex h-6 w-7 items-center justify-center rounded-md text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" disabled={busy || !form.email || !form.password} size="lg">
              {busy ? "Signing in…" : "Enter Dashboard"}
            </Button>
            <p className="text-center text-[11px] text-[var(--text-faint)]">
              Secured by JWT · cookies set HttpOnly
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
