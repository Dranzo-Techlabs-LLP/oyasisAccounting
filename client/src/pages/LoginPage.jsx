import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { TicketsPlane } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Input } from "../components/FormPrimitives";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    email: "admin@oasisgoholidays.com",
    password: "Admin@123"
  });
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-[linear-gradient(140deg,#084f4f,#0d6e6e_45%,#158080)] px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
            <TicketsPlane className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-2xl font-semibold">OasisGo Holidays</p>
            <p className="text-sm text-white/75">Travel booking and accounts control room</p>
          </div>
        </div>
        <div className="max-w-xl">
          <h1 className="text-5xl font-semibold leading-tight">
            Keep every departure, invoice, and customer story in one calm place.
          </h1>
          <p className="mt-6 text-base text-white/80">
            Built for travel teams who need bookings, collections, package operations, and month-end visibility without spreadsheet drift.
          </p>
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-4">
          {[
            ["10+", "Seed bookings"],
            ["6", "Ops views"],
            ["INR", "Native billing"]
          ].map(([value, label]) => (
            <div key={label} className="rounded-md border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-sm text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="panel w-full max-w-md rounded-lg p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Admin Login
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Sign in to manage bookings, departures, and invoices.
          </p>

          <form
            className="mt-8 grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                setBusy(true);
                await login(form);
                toast.success("Logged in");
              } catch (error) {
                toast.error(error.response?.data?.message || "Unable to login");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Enter Dashboard"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
