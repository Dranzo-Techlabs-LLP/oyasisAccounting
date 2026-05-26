// Headless E2E smoke test for the demo (mock) API layer.
// Exercises every endpoint the UI calls. Reports bugs.
// Run: node client/smoke-test.mjs

import { fileURLToPath } from "node:url";
import path from "node:path";

// ---- Browser polyfills ----
const memStore = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: (k, v) => memStore.set(k, String(v)),
    removeItem: (k) => memStore.delete(k),
    clear: () => memStore.clear()
  }
};
class FakeFormData {
  constructor() { this._d = new Map(); }
  append(k, v) {
    if (!this._d.has(k)) this._d.set(k, []);
    this._d.get(k).push(v);
  }
  getAll(k) { return this._d.get(k) || []; }
}
globalThis.FormData = FakeFormData;
class FakeBlob {
  constructor(parts, opts = {}) {
    this.parts = parts;
    this.type = opts.type || "";
    this.size = (parts[0]?.length || 0);
  }
}
globalThis.Blob = FakeBlob;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modUrl = "file://" + path.join(__dirname, "src", "api", "mockApi.js").replace(/\\/g, "/");
const { mockRequest } = await import(modUrl);

// ---- Test harness ----
const results = [];
const recordOk = (name, info = "") => results.push({ status: "OK", name, info });
const recordBug = (name, err) => results.push({ status: "BUG", name, err: err?.message || String(err) });

const call = async (name, method, url, opts = {}) => {
  try {
    const res = await mockRequest(method, url, opts);
    return { ok: true, res };
  } catch (e) {
    recordBug(name, e);
    return { ok: false, e };
  }
};

const ensure = async (name, method, url, opts, predicate) => {
  const r = await call(name, method, url, opts);
  if (!r.ok) return null;
  if (predicate) {
    try {
      const pass = predicate(r.res?.data);
      if (!pass) {
        recordBug(name, new Error("Predicate failed; response: " + JSON.stringify(r.res?.data).slice(0, 200)));
        return null;
      }
    } catch (e) {
      recordBug(name, e);
      return null;
    }
  }
  recordOk(name);
  return r.res?.data;
};

// Login first (mock requires AUTH_KEY in localStorage for /auth/me, but other routes don't gate).
await ensure("auth.login", "post", "/api/auth/login", { data: { email: "admin@oasisgoholidays.com", password: "Admin@123" } }, (d) => d?.user?.email);
await ensure("auth.me", "get", "/api/auth/me");

// Dashboard
await ensure("dashboard.summary", "get", "/api/dashboard/summary", {}, (d) => d?.kpis);

// Settings
await ensure("settings.get", "get", "/api/settings", {}, (d) => d?.businessName);
await ensure("settings.put", "put", "/api/settings", { data: { businessName: "OasisGo Holidays (Smoke)" } }, (d) => d.businessName.includes("Smoke"));

// Packages
const pkgList = await ensure("packages.list", "get", "/api/packages", {}, (d) => Array.isArray(d.items));
const pkgCreate = await ensure("packages.create", "post", "/api/packages", {
  data: { name: "Smoke Pkg", destination: "Goa", durationDays: 3, durationNights: 2, inclusions: {}, priceAdult: 15000, priceChild: 10000, maxPax: 10, availableDates: [], status: "ACTIVE" }
}, (d) => d?.id);
if (pkgCreate?.id) {
  await ensure("packages.update", "put", `/api/packages/${pkgCreate.id}`, { data: { ...pkgCreate, name: "Smoke Pkg v2" } }, (d) => d.name === "Smoke Pkg v2");
  await ensure("packages.delete", "delete", `/api/packages/${pkgCreate.id}`);
}

// Customers
await ensure("customers.list", "get", "/api/customers", {}, (d) => Array.isArray(d.items));
const cust = await ensure("customers.create", "post", "/api/customers", { data: { fullName: "Smoke Cust", phone: "0000000000", email: "smoke@example.com" } }, (d) => d?.id);
await ensure("customers.get", "get", `/api/customers/${cust?.id || 1}`, {}, (d) => d?.fullName);
await ensure("customers.update", "put", `/api/customers/${cust?.id}`, { data: { fullName: "Smoke Cust v2" } }, (d) => d.fullName === "Smoke Cust v2");
await ensure("customers.delete", "delete", `/api/customers/${cust?.id}`);

