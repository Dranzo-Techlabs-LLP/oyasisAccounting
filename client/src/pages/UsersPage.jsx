import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Trash2, Shield } from "lucide-react";
import { api } from "../api/client";
import { Button, Field, Input, Select } from "../components/FormPrimitives";
import Modal from "../components/Modal";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { SkeletonBlock } from "../components/Feedback";
import { formatDate } from "../utils/formatters";

const ROLES = [
  ["ADMIN",      "Full access to everything incl Settings + Users"],
  ["MANAGER",    "All bookings/sales/customers/accounts; no Settings/Users"],
  ["ACCOUNTANT", "Accounts + read-only bookings/sales"],
  ["AGENT",      "Create/edit bookings + customers; no delete; no accounts"],
  ["VIEWER",     "Read-only across everything"]
];

const MODULES = ["bookings", "ticketSales", "customers", "packages", "invoices", "accounts"];
const ACTIONS = ["read", "write", "delete"];

const MENU_ITEMS = [
  ["dashboard",   "Dashboard"],
  ["packages",    "Packages"],
  ["customers",   "Customers"],
  ["bookings",    "Bookings"],
  ["ticketSales", "Ticket Sales"],
  ["calendar",    "Calendar"],
  ["overview",    "Overview"],
  ["accounts",    "Accounts"]
];
const allMenu = (visible) => Object.fromEntries(MENU_ITEMS.map(([k]) => [k, visible]));

