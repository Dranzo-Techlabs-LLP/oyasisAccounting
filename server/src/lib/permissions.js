import { prisma } from "./prisma.js";

// The full set of roles the app knows about. ADMIN is special-cased to always
// have every right, so it isn't editable in the Roles & Rights UI.
export const ROLES = ["ADMIN", "MANAGER", "ACCOUNTANT", "AGENT", "VIEWER"];

// Action → human label used by the Roles & Rights grid.
export const ACTION_LABELS = {
  read: "View",
  write: "Create / Edit",
  delete: "Delete"
};

// The permission catalog, grouped like the reference screenshot. Each module
// declares which actions apply to it (a view-only module only has "read").
// The frontend renders directly from this so there's a single source of truth.
export const PERMISSION_CATALOG = [
  {
    group: "Dashboard",
    modules: [
      { key: "dashboard", label: "View dashboard", actions: ["read"] }
    ]
  },
  {
    group: "Bookings",
    modules: [
      { key: "bookings", label: "Bookings", actions: ["read", "write", "delete"] },
      { key: "calendar", label: "Booking calendar", actions: ["read"] },
      { key: "overview", label: "Monthly overview", actions: ["read"] }
    ]
  },
  {
    group: "Ticket Sales",
    modules: [
      { key: "ticketSales", label: "Ticket sales", actions: ["read", "write", "delete"] }
    ]
  },
  {
    group: "Customers & Packages",
    modules: [
      { key: "customers", label: "Customers", actions: ["read", "write", "delete"] },
      { key: "packages", label: "Packages", actions: ["read", "write", "delete"] }
    ]
  },
  {
    group: "Accounting",
    modules: [
      { key: "accounts", label: "Accounts & revenue", actions: ["read", "write"] },
      { key: "invoices", label: "Invoices", actions: ["read", "write"] },
      { key: "ledger", label: "Income / Expense", actions: ["read", "write", "delete"] }
    ]
  },
  {
    group: "Vendors / B2B",
    modules: [
      { key: "vendors", label: "Vendors", actions: ["read", "write", "delete"] },
      { key: "vendorInvoices", label: "B2B invoices", actions: ["read", "write", "delete"] }
    ]
  },
  {
    group: "Administration",
    modules: [
      { key: "users", label: "Users", actions: ["read", "write", "delete"] },
      { key: "settings", label: "Settings", actions: ["read", "write"] },
      { key: "roles", label: "Roles & rights", actions: ["read", "write"] }
    ]
  }
];

// Flat list of every module + its allowed actions, derived from the catalog.
export const MODULES = PERMISSION_CATALOG.flatMap((g) => g.modules);

// Build an "everything on" permission object (used for ADMIN and as a helper).
export const fullPermissions = () => {
  const perms = {};
  for (const m of MODULES) {
    perms[m.key] = {};
    for (const a of m.actions) perms[m.key][a] = true;
  }
  return perms;
};

const grant = (spec) => {
  // spec: { moduleKey: ["read","write"] | "all" }
  const perms = {};
  for (const m of MODULES) {
    const wanted = spec[m.key];
    perms[m.key] = {};
    for (const a of m.actions) {
      perms[m.key][a] = wanted === "all" || (Array.isArray(wanted) && wanted.includes(a));
    }
  }
  return perms;
};

// Sensible starting rights for each non-admin role. Editable afterwards from
// the Roles & Rights page.
export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: fullPermissions(),
  MANAGER: grant({
    dashboard: "all", bookings: "all", calendar: "all", overview: "all",
    ticketSales: "all", customers: "all", packages: "all",
    accounts: "all", invoices: "all", ledger: "all",
    vendors: "all", vendorInvoices: "all",
    users: [], settings: [], roles: []
  }),
  ACCOUNTANT: grant({
    dashboard: "all", bookings: ["read"], calendar: ["read"], overview: ["read"],
    ticketSales: ["read"], customers: ["read"], packages: ["read"],
    accounts: "all", invoices: "all", ledger: "all",
    vendors: ["read"], vendorInvoices: ["read", "write"],
    users: [], settings: [], roles: []
  }),
  AGENT: grant({
    dashboard: "all", bookings: ["read", "write"], calendar: ["read"], overview: ["read"],
    ticketSales: ["read", "write"], customers: ["read", "write"], packages: ["read"],
    accounts: [], invoices: ["read"], ledger: [],
    vendors: [], vendorInvoices: [],
    users: [], settings: [], roles: []
  }),
  VIEWER: grant({
    dashboard: "all", bookings: ["read"], calendar: ["read"], overview: ["read"],
    ticketSales: ["read"], customers: ["read"], packages: ["read"],
    accounts: ["read"], invoices: ["read"], ledger: ["read"],
    vendors: ["read"], vendorInvoices: ["read"],
    users: [], settings: [], roles: []
  })
};

// ---- Runtime resolution with a small in-memory cache ----
let cache = null; // { role: permissionsObject }

export const invalidateRolePermissions = () => { cache = null; };

// Load every role's permission set from the DB, seeding defaults for any role
// that doesn't have a row yet. Cached until invalidated (on save).
export const loadAllRolePermissions = async () => {
  if (cache) return cache;
  const rows = await prisma.rolePermission.findMany();
  const byRole = Object.fromEntries(rows.map((r) => [r.role, r.permissions]));
  const result = {};
  for (const role of ROLES) {
    result[role] = role === "ADMIN"
      ? fullPermissions()
      : (byRole[role] || DEFAULT_ROLE_PERMISSIONS[role] || {});
  }
  cache = result;
  return result;
};

// Effective permissions for one role (ADMIN always full).
export const getRolePermissions = async (role) => {
  if (role === "ADMIN") return fullPermissions();
  const all = await loadAllRolePermissions();
  return all[role] || DEFAULT_ROLE_PERMISSIONS[role] || {};
};