// Bookings
const bookings = await ensure("bookings.list", "get", "/api/bookings", {}, (d) => Array.isArray(d.items) && d.items.length > 0);
const bk = bookings.items[0];
await ensure("bookings.get", "get", `/api/bookings/${bk.id}`, {}, (d) => d?.bookingCode);
await ensure("bookings.list.filterCustomer", "get", "/api/bookings", { params: { customerId: bk.customerId } }, (d) => d.items.every((it) => it.customerId === bk.customerId));
// Edit booking — change status (the original user-reported bug)
const editedBk = await ensure("bookings.update", "put", `/api/bookings/${bk.id}`, {
  data: {
    customerId: bk.customerId,
    packageId: bk.packageId,
    departureDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    adults: 2,
    children: 0,
    adultPriceOverride: null,
    childPriceOverride: null,
    extraCharges: [],
    discountType: "NONE",
    discountValue: 0,
    bookingStatus: "CANCELLED",
    notes: "smoke",
    payments: [],
    travellers: [],
    payouts: [],
    tickets: []
  }
}, (d) => d.bookingStatus === "CANCELLED");

// Booking payments
await ensure("bookings.payments.add", "post", `/api/bookings/${bk.id}/payments`, { data: { amount: 1000, paymentDate: "2026-01-01", method: "Cash" } }, (d) => d.paidAmount > 0);

// Booking sub-resources
const afterTrav = await ensure("bookings.travellers.add", "post", `/api/bookings/${bk.id}/travellers`, { data: { fullName: "Smoke Traveller", isPrimary: false } }, (d) => Array.isArray(d.travellers));
const travId = afterTrav?.travellers?.[0]?.id;
if (travId) await ensure("bookings.travellers.delete", "delete", `/api/bookings/${bk.id}/travellers/${travId}`);

const afterPay = await ensure("bookings.payouts.add", "post", `/api/bookings/${bk.id}/payouts`, { data: { payeeType: "HOTEL", payeeName: "Smoke Hotel", amount: 5000 } }, (d) => Array.isArray(d.payouts));
const poId = afterPay?.payouts?.[0]?.id;
if (poId) {
  await ensure("bookings.payouts.markPaid", "patch", `/api/bookings/${bk.id}/payouts/${poId}/mark-paid`, {}, (d) => d.payouts.find((p) => p.id === poId)?.status === "PAID");
  await ensure("bookings.payouts.delete", "delete", `/api/bookings/${bk.id}/payouts/${poId}`);
}

const afterTick = await ensure("bookings.tickets.add", "post", `/api/bookings/${bk.id}/tickets`, { data: { ticketType: "FLIGHT", vendor: "Smoke Air", reference: "SMK1" } }, (d) => Array.isArray(d.tickets));
const tickId = afterTick?.tickets?.[0]?.id;
if (tickId) await ensure("bookings.tickets.delete", "delete", `/api/bookings/${bk.id}/tickets/${tickId}`);

// Bookings attachments — FormData
const fd = new FormData();
fd.append("files", { name: "x.txt", type: "text/plain", size: 5 });
await ensure("bookings.attachments.add", "post", `/api/bookings/${bk.id}/attachments`, { data: fd, headers: { "Content-Type": "multipart/form-data" } }, (d) => Array.isArray(d.attachments));

// Invoice
await ensure("invoices.generate", "post", `/api/invoices/${bk.id}/generate`, {}, (d) => d?.invoice);
await ensure("invoices.pdf", "get", `/api/invoices/${bk.id}/pdf`, { responseType: "blob" }, (d) => d && d.parts);
await ensure("invoices.sent", "patch", `/api/invoices/1/sent`);

// Calendar
await ensure("calendar.month", "get", "/api/calendar", { params: { month: new Date().toISOString().slice(0, 7) } }, (d) => Array.isArray(d.bookings));

// Bookings overview
await ensure("bookings.overview", "get", "/api/bookings/overview", { params: { month: new Date().toISOString().slice(0, 7) } }, (d) => d?.summary);

// Accounts
await ensure("accounts.summary", "get", "/api/accounts/summary", { params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() } }, (d) => d?.summary);
await ensure("accounts.export", "get", "/api/accounts/export", { params: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }, responseType: "blob" }, (d) => d?.parts);

// Users
await ensure("users.list", "get", "/api/users", {}, (d) => Array.isArray(d.items));
const u = await ensure("users.create", "post", "/api/users", { data: { email: "smoke@user.com", password: "Smoke@123", fullName: "Smoke User", role: "AGENT" } }, (d) => d?.id);
await ensure("users.update", "put", `/api/users/${u.id}`, { data: { fullName: "Smoke User v2", role: "MANAGER" } }, (d) => d.fullName === "Smoke User v2");
await ensure("users.delete", "delete", `/api/users/${u.id}`);

// Vendors
await ensure("vendors.list", "get", "/api/vendors", {}, (d) => Array.isArray(d.items));
const v = await ensure("vendors.create", "post", "/api/vendors", { data: { name: "Smoke Vendor", type: "B2B" } }, (d) => d?.id);
await ensure("vendors.update", "put", `/api/vendors/${v.id}`, { data: { name: "Smoke Vendor v2" } }, (d) => d.name === "Smoke Vendor v2");