const PRESET_PERMISSIONS = {
  ADMIN: {
    ...Object.fromEntries(MODULES.map((m) => [m, { read: true, write: true, delete: true }])),
    menu: allMenu(true)
  },
  MANAGER: {
    ...Object.fromEntries(MODULES.map((m) => [m, { read: true, write: true, delete: m !== "packages" }])),
    menu: allMenu(true)
  },
  ACCOUNTANT: {
    bookings: { read: true }, ticketSales: { read: true }, customers: { read: true },
    packages: { read: true }, invoices: { read: true, write: true }, accounts: { read: true, write: true },
    menu: { dashboard: true, packages: true, customers: true, bookings: true, ticketSales: true, calendar: false, overview: false, accounts: true }
  },
  AGENT: {
    bookings: { read: true, write: true }, ticketSales: { read: true, write: true },
    customers: { read: true, write: true }, packages: { read: true }, invoices: { read: true }, accounts: {},
    menu: { dashboard: true, packages: true, customers: true, bookings: true, ticketSales: true, calendar: true, overview: true, accounts: false }
  },
  VIEWER: {
    ...Object.fromEntries(MODULES.map((m) => [m, { read: true }])),
    menu: { dashboard: true, packages: true, customers: true, bookings: true, ticketSales: true, calendar: true, overview: true, accounts: false }
  }
};

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setItems(res.data.items);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load users");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      key: "fullName", label: "Name",
      accessor: (r) => r.fullName || r.email,
      filterType: "text",
      render: (r) => (
        <div>
          <p className="font-medium text-[var(--text)]">{r.fullName || "—"}</p>
          <p className="text-xs text-[var(--text-soft)]">{r.email}</p>
        </div>
      )
    },
    {
      key: "role", label: "Role",
      accessor: (r) => r.role,
      filterType: "select",
      filterOptions: ROLES.map(([v]) => ({ value: v, label: v })),
      render: (r) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          <Shield className="h-3 w-3" /> {r.role}
        </span>
      )
    },
    { key: "phone", label: "Phone", accessor: (r) => r.phone || "—", filterType: "text" },
    {
      key: "isActive", label: "Status",
      accessor: (r) => r.isActive ? "Active" : "Inactive",
      filterType: "select",
      filterOptions: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }],
      render: (r) => <StatusBadge value={r.isActive ? "ACTIVE" : "INACTIVE"} />
    },
    {
      key: "lastLoginAt", label: "Last Login",
      accessor: (r) => r.lastLoginAt ? new Date(r.lastLoginAt) : null,
      render: (r) => r.lastLoginAt ? formatDate(r.lastLoginAt) : "Never"
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <Button variant="secondary" className="w-10 px-0" onClick={() => { setEditing(r); setOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" className="w-10 px-0" onClick={async () => {
            if (!window.confirm(`Delete user ${r.email}?`)) return;
            try { await api.delete(`/users/${r.id}`); toast.success("Deleted"); load(); }
            catch (e) { toast.error(e.response?.data?.message || "Delete failed"); }
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="panel rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">Users & Roles</h2>
            <p className="mt-0.5 text-xs text-[var(--text-soft)]">Manage team accounts and module-level permissions.</p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonBlock className="h-80" />
      ) : (
        <div className="panel rounded-lg p-4">
          <DataTable
            rows={items}
            columns={columns}
            initialSort={{ key: "fullName", dir: "asc" }}
            searchKeys={["email", "fullName", "phone"]}
            emptyMessage="No users yet."
          />
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit User" : "Add User"} width="max-w-3xl">
        <UserForm
          initialValues={editing}
          busy={busy}
          onSubmit={async (payload) => {
            try {
              setBusy(true);
              if (editing) {
                await api.put(`/users/${editing.id}`, payload);
                toast.success("User updated");
              } else {
                await api.post("/users", payload);
                toast.success("User created");
              }
              setOpen(false); setEditing(null); load();
            } catch (e) {
              toast.error(e.response?.data?.message || "Save failed");
            } finally { setBusy(false); }
          }}
        />
      </Modal>
    </div>
  );
}

function UserForm({ initialValues, onSubmit, busy }) {
  const isEdit = Boolean(initialValues?.id);
  const [form, setForm] = useState({
    email: "", password: "", fullName: "", phone: "",
    role: "AGENT", isActive: true,
    permissions: PRESET_PERMISSIONS.AGENT
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        email: initialValues.email || "",
        password: "",
        fullName: initialValues.fullName || "",
        phone: initialValues.phone || "",
        role: initialValues.role || "AGENT",
        isActive: initialValues.isActive ?? true,
        permissions: initialValues.permissions || PRESET_PERMISSIONS[initialValues.role] || {}
      });
    } else {
      setForm({
        email: "", password: "", fullName: "", phone: "",
        role: "AGENT", isActive: true,
        permissions: PRESET_PERMISSIONS.AGENT
      });
    }
  }, [initialValues]);

  const togglePerm = (mod, action) => {
    setForm((c) => {
      const cur = c.permissions?.[mod] || {};
      const next = { ...c.permissions, [mod]: { ...cur, [action]: !cur[action] } };
      return { ...c, permissions: next };
    });
  };

  const toggleMenu = (key) => {
    setForm((c) => {
      const cur = c.permissions?.menu || {};
      return { ...c, permissions: { ...c.permissions, menu: { ...cur, [key]: !cur[key] } } };
    });
  };

  const setAllMenu = (visible) => {
    setForm((c) => ({ ...c, permissions: { ...c.permissions, menu: allMenu(visible) } }));
  };

  const applyPreset = (role) => {
    setForm((c) => ({ ...c, role, permissions: PRESET_PERMISSIONS[role] || {} }));
  };

  return (
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      const payload = {
        email: form.email,
        fullName: form.fullName || null,
        phone: form.phone || null,
        role: form.role,
        isActive: form.isActive,
        permissions: form.permissions
      };
      if (form.password) payload.password = form.password;
      onSubmit(payload);
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
        <Field label="Email *"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={isEdit ? "New Password (leave blank to keep current)" : "Password *"}>
          <Input type="password" required={!isEdit} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => applyPreset(e.target.value)}>
            {ROLES.map(([v]) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.isActive ? "true" : "false"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </Select>
        </Field>
      </div>

      {/* Permissions are now managed per role in Roles & Rights. */}
      <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm font-semibold text-[var(--text)]">Permissions</p>
        <p className="mt-1 text-xs text-[var(--text-soft)]">
          This user inherits the rights of the <span className="font-semibold capitalize">{form.role.toLowerCase()}</span> role.
          To change what this role can see and do, open <a href="/roles" className="font-medium text-[var(--brand)] underline-offset-2 hover:underline">Roles &amp; Rights</a>.
          The Administrator role always has full access.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !form.email}>{busy ? "Saving..." : isEdit ? "Save User" : "Create User"}</Button>
      </div>
    </form>
  );
}
