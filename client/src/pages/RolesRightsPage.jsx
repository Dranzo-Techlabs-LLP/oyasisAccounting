import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Shield, Save, RotateCcw, Check } from "lucide-react";
import { api } from "../api/client";
import { Button } from "../components/FormPrimitives";
import { SkeletonBlock } from "../components/Feedback";

const ROLE_BLURB = {
  ADMIN: "Full access to every feature. Cannot be edited.",
  MANAGER: "Runs day-to-day operations across bookings, sales and accounting.",
  ACCOUNTANT: "Focused on invoices, payments and financial reports.",
  AGENT: "Creates and edits bookings, ticket sales and customers.",
  VIEWER: "Read-only access across the app."
};

export default function RolesRightsPage() {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [actionLabels, setActionLabels] = useState({});
  const [roles, setRoles] = useState([]);           // [{ role, editable, permissions }]
  const [activeRole, setActiveRole] = useState("MANAGER");
  const [draft, setDraft] = useState({});           // working copy of the active role's permissions
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles");
      setCatalog(res.data.catalog || []);
      setActionLabels(res.data.actionLabels || {});
      setRoles(res.data.roles || []);
      const firstEditable = (res.data.roles || []).find((r) => r.editable) || res.data.roles?.[0];
      const start = res.data.roles?.find((r) => r.role === activeRole) || firstEditable;
      if (start) {
        setActiveRole(start.role);
        setDraft(structuredClone(start.permissions || {}));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeRoleObj = roles.find((r) => r.role === activeRole);
  const isAdminRole = activeRole === "ADMIN";

  const selectRole = (role) => {
    const r = roles.find((x) => x.role === role);
    setActiveRole(role);
    setDraft(structuredClone(r?.permissions || {}));
  };

  const dirty = useMemo(() => {
    if (!activeRoleObj) return false;
    return JSON.stringify(draft) !== JSON.stringify(activeRoleObj.permissions);
  }, [draft, activeRoleObj]);

  const toggle = (moduleKey, action) => {
    if (isAdminRole) return;
    setDraft((c) => {
      const next = structuredClone(c);
      next[moduleKey] = next[moduleKey] || {};
      const turningOn = !next[moduleKey][action];
      next[moduleKey][action] = turningOn;
      // Write/Delete imply View.
      if (turningOn && (action === "write" || action === "delete")) {
        next[moduleKey].read = true;
      }
      // Turning off View turns off everything for that module.
      if (!turningOn && action === "read") {
        next[moduleKey] = {};
      }
      return next;
    });
  };

  const setGroup = (moduleKeys, on) => {
    if (isAdminRole) return;
    setDraft((c) => {
      const next = structuredClone(c);
      for (const g of catalog) {
        for (const m of g.modules) {
          if (!moduleKeys.includes(m.key)) continue;
          next[m.key] = {};
          if (on) for (const a of m.actions) next[m.key][a] = true;
        }
      }
      return next;
    });
  };

  const allModuleKeys = catalog.flatMap((g) => g.modules.map((m) => m.key));

  const save = async () => {
    try {
      setBusy(true);
      const res = await api.put(`/roles/${activeRole}`, { permissions: draft });
      setRoles((rs) => rs.map((r) => (r.role === activeRole ? { ...r, permissions: res.data.permissions } : r)));
      setDraft(structuredClone(res.data.permissions));
      toast.success(`${activeRole} rights saved`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const resetDefaults = async () => {
    if (!window.confirm(`Reset ${activeRole} to the default rights?`)) return;
    try {
      setBusy(true);
      const res = await api.post(`/roles/${activeRole}/reset`);
      setRoles((rs) => rs.map((r) => (r.role === activeRole ? { ...r, permissions: res.data.permissions } : r)));
      setDraft(structuredClone(res.data.permissions));
      toast.success(`${activeRole} reset to defaults`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Reset failed");
    } finally { setBusy(false); }
  };

  const grantedCount = (perms) =>
    Object.values(perms || {}).reduce((n, mod) => n + Object.values(mod || {}).filter(Boolean).length, 0);

  if (loading) return <SkeletonBlock className="h-[40rem]" />;

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Roles &amp; Rights</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Control which features each role can see and use. Users inherit the rights of their role.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Role list */}
        <div className="panel h-max rounded-lg p-2">
          {roles.map((r) => {
            const active = r.role === activeRole;
            const count = r.role === activeRole ? grantedCount(draft) : grantedCount(r.permissions);
            return (
              <button
                key={r.role}
                onClick={() => selectRole(r.role)}
                className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  active ? "bg-[var(--brand)] text-white" : "text-[var(--text)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <Shield className={`h-4 w-4 ${active ? "text-white" : "text-[var(--text-soft)]"}`} />
                <span className="flex-1 font-medium capitalize">{r.role.toLowerCase()}</span>
                {!r.editable && (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${active ? "bg-white/20" : "bg-[var(--surface-muted)] text-[var(--text-soft)]"}`}>system</span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20" : "bg-[var(--surface-muted)] text-[var(--text-soft)]"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Permission grid */}
        <div className="panel rounded-lg p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <h3 className="text-base font-semibold capitalize text-[var(--text)]">{activeRole.toLowerCase()}</h3>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">{ROLE_BLURB[activeRole] || ""}</p>
            </div>
            <div className="flex items-center gap-2">
              {!isAdminRole && (
                <Button variant="secondary" onClick={resetDefaults} disabled={busy}>
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              )}
              <Button onClick={save} disabled={busy || isAdminRole || !dirty}>
                <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save rights"}
              </Button>
            </div>
          </div>

          {isAdminRole ? (
            <div className="mt-6 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Check className="h-4 w-4" /> The Administrator role always has full access to every feature.
            </div>
          ) : (
            <div className="mt-4 grid gap-5">
              {catalog.map((group) => {
                const keys = group.modules.map((m) => m.key);
                const allOn = keys.every((k) => group.modules.find((m) => m.key === k).actions.every((a) => draft[k]?.[a]));
                return (
                  <section key={group.group}>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">{group.group}</p>
                      <div className="flex gap-2 text-[11px]">
                        <button type="button" onClick={() => setGroup(keys, true)} className="font-medium text-[var(--brand)] hover:underline">All</button>
                        <span className="text-[var(--line)]">|</span>
                        <button type="button" onClick={() => setGroup(keys, false)} className="font-medium text-[var(--text-soft)] hover:underline">None</button>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {group.modules.map((m) => (
                        <div key={m.key} className="rounded-md border border-[var(--line)] bg-white px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[var(--text)]">{m.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {m.actions.map((a) => {
                                const on = Boolean(draft[m.key]?.[a]);
                                return (
                                  <label
                                    key={a}
                                    className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                                      on
                                        ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--text)]"
                                        : "border-[var(--line)] text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"
                                    }`}
                                  >
                                    <input type="checkbox" checked={on} onChange={() => toggle(m.key, a)} className="h-3.5 w-3.5" />
                                    {actionLabels[a] || a}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--text-soft)]">
                <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setGroup(allModuleKeys, false)} className="font-medium text-[var(--text-soft)] hover:underline">Clear all</button>
                  <span className="text-[var(--line)]">|</span>
                  <button type="button" onClick={() => setGroup(allModuleKeys, true)} className="font-medium text-[var(--brand)] hover:underline">Grant all</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