// Vendor invoices
await ensure("vendorInvoices.list", "get", "/api/vendor-invoices", {}, (d) => Array.isArray(d.items));
const vi = await ensure("vendorInvoices.create", "post", "/api/vendor-invoices", {
  data: {
    vendorId: v.id,
    items: [{ description: "Service A", quantity: 1, unitPrice: 10000, taxRate: 18 }],
    issueDate: "2026-01-01",
    dueDate: "2026-02-01"
  }
}, (d) => d?.id);
await ensure("vendorInvoices.get", "get", `/api/vendor-invoices/${vi.id}`, {}, (d) => d?.invoiceNumber);
await ensure("vendorInvoices.update", "put", `/api/vendor-invoices/${vi.id}`, { data: { notes: "smoke note", items: [{ description: "Service B", quantity: 2, unitPrice: 5000, taxRate: 18 }] } }, (d) => d.notes === "smoke note");
await ensure("vendorInvoices.markSent", "patch", `/api/vendor-invoices/${vi.id}/mark-sent`, {}, (d) => d.status === "SENT");
await ensure("vendorInvoices.payment", "post", `/api/vendor-invoices/${vi.id}/payments`, { data: { amount: 5000, paymentDate: "2026-01-02", method: "Bank Transfer" } }, (d) => d.paidAmount > 0);
await ensure("vendorInvoices.duplicate", "post", `/api/vendor-invoices/${vi.id}/duplicate`, {}, (d) => d.status === "DRAFT");
await ensure("vendorInvoices.cancel", "patch", `/api/vendor-invoices/${vi.id}/cancel`, {}, (d) => d.status === "CANCELLED");
await ensure("vendorInvoices.pdf", "get", `/api/vendor-invoices/${vi.id}/pdf`, { responseType: "blob" }, (d) => d?.parts);
await ensure("vendorInvoices.delete", "delete", `/api/vendor-invoices/${vi.id}`);
await ensure("vendors.delete", "delete", `/api/vendors/${v.id}`);

// Ticket Sales
await ensure("ticketSales.list", "get", "/api/ticket-sales", {}, (d) => Array.isArray(d.items));
const ts = await ensure("ticketSales.create", "post", "/api/ticket-sales", {
  data: { customerId: 1, ticketType: "FLIGHT", vendor: "Smoke Air", reference: "SMK1", fromLocation: "BLR", toLocation: "MAA", departAt: "2026-02-10T10:00", passengers: 1, costPrice: 4000, sellingPrice: 6000, serviceFee: 200, discountAmount: 0 }
}, (d) => d?.id);
await ensure("ticketSales.get", "get", `/api/ticket-sales/${ts.id}`, {}, (d) => d?.saleCode);
await ensure("ticketSales.update", "put", `/api/ticket-sales/${ts.id}`, { data: { ...ts, sellingPrice: 7000 } }, (d) => Number(d.sellingPrice) === 7000);
await ensure("ticketSales.markSupplierPaid", "patch", `/api/ticket-sales/${ts.id}/mark-supplier-paid`, {}, (d) => d.supplierPaid === true);
await ensure("ticketSales.payment", "post", `/api/ticket-sales/${ts.id}/payments`, { data: { amount: 3000, paymentDate: "2026-02-01", method: "Cash" } }, (d) => d.paidAmount > 0);
await ensure("ticketSales.invoicePdf", "get", `/api/ticket-sales/${ts.id}/invoice/pdf`, { responseType: "blob" }, (d) => d?.parts);
await ensure("ticketSales.delete", "delete", `/api/ticket-sales/${ts.id}`);

// Ledger
const ledMonth = new Date().toISOString().slice(0, 7);
const led = await ensure("ledger.add", "post", "/api/ledger", { data: { kind: "EXPENSE", category: "Rent", amount: 1500, txDate: `${ledMonth}-15`, paymentMethod: "Bank Transfer" } }, (d) => d?.id);
await ensure("ledger.report", "get", "/api/ledger/report", { params: { month: ledMonth } }, (d) => d?.summary);
await ensure("ledger.update", "put", `/api/ledger/${led.id}`, { data: { amount: 1700 } }, (d) => Number(d.amount) === 1700);
await ensure("ledger.export", "get", "/api/ledger/export", { params: { month: ledMonth }, responseType: "blob" }, (d) => d?.parts);
await ensure("ledger.delete", "delete", `/api/ledger/${led.id}`);

// ---- Report ----
const bugs = results.filter((r) => r.status === "BUG");
console.log(`\n=== Smoke test ${results.length - bugs.length}/${results.length} OK ===\n`);
for (const r of results) {
  if (r.status === "BUG") console.log(`❌ ${r.name}: ${r.err}`);
}
if (bugs.length === 0) console.log("✅ all routes pass");
process.exit(bugs.length > 0 ? 1 : 0);
