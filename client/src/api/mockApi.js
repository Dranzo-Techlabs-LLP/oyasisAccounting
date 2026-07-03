const STORAGE_KEY = "oasisgo_mock_state";
const AUTH_KEY = "oasisgo_mock_auth";

const today = new Date();

const createSeedState = () => {
  const packages = [
    {
      id: 1,
      name: "Golden Triangle Escape",
      destination: "Delhi - Agra - Jaipur",
      durationDays: 5,
      durationNights: 4,
      inclusions: { flights: true, hotels: true, meals: true, transfers: true },
      priceAdult: 28999,
      priceChild: 19999,
      maxPax: 24,
      availableDates: ["2026-05-10", "2026-06-14", "2026-07-19"],
      status: "ACTIVE",
      coverImageUrl:
        "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
      createdAt: today.toISOString()
    },
    {
      id: 2,
      name: "Bali Bliss Retreat",
      destination: "Bali, Indonesia",
      durationDays: 6,
      durationNights: 5,
      inclusions: { flights: true, hotels: true, meals: false, transfers: true },
      priceAdult: 54999,
      priceChild: 38999,
      maxPax: 18,
      availableDates: ["2026-05-22", "2026-06-26", "2026-08-07"],
      status: "ACTIVE",
      coverImageUrl:
        "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80",
      createdAt: today.toISOString()
    },
    {
      id: 3,
      name: "Kashmir Snow Trails",
      destination: "Srinagar - Gulmarg - Pahalgam",
      durationDays: 7,
      durationNights: 6,
      inclusions: { flights: false, hotels: true, meals: true, transfers: true },
      priceAdult: 41999,
      priceChild: 29999,
      maxPax: 20,
      availableDates: ["2026-11-11", "2026-12-02", "2027-01-15"],
      status: "ACTIVE",
      coverImageUrl:
        "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=1200&q=80",
      createdAt: today.toISOString()
    }
  ];

  const customers = [
    { id: 1, fullName: "Aarav Menon", phone: "9876543210", email: "aarav@example.com", nationality: "Indian", passportNo: "M1234567", address: "Panampilly Nagar, Kochi", notes: "Prefers aisle seats" },
    { id: 2, fullName: "Nisha Kapoor", phone: "9988776655", email: "nisha@example.com", nationality: "Indian", passportNo: "K3456789", address: "Andheri West, Mumbai", notes: "Vegetarian meals only" },
    { id: 3, fullName: "Farhan Ali", phone: "9900112233", email: "farhan@example.com", nationality: "Indian", passportNo: "L4561238", address: "Banjara Hills, Hyderabad", notes: "Travelling with family" },
    { id: 4, fullName: "Meera Thomas", phone: "9123456780", email: "meera@example.com", nationality: "Indian", passportNo: "T7894561", address: "Vyttila, Kochi", notes: "Needs visa support" },
    { id: 5, fullName: "Rohan D'Souza", phone: "9011223344", email: "rohan@example.com", nationality: "Indian", passportNo: "D2233445", address: "Koramangala, Bengaluru", notes: "Corporate traveller" }
  ];

  const makeBooking = (id, customerId, packageId, monthOffset, adults, children, totalAmount, paidAmount, bookingStatus) => {
    const departure = new Date();
    departure.setMonth(departure.getMonth() + monthOffset);
    departure.setDate(Math.min(28, 8 + id));
    const extraCharges = [
      { label: "Visa Fees", amount: 2500 },
      { label: "Insurance", amount: 1200 }
    ];
    const subtotalAmount = totalAmount + 3000;
    const discountAmount = subtotalAmount - totalAmount;
    return {
      id,
      bookingCode: `BK-${String(id).padStart(5, "0")}`,
      customerId,
      packageId,
      departureDate: departure.toISOString(),
      adults,
      children,
      extraCharges,
      discountType: discountAmount ? "FLAT" : "NONE",
      discountValue: discountAmount,
      discountAmount,
      subtotalAmount,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(totalAmount - paidAmount, 0),
      paymentStatus: paidAmount === 0 ? "PENDING" : paidAmount >= totalAmount ? "PAID" : "PARTIAL",
      bookingStatus,
      notes: "Demo booking data",
      createdAt: new Date(Date.now() - id * 86400000 * 8).toISOString()
    };
  };

  const bookings = [
    makeBooking(1, 1, 1, -2, 2, 1, 80700, 80700, "COMPLETED"),
    makeBooking(2, 2, 2, -1, 2, 0, 103500, 50000, "CONFIRMED"),
    makeBooking(3, 3, 3, 0, 3, 1, 159700, 30000, "TENTATIVE"),
    makeBooking(4, 4, 1, 0, 2, 2, 101600, 45000, "CONFIRMED"),
    makeBooking(5, 5, 2, 1, 2, 1, 151700, 25000, "CONFIRMED"),
    makeBooking(6, 1, 3, 1, 1, 0, 45699, 10000, "CANCELLED"),
    makeBooking(7, 2, 1, 2, 4, 0, 114696, 80000, "CONFIRMED"),
    makeBooking(8, 3, 2, 2, 2, 2, 181996, 35000, "TENTATIVE"),
    makeBooking(9, 4, 3, 3, 2, 0, 87698, 25000, "CONFIRMED"),
    makeBooking(10, 5, 1, 3, 5, 1, 163694, 100000, "CONFIRMED")
  ];

  const payments = bookings.flatMap((booking) =>
    booking.paidAmount > 0
      ? [
          {
            id: booking.id,
            bookingId: booking.id,
            amount: booking.paidAmount,
            paymentDate: new Date(new Date(booking.departureDate).getTime() - 86400000 * 12).toISOString(),
            method: "Bank Transfer",
            note: "Advance payment"
          }
        ]
      : []
  );

  const invoices = bookings.slice(0, 7).map((booking, index) => ({
    id: index + 1,
    bookingId: booking.id,
    invoiceNumber: `OGH-2026-${String(index + 1).padStart(4, "0")}`,
    issuedDate: new Date(new Date(booking.departureDate).getTime() - 86400000 * 18).toISOString(),
    sentStatus: index % 2 === 0
  }));

  return {
    users: [{ id: 1, email: "admin@oasisgoholidays.com", password: "Admin@123", role: "ADMIN" }],
    packages,
    customers,
    bookings,
    payments,
    invoices
  };
};

const defaultSettings = () => ({
  id: 1,
  businessName: "OasisGo Holidays",
  legalName: "OasisGo Holidays Pvt Ltd",
  address: "MG Road",
  city: "Kochi",
  state: "Kerala",
  country: "India",
  postalCode: "682016",
  phone: "+91 99999 00000",
  email: "hello@oasisgoholidays.com",
  website: "https://oasisgoholidays.com",
  gstin: "32AAACO1234C1ZZ",
  pan: "AAACO1234C",
  currency: "INR",
  taxRate: 18,
  bankName: "HDFC Bank",
  bankAccountName: "OasisGo Holidays",
  bankAccountNumber: "00000000000000",
  bankIfsc: "HDFC0000000",
  bankBranch: "Kochi MG Road",
  upiId: "oasisgo@hdfc",
  logoFileName: null,
  logoUrl: null,
  invoicePrefix: "OGH",
  invoiceNextNumber: 1,
  invoiceUseYear: true,
  bookingPrefix: "BK",
  bookingNextNumber: 1,
  ticketSalePrefix: "TKT",
  ticketSaleNextNumber: 1,
  vendorInvoicePrefix: "B2B",
  vendorInvoiceNextNumber: 1,
  vendorInvoiceUseYear: true,
  invoiceTerms: "Payment due within 7 days. Late payment attracts 18% p.a. interest.",
  updatedAt: new Date().toISOString()
});

const ensureCollections = (state) => {
  if (!Array.isArray(state.ticketSales)) state.ticketSales = [];
  if (!Array.isArray(state.ticketSalePayments)) state.ticketSalePayments = [];
  if (!Array.isArray(state.vendors)) state.vendors = [];
  if (!Array.isArray(state.vendorInvoices)) state.vendorInvoices = [];
  if (!Array.isArray(state.vendorInvoiceItems)) state.vendorInvoiceItems = [];
  if (!Array.isArray(state.vendorInvoicePayments)) state.vendorInvoicePayments = [];
  if (!Array.isArray(state.ledger)) state.ledger = [];
  if (!state.settings) state.settings = defaultSettings();
  if (!Array.isArray(state.users) || state.users.length === 0) {
    state.users = [
      {
        id: 1,
        email: "admin@oasisgoholidays.com",
        password: "Admin@123",
        fullName: "OasisGo Admin",
        phone: "+91 99999 00000",
        role: "ADMIN",
        isActive: true,
        permissions: null,
        lastLoginAt: null,
        createdAt: new Date().toISOString()
      }
    ];
  } else {
    state.users = state.users.map((u) => ({
      fullName: u.fullName || "Admin",
      phone: u.phone || "",
      isActive: u.isActive ?? true,
      permissions: u.permissions ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt || new Date().toISOString(),
      ...u
    }));
  }
  state.bookings = (state.bookings || []).map((b) => ({
    ...b,
    travellers: Array.isArray(b.travellers) ? b.travellers : [],
    payouts: Array.isArray(b.payouts) ? b.payouts : [],
    tickets: Array.isArray(b.tickets) ? b.tickets : [],
    attachments: Array.isArray(b.attachments) ? b.attachments : []
  }));
  return state;
};

const readState = () => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return ensureCollections(JSON.parse(raw));
  }
  const seeded = ensureCollections(createSeedState());
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveState = (state) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

// When the user picks a date from <input type="date"> the value is a bare
// YYYY-MM-DD with no time component. Combine it with the current local time
// so payments captured today can be ordered later in the day correctly.
// Strings that already carry a time component are passed through untouched.
const stampDateWithNow = (raw) => {
  if (!raw) return new Date().toISOString();
  const s = String(raw);
  if (s.includes("T")) return new Date(s).toISOString();
  const now = new Date();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return d.toISOString();
};

const withRelations = (state, booking) => ({
  ...booking,
  customer: state.customers.find((item) => item.id === booking.customerId),
  travelPackage: state.packages.find((item) => item.id === booking.packageId),
  // Ascending: oldest installment first, newest last (so #1 = oldest in
  // the UI). When two payments share the same timestamp (e.g. legacy
  // records stored at UTC midnight), break the tie by id so the order
  // reflects creation order — first created → #1.
  payments: state.payments
    .filter((item) => item.bookingId === booking.id)
    .sort((a, b) => {
      const d = new Date(a.paymentDate) - new Date(b.paymentDate);
      if (d !== 0) return d;
      return Number(a.id) - Number(b.id);
    }),
  invoice: state.invoices.find((item) => item.bookingId === booking.id) || null
});

const createResponse = (data) => Promise.resolve({ data });

const createBlobResponse = (text, contentType = "application/octet-stream") =>
  Promise.resolve({ data: new Blob([text], { type: contentType }) });

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inr = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatLongDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return String(d); }
};

// Build a styled, printable HTML invoice page. Demo mode can't render real
// PDFs, but every browser can print this to PDF or save the page directly.
const buildInvoiceHtml = ({
  title = "Tax Invoice",
  settings = {},
  invoiceNumber,
  invoiceDate,
  refLabel,
  refValue,
  customer = {},
  lines = [],
  subtotal = 0,
  discountAmount = 0,
  taxAmount = 0,
  totalAmount = 0,
  paidAmount = 0,
  balanceDue = 0,
  showGstin = true,
  includeBank = true,
  notes = ""
}) => {
  const addressLine = [settings.address, settings.city, settings.state, settings.country, settings.postalCode]
    .filter(Boolean).join(", ");
  const contactLine = [
    settings.phone && `Phone: ${escapeHtml(settings.phone)}`,
    settings.email && `Email: ${escapeHtml(settings.email)}`,
    settings.website
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");
  const taxLine = showGstin
    ? [settings.gstin && `GSTIN: ${escapeHtml(settings.gstin)}`, settings.pan && `PAN: ${escapeHtml(settings.pan)}`].filter(Boolean).join(" &nbsp;·&nbsp; ")
    : "";

  // Fare lines always spell out "rate × qty" inside the Rate cell (e.g.
  // "₹28,999.00 × 5") so the buyer can verify the line total without a
  // separate Calc column. Non-fare extras (Visa Fees, Insurance) keep a
  // plain rate when the quantity is 1 since the figure is already obvious.
  const linesHtml = lines.map((l, i) => {
    const qty = Number(l.qty || 0);
    const unit = Number(l.unitPrice || 0);
    const isFare = !!l.isFare;
    const showCalc = (isFare || qty > 1) && unit > 0 && qty > 0;
    const rateCell = l.unitPrice == null
      ? ""
      : showCalc
        ? `${inr(unit)} <span class="muted">× ${qty}</span>`
        : inr(unit);
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(l.description || "")}${l.hsn ? `<div class="muted">HSN: ${escapeHtml(l.hsn)}</div>` : ""}</td>
      <td class="num">${l.qty ?? ""}</td>
      <td class="num">${rateCell}</td>
      <td class="num">${l.taxRate ? l.taxRate + "%" : "—"}</td>
      <td class="num">${inr(l.total)}</td>
    </tr>
  `;
  }).join("");

  const bankHtml = includeBank ? `
    <section class="card bank">
      <h3>Bank / UPI</h3>
      <div class="kv">
        ${settings.bankName ? `<div><span>Bank</span><strong>${escapeHtml(settings.bankName)}</strong></div>` : ""}
        ${settings.bankAccountName ? `<div><span>Account name</span><strong>${escapeHtml(settings.bankAccountName)}</strong></div>` : ""}
        ${settings.bankAccountNumber ? `<div><span>Account no.</span><strong>${escapeHtml(settings.bankAccountNumber)}</strong></div>` : ""}
        ${settings.bankIfsc ? `<div><span>IFSC</span><strong>${escapeHtml(settings.bankIfsc)}</strong></div>` : ""}
        ${settings.bankBranch ? `<div><span>Branch</span><strong>${escapeHtml(settings.bankBranch)}</strong></div>` : ""}
        ${settings.upiId ? `<div><span>UPI ID</span><strong>${escapeHtml(settings.upiId)}</strong></div>` : ""}
      </div>
    </section>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(invoiceNumber || title)} - ${escapeHtml(settings.businessName || "OasisGo Holidays")}</title>
<style>
  :root { --ink:#1d3a6e; --soft:#57658a; --line:#dbe4f0; --bg:#f5f7fb; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: #142447; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; padding: 12px 16px; background: #ffffffee; backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); }
  .toolbar button { font: inherit; padding: 8px 14px; border-radius: 6px; border: 1px solid var(--line); background: #fff; cursor: pointer; }
  .toolbar button.primary { background: var(--ink); color: #fff; border-color: var(--ink); }
  .toolbar button:hover { filter: brightness(0.96); }
  .toolbar .spacer { flex: 1; }
  .toolbar .filename { color: var(--soft); font-size: 13px; align-self: center; }
  .invoice { max-width: 820px; margin: 24px auto; background: #fff; padding: 40px 48px 56px; box-shadow: 0 8px 24px rgba(20,36,71,.08); border: 1px solid var(--line); border-radius: 6px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 1px solid var(--line); padding-bottom: 20px; }
  .biz h1 { margin: 0 0 6px; color: var(--ink); font-size: 26px; }
  .biz p { margin: 2px 0; font-size: 12px; color: var(--soft); }
  .meta { text-align: right; }
  .meta .badge { display: inline-block; background: var(--ink); color: #fff; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
  .meta h2 { margin: 8px 0 4px; color: var(--ink); font-size: 18px; }
  .meta .num { font-family: ui-monospace, Menlo, monospace; font-size: 15px; }
  .meta p { margin: 2px 0; font-size: 12px; color: var(--soft); }
  section.card { margin-top: 24px; padding: 16px 18px; background: #f8fafd; border: 1px solid var(--line); border-radius: 6px; }
  section.card h3 { margin: 0 0 10px; color: var(--ink); font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; font-size: 13px; }
  .kv > div { display: flex; gap: 6px; align-items: baseline; }
  .kv span { color: var(--soft); min-width: 110px; }
  table.items { width: 100%; margin-top: 24px; border-collapse: collapse; font-size: 13px; }
  table.items th { text-align: left; padding: 10px 8px; background: var(--ink); color: #fff; font-weight: 600; }
  table.items th.num, table.items td.num { text-align: right; }
  table.items td { padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.items td .muted { color: var(--soft); font-size: 11px; margin-top: 2px; }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .row.grand { border-top: 1px solid var(--ink); margin-top: 6px; padding-top: 10px; font-size: 16px; color: var(--ink); font-weight: 700; }
  .totals .row.balance { color: #b03330; font-weight: 600; }
  .notes { margin-top: 24px; padding: 14px 16px; border-left: 3px solid var(--ink); background: #f8fafd; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 11px; color: var(--soft); text-align: center; border-top: 1px solid var(--line); padding-top: 14px; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .invoice { box-shadow: none; border: 0; margin: 0; max-width: none; padding: 24px 32px; }
    @page { size: A4; margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
    <span class="spacer"></span>
    <span class="filename">${escapeHtml(invoiceNumber || "")}</span>
  </div>
  <article class="invoice">
    <header class="head">
      <div class="biz">
        <h1>${escapeHtml(settings.businessName || "OasisGo Holidays")}</h1>
        ${addressLine ? `<p>${escapeHtml(addressLine)}</p>` : ""}
        ${contactLine ? `<p>${contactLine}</p>` : ""}
        ${taxLine ? `<p>${taxLine}</p>` : ""}
      </div>
      <div class="meta">
        <span class="badge">${escapeHtml(title)}</span>
        <h2 class="num">${escapeHtml(invoiceNumber || "")}</h2>
        <p>${escapeHtml(formatLongDate(invoiceDate))}</p>
        ${refLabel && refValue ? `<p>${escapeHtml(refLabel)}: <strong>${escapeHtml(refValue)}</strong></p>` : ""}
      </div>
    </header>

    <section class="card">
      <h3>Billed to</h3>
      <div class="kv">
        <div><span>Name</span><strong>${escapeHtml(customer.fullName || "")}</strong></div>
        ${customer.phone ? `<div><span>Phone</span><strong>${escapeHtml(customer.phone)}</strong></div>` : ""}
        ${customer.email ? `<div><span>Email</span><strong>${escapeHtml(customer.email)}</strong></div>` : ""}
        ${customer.address ? `<div><span>Address</span><strong>${escapeHtml(customer.address)}</strong></div>` : ""}
      </div>
    </section>

    <table class="items">
      <thead>
        <tr><th>#</th><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Tax</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><strong>${inr(subtotal)}</strong></div>
      ${discountAmount > 0 ? `<div class="row"><span>Discount</span><strong>− ${inr(discountAmount)}</strong></div>` : ""}
      ${taxAmount > 0 ? `<div class="row"><span>Tax (GST)</span><strong>${inr(taxAmount)}</strong></div>` : ""}
      <div class="row grand"><span>Total</span><strong>${inr(totalAmount)}</strong></div>
      ${paidAmount > 0 ? `<div class="row"><span>Paid</span><strong>${inr(paidAmount)}</strong></div>` : ""}
      <div class="row balance"><span>Balance due</span><strong>${inr(balanceDue)}</strong></div>
    </div>

    ${bankHtml}

    ${notes ? `<div class="notes">${escapeHtml(notes)}</div>` : ""}
    ${settings.invoiceTerms ? `<div class="notes"><strong>Terms:</strong> ${escapeHtml(settings.invoiceTerms)}</div>` : ""}

    <p class="footer">Generated ${escapeHtml(new Date().toLocaleString("en-GB"))} · ${escapeHtml(settings.businessName || "OasisGo Holidays")}</p>
  </article>
</body>
</html>`;
};

const parseRoute = (url) => url.replace(/^https?:\/\/[^/]+\/api/, "").replace(/^\/api/, "");

const filterPackages = (items, params) =>
  items.filter((item) => {
    const q = String(params?.q || "").toLowerCase();
    const status = String(params?.status || "");
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.destination.toLowerCase().includes(q);
    const matchesStatus = !status || item.status === status;
    return matchesQuery && matchesStatus;
  });

const filterCustomers = (items, params) => {
  const q = String(params?.q || "").toLowerCase();
  return items.filter((item) => !q || item.fullName.toLowerCase().includes(q) || item.phone.includes(q) || String(item.email || "").toLowerCase().includes(q));
};

const filterBookings = (state, params) => {
  const q = String(params?.q || "").toLowerCase();
  const status = String(params?.status || "");
  const customerId = params?.customerId != null ? Number(params.customerId) : null;
  return state.bookings
    .map((item) => withRelations(state, item))
    .filter((item) => {
      const matchesQuery =
        !q ||
        item.bookingCode.toLowerCase().includes(q) ||
        item.customer.fullName.toLowerCase().includes(q) ||
        item.travelPackage.name.toLowerCase().includes(q);
      const matchesStatus = !status || item.bookingStatus === status;
      const matchesCustomer = customerId == null || Number(item.customerId) === customerId;
      return matchesQuery && matchesStatus && matchesCustomer;
    });
};

const computeAccounts = (state, params) => {
  const month = Number(params?.month || new Date().getMonth() + 1);
  const year = Number(params?.year || new Date().getFullYear());
  const invoices = state.invoices
    .filter((invoice) => {
      const date = new Date(invoice.issuedDate);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    })
    .map((invoice) => {
      const booking = state.bookings.find((item) => item.id === invoice.bookingId);
      const customer = state.customers.find((item) => item.id === booking.customerId);
      const travelPackage = state.packages.find((item) => item.id === booking.packageId);
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issuedDate: invoice.issuedDate,
        sentStatus: invoice.sentStatus,
        bookingCode: booking.bookingCode,
        customerName: customer.fullName,
        packageName: travelPackage.name,
        totalAmount: booking.totalAmount,
        collectedAmount: booking.paidAmount,
        outstandingAmount: booking.balanceDue,
        paymentStatus: booking.paymentStatus
      };
    });

  const summary = invoices.reduce(
    (acc, item) => {
      acc.totalInvoiced += item.totalAmount;
      acc.totalCollected += item.collectedAmount;
      acc.totalOutstanding += item.outstandingAmount;
      return acc;
    },
    { totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0 }
  );

  return { month, year, summary, invoices };
};

const dashboardSummary = (state) => {
  const now = new Date();
  const bookingsThisMonth = state.bookings.filter((item) => {
    const created = new Date(item.createdAt);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });
  const upcoming = state.bookings.filter((item) => {
    const departure = new Date(item.departureDate);
    return departure >= now && departure <= new Date(Date.now() + 86400000 * 7);
  });
  const recentBookings = state.bookings
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map((item) => {
      const customer = state.customers.find((customerRow) => customerRow.id === item.customerId);
      const travelPackage = state.packages.find((pkg) => pkg.id === item.packageId);
      return {
        id: item.id,
        bookingCode: item.bookingCode,
        customerName: customer.fullName,
        packageName: travelPackage.name,
        destination: travelPackage.destination,
        totalAmount: item.totalAmount,
        bookingStatus: item.bookingStatus,
        paymentStatus: item.paymentStatus,
        departureDate: item.departureDate
      };
    });

  const monthlyRevenueMap = new Map();
  state.bookings.forEach((item) => {
    const label = new Date(item.createdAt).toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthlyRevenueMap.set(label, (monthlyRevenueMap.get(label) || 0) + item.totalAmount);
  });

  const statusCounts = ["CONFIRMED", "TENTATIVE", "CANCELLED", "COMPLETED"].map((status) => ({
    status,
    value: state.bookings.filter((item) => item.bookingStatus === status).length
  }));

  const packageCount = state.packages.map((pkg) => ({
    name: pkg.name,
    bookings: state.bookings.filter((item) => item.packageId === pkg.id).length
  }));

  return {
    kpis: {
      bookingsThisMonth: bookingsThisMonth.length,
      revenueThisMonth: bookingsThisMonth.reduce((sum, item) => sum + item.totalAmount, 0),
      pendingPayments: state.bookings.reduce((sum, item) => sum + item.balanceDue, 0),
      upcomingDepartures: upcoming.length
    },
    recentBookings,
    revenueByMonth: Array.from(monthlyRevenueMap.entries()).map(([month, revenue]) => ({ month, revenue })),
    bookingStatuses: statusCounts,
    topPackages: packageCount.sort((a, b) => b.bookings - a.bookings).slice(0, 5)
  };
};

export async function mockRequest(method, url, config = {}) {
  const route = parseRoute(url);
  const state = readState();
  const payload = config.data || {};
  const params = config.params || {};

  if (route === "/auth/me") {
    const auth = window.localStorage.getItem(AUTH_KEY);
    if (!auth) {
      throw new Error("Unauthenticated");
    }
    return createResponse({ user: JSON.parse(auth) });
  }

  if (route === "/auth/login" && method === "post") {
    const user = state.users.find(
      (item) => item.email === payload.email && item.password === payload.password
    );
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const sessionUser = { id: user.id, email: user.email, role: user.role };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(sessionUser));
    return createResponse({ user: sessionUser });
  }

  if (route === "/auth/logout" && method === "post") {
    window.localStorage.removeItem(AUTH_KEY);
    return createResponse({ message: "Logged out" });
  }

  if (route === "/dashboard/summary") {
    return createResponse(dashboardSummary(state));
  }

  if (route === "/packages" && method === "get") {
    return createResponse({ items: filterPackages(state.packages, params) });
  }

  if (route === "/packages" && method === "post") {
    const next = { ...payload, id: state.packages.length + 1, createdAt: new Date().toISOString() };
    state.packages.unshift(next);
    saveState(state);
    return createResponse(next);
  }

  if (route.startsWith("/packages/") && method === "put") {
    const id = Number(route.split("/")[2]);
    state.packages = state.packages.map((item) => (item.id === id ? { ...item, ...payload } : item));
    saveState(state);
    return createResponse(state.packages.find((item) => item.id === id));
  }

  if (route.startsWith("/packages/") && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.packages = state.packages.filter((item) => item.id !== id);
    saveState(state);
    return createResponse({ message: "Package deleted" });
  }

  if (route === "/customers" && method === "get") {
    return createResponse({ items: filterCustomers(state.customers, params) });
  }

  if (route === "/customers" && method === "post") {
    const next = { ...payload, id: state.customers.length + 1 };
    state.customers.unshift(next);
    saveState(state);
    return createResponse(next);
  }

  if (route.startsWith("/customers/") && method === "put") {
    const id = Number(route.split("/")[2]);
    state.customers = state.customers.map((item) => (item.id === id ? { ...item, ...payload } : item));
    saveState(state);
    return createResponse(state.customers.find((item) => item.id === id));
  }

  if (route.startsWith("/customers/") && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.customers = state.customers.filter((item) => item.id !== id);
    saveState(state);
    return createResponse({ message: "Customer deleted" });
  }

  if (route === "/bookings" && method === "get") {
    return createResponse({ items: filterBookings(state, params) });
  }

  if (route === "/bookings" && method === "post") {
    const customerId =
      payload.customerId ||
      (() => {
        const nextCustomer = { ...payload.customer, id: state.customers.length + 1 };
        state.customers.unshift(nextCustomer);
        return nextCustomer.id;
      })();
    const selectedPackage = state.packages.find((item) => item.id === payload.packageId);
    // Treat a 0 override as "no override" so a half-filled custom-pricing
    // toggle doesn't silently zero out the booking total.
    const adultOverride = payload.adultPriceOverride != null && Number(payload.adultPriceOverride) > 0
      ? Number(payload.adultPriceOverride) : null;
    const childOverride = payload.childPriceOverride != null && Number(payload.childPriceOverride) > 0
      ? Number(payload.childPriceOverride) : null;
    const effAdultRate = adultOverride != null ? adultOverride : Number(selectedPackage.priceAdult || 0);
    const effChildRate = childOverride != null ? childOverride : Number(selectedPackage.priceChild || 0);
    const adultTotal = effAdultRate * payload.adults;
    const childTotal = effChildRate * payload.children;
    const extras = (payload.extraCharges || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const subtotalAmount = adultTotal + childTotal + extras;
    const discountAmount =
      payload.discountType === "FLAT"
        ? Number(payload.discountValue || 0)
        : payload.discountType === "PERCENTAGE"
          ? subtotalAmount * (Number(payload.discountValue || 0) / 100)
          : 0;
    const totalAmount = Math.max(subtotalAmount - discountAmount, 0);
    const paidAmount = Number(payload.amountPaid || 0);
    const nextBookingId = state.bookings.length + 1;
    let travellerIdSeq = 0;
    let payoutIdSeq = 0;
    let ticketIdSeq = 0;
    const nextBooking = {
      id: nextBookingId,
      bookingCode: `BK-${String(nextBookingId).padStart(5, "0")}`,
      customerId,
      packageId: payload.packageId,
      departureDate: new Date(payload.departureDate).toISOString(),
      endDate: payload.endDate ? new Date(payload.endDate).toISOString() : null,
      adults: payload.adults,
      children: payload.children,
      adultPriceOverride: adultOverride,
      childPriceOverride: childOverride,
      extraCharges: payload.extraCharges || [],
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      discountAmount,
      subtotalAmount,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(totalAmount - paidAmount, 0),
      paymentStatus: paidAmount === 0 ? "PENDING" : paidAmount >= totalAmount ? "PAID" : "PARTIAL",
      bookingStatus: payload.bookingStatus,
      notes: payload.notes,
      travellers: (Array.isArray(payload.travellers) ? payload.travellers : []).map((t) => ({
        id: ++travellerIdSeq,
        fullName: t.fullName,
        age: t.age ?? null,
        gender: t.gender ?? null,
        passportNo: t.passportNo ?? null,
        phone: t.phone ?? null,
        isPrimary: !!t.isPrimary,
        note: t.note ?? null
      })),
      payouts: (Array.isArray(payload.payouts) ? payload.payouts : []).map((p) => ({
        id: ++payoutIdSeq,
        payeeType: p.payeeType || "OTHER",
        payeeName: p.payeeName,
        amount: Number(p.amount || 0),
        status: p.status || "PENDING",
        dueDate: p.dueDate || null,
        paidDate: p.paidDate || null,
        reference: p.reference || null,
        note: p.note || null
      })),
      tickets: (Array.isArray(payload.tickets) ? payload.tickets : []).map((t) => ({
        id: ++ticketIdSeq,
        ticketType: t.ticketType || "FLIGHT",
        vendor: t.vendor || null,
        reference: t.reference || null,
        fromLocation: t.fromLocation || null,
        toLocation: t.toLocation || null,
        departAt: t.departAt || null,
        returnAt: t.returnAt || null,
        passengers: Number(t.passengers || 1),
        amount: Number(t.amount || 0),
        status: t.status || "BOOKED",
        note: t.note || null
      })),
      attachments: [],
      createdAt: new Date().toISOString()
    };
    state.bookings.unshift(nextBooking);
    // Persist each installment so the Edit modal can round-trip them. Falls
    // back to a single consolidated record if the caller only sent amountPaid.
    const incomingPayments = Array.isArray(payload.payments) ? payload.payments.filter((p) => Number(p.amount || 0) > 0) : [];
    if (incomingPayments.length > 0) {
      incomingPayments.forEach((p) => {
        state.payments.unshift({
          id: state.payments.length + 1,
          bookingId: nextBooking.id,
          amount: Number(p.amount || 0),
          paymentDate: stampDateWithNow(p.paymentDate),
          method: p.method || "Cash",
          note: p.note || ""
        });
      });
    } else if (paidAmount > 0) {
      state.payments.unshift({
        id: state.payments.length + 1,
        bookingId: nextBooking.id,
        amount: paidAmount,
        paymentDate: new Date().toISOString(),
        method: "Initial Payment",
        note: "Recorded while creating booking"
      });
    }
    saveState(state);
    return createResponse(withRelations(state, nextBooking));
  }

  if (/^\/bookings\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    const existing = state.bookings.find((item) => item.id === id);
    if (!existing) {
      throw new Error("Booking not found");
    }
    const selectedPackage =
      state.packages.find((item) => item.id === Number(payload.packageId)) ||
      state.packages.find((item) => item.id === existing.packageId);

    const adults = Number(payload.adults ?? existing.adults ?? 0);
    const children = Number(payload.children ?? existing.children ?? 0);
    // Treat a 0 override as "no override". Matches the server's defensive
    // coercion so a stale 0-override booking heals on the next save.
    const putAdultOverride =
      payload.adultPriceOverride != null && Number(payload.adultPriceOverride) > 0
        ? Number(payload.adultPriceOverride) : null;
    const putChildOverride =
      payload.childPriceOverride != null && Number(payload.childPriceOverride) > 0
        ? Number(payload.childPriceOverride) : null;
    const adultRate =
      putAdultOverride != null ? putAdultOverride : Number(selectedPackage?.priceAdult || 0);
    const childRate =
      putChildOverride != null ? putChildOverride : Number(selectedPackage?.priceChild || 0);
    const extraCharges = Array.isArray(payload.extraCharges)
      ? payload.extraCharges
          .filter((item) => item && item.label)
          .map((item) => ({ label: item.label, amount: Number(item.amount || 0) }))
      : existing.extraCharges || [];
    const extras = extraCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const subtotalAmount = adultRate * adults + childRate * children + extras;
    const discountType = payload.discountType ?? existing.discountType ?? "NONE";
    const discountValueRaw = Number(payload.discountValue ?? existing.discountValue ?? 0);
    const discountAmount =
      discountType === "FLAT"
        ? discountValueRaw
        : discountType === "PERCENTAGE"
          ? subtotalAmount * (discountValueRaw / 100)
          : 0;
    const totalAmount = Math.max(subtotalAmount - Math.min(discountAmount, subtotalAmount), 0);

    // Reconcile installments. The form now sends the full list (existing rows
    // carry their `id`, new rows omit it). We replace this booking's records
    // accordingly so edits / deletes round-trip and totals recompute correctly.
    let paidFromPayments = null;
    if (Array.isArray(payload.payments)) {
      const submitted = payload.payments.filter((p) => Number(p.amount || 0) > 0);
      const existingIds = new Set(
        submitted.map((p) => Number(p.id)).filter((x) => Number.isFinite(x) && x > 0)
      );
      // Drop this booking's payments that the form no longer includes.
      state.payments = state.payments.filter(
        (rec) => rec.bookingId !== id || existingIds.has(Number(rec.id))
      );
      let nextId = state.payments.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
      paidFromPayments = 0;
      for (const p of submitted) {
        const amount = Number(p.amount || 0);
        paidFromPayments += amount;
        const recordId = Number(p.id) || ++nextId;
        const normalized = {
          id: recordId,
          bookingId: id,
          amount,
          paymentDate: stampDateWithNow(p.paymentDate),
          method: p.method || "Cash",
          note: p.note || ""
        };
        const idx = state.payments.findIndex((rec) => Number(rec.id) === recordId && rec.bookingId === id);
        if (idx === -1) state.payments.unshift(normalized);
        else state.payments[idx] = normalized;
      }
    }

    // Replace sub-arrays with the payload (preserving ids on rows that had them).
    // If `payload.<key>` is undefined, leave the existing list untouched (back-compat).
    const replaceList = (key, items, normalize) => {
      if (!Array.isArray(items)) return;
      const arr = Array.isArray(existing[key]) ? existing[key] : [];
      let nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
      const next = items.map((it) => {
        const id = Number(it?.id) || ++nextId;
        return { ...normalize(it), id };
      });
      existing[key] = next;
    };
    replaceList("travellers", payload.travellers, (t) => ({
      fullName: t.fullName,
      age: t.age ?? null,
      gender: t.gender ?? null,
      passportNo: t.passportNo ?? null,
      phone: t.phone ?? null,
      isPrimary: !!t.isPrimary,
      note: t.note ?? null
    }));
    replaceList("payouts", payload.payouts, (p) => ({
      payeeType: p.payeeType || "OTHER",
      payeeName: p.payeeName,
      amount: Number(p.amount || 0),
      status: p.status || "PENDING",
      dueDate: p.dueDate || null,
      paidDate: p.paidDate || null,
      reference: p.reference || null,
      note: p.note || null
    }));
    replaceList("tickets", payload.tickets, (t) => ({
      ticketType: t.ticketType || "FLIGHT",
      vendor: t.vendor || null,
      reference: t.reference || null,
      fromLocation: t.fromLocation || null,
      toLocation: t.toLocation || null,
      departAt: t.departAt || null,
      returnAt: t.returnAt || null,
      passengers: Number(t.passengers || 1),
      amount: Number(t.amount || 0),
      status: t.status || "BOOKED",
      note: t.note || null
    }));

    const paidAmount =
      paidFromPayments != null
        ? paidFromPayments
        : Number(existing.paidAmount || 0);
    const updated = {
      ...existing,
      customerId: Number(payload.customerId || existing.customerId),
      packageId: selectedPackage ? selectedPackage.id : existing.packageId,
      departureDate: payload.departureDate
        ? new Date(payload.departureDate).toISOString()
        : existing.departureDate,
      endDate: payload.endDate ? new Date(payload.endDate).toISOString() : existing.endDate || null,
      adults,
      children,
      adultPriceOverride: putAdultOverride,
      childPriceOverride: putChildOverride,
      extraCharges,
      discountType,
      discountValue: discountValueRaw,
      discountAmount,
      subtotalAmount,
      totalAmount,
      paidAmount,
      balanceDue: Math.max(totalAmount - paidAmount, 0),
      paymentStatus:
        paidAmount === 0 ? "PENDING" : paidAmount >= totalAmount ? "PAID" : "PARTIAL",
      bookingStatus: payload.bookingStatus ?? existing.bookingStatus,
      notes: payload.notes ?? existing.notes
    };
    state.bookings = state.bookings.map((b) => (b.id === id ? updated : b));
    saveState(state);
    return createResponse(withRelations(state, updated));
  }

  if (/^\/bookings\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.bookings = state.bookings.filter((b) => b.id !== id);
    state.payments = state.payments.filter((p) => p.bookingId !== id);
    state.invoices = state.invoices.filter((inv) => inv.bookingId !== id);
    saveState(state);
    return createResponse({ message: "Booking deleted" });
  }

  if (/^\/bookings\/\d+\/payments\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const bookingId = Number(parts[2]);
    const paymentId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === bookingId);
    const payment = state.payments.find((p) => p.id === paymentId && p.bookingId === bookingId);
    if (booking && payment) {
      booking.paidAmount = Math.max(Number(booking.paidAmount || 0) - Number(payment.amount || 0), 0);
      booking.balanceDue = Math.max(Number(booking.totalAmount || 0) - booking.paidAmount, 0);
      booking.paymentStatus =
        booking.paidAmount === 0
          ? "PENDING"
          : booking.paidAmount >= booking.totalAmount
            ? "PAID"
            : "PARTIAL";
      state.payments = state.payments.filter((p) => p.id !== paymentId);
      saveState(state);
    }
    return createResponse({ message: "Payment removed" });
  }

  if (route === "/bookings/overview" && method === "get") {
    const month = String(params.month || new Date().toISOString().slice(0, 7));
    const list = state.bookings
      .map((item) => withRelations(state, item))
      .filter((item) => item.departureDate.slice(0, 7) === month);
    const now = new Date();
    return createResponse({
      month,
      summary: {
        totalBookings: list.length,
        totalRevenue: list.reduce((sum, item) => sum + item.totalAmount, 0),
        pendingPayments: list.reduce((sum, item) => sum + item.balanceDue, 0)
      },
      upcoming: list.filter((item) => new Date(item.departureDate) > now),
      past: list.filter((item) => new Date(item.departureDate) <= now)
    });
  }

  if (/^\/bookings\/\d+$/.test(route) && method === "get") {
    const id = Number(route.split("/")[2]);
    return createResponse(withRelations(state, state.bookings.find((item) => item.id === id)));
  }

  if (/^\/bookings\/\d+\/payments$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const booking = state.bookings.find((item) => item.id === id);
    const payment = {
      id: state.payments.length + 1,
      bookingId: id,
      amount: Number(payload.amount),
      paymentDate: stampDateWithNow(payload.paymentDate),
      method: payload.method,
      note: payload.note
    };
    state.payments.unshift(payment);
    booking.paidAmount += payment.amount;
    booking.balanceDue = Math.max(booking.totalAmount - booking.paidAmount, 0);
    booking.paymentStatus =
      booking.paidAmount === 0 ? "PENDING" : booking.paidAmount >= booking.totalAmount ? "PAID" : "PARTIAL";
    saveState(state);
    return createResponse(withRelations(state, booking));
  }

  if (/^\/invoices\/\d+\/generate$/.test(route) && method === "post") {
    const bookingId = Number(route.split("/")[2]);
    let invoice = state.invoices.find((item) => item.bookingId === bookingId);
    if (!invoice) {
      invoice = {
        id: state.invoices.length + 1,
        bookingId,
        invoiceNumber: `OGH-2026-${String(state.invoices.length + 1).padStart(4, "0")}`,
        issuedDate: new Date().toISOString(),
        sentStatus: false
      };
      state.invoices.unshift(invoice);
      saveState(state);
    }
    return createResponse({ invoice });
  }

  if (/^\/invoices\/\d+\/pdf/.test(route) && method === "get") {
    const bookingId = Number(route.split("/")[2].split("?")[0]);
    const booking = withRelations(state, state.bookings.find((item) => item.id === bookingId));
    const pkg = booking.travelPackage || {};
    const adultRate = booking.adultPriceOverride != null ? Number(booking.adultPriceOverride) : Number(pkg.priceAdult || 0);
    const childRate = booking.childPriceOverride != null ? Number(booking.childPriceOverride) : Number(pkg.priceChild || 0);
    const lines = [];
    const adultLineTotal = adultRate * Number(booking.adults || 0);
    if (Number(booking.adults || 0) > 0 && adultLineTotal > 0) {
      lines.push({ description: `${pkg.name || "Package"} — Adult fare`, qty: booking.adults, unitPrice: adultRate, total: adultLineTotal, isFare: true });
    }
    const childLineTotal = childRate * Number(booking.children || 0);
    if (Number(booking.children || 0) > 0 && childLineTotal > 0) {
      lines.push({ description: `${pkg.name || "Package"} — Child fare`, qty: booking.children, unitPrice: childRate, total: childLineTotal, isFare: true });
    }
    (booking.extraCharges || []).forEach((c) => {
      const amt = Number(c.amount || 0);
      const label = String(c.label || "").trim();
      if (amt > 0 && label) {
        lines.push({ description: label, qty: 1, unitPrice: amt, total: amt });
      }
    });
    const taxRate = Number(params.taxRate || 0);
    const subtotal = Number(booking.subtotalAmount || lines.reduce((s, l) => s + Number(l.total || 0), 0));
    const discountAmount = Number(booking.discountAmount || 0);
    const taxBase = Math.max(subtotal - discountAmount, 0);
    const taxAmount = taxRate > 0 ? taxBase * (taxRate / 100) : 0;
    const html = buildInvoiceHtml({
      title: "Tax Invoice",
      settings: state.settings,
      invoiceNumber: booking.invoice?.invoiceNumber || `OGH-${new Date().getFullYear()}-${String(bookingId).padStart(4, "0")}`,
      invoiceDate: booking.invoice?.issuedDate || new Date().toISOString(),
      refLabel: "Booking",
      refValue: booking.bookingCode,
      customer: booking.customer || {},
      lines,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount: Number(booking.totalAmount || 0) + taxAmount,
      paidAmount: Number(booking.paidAmount || 0),
      balanceDue: Math.max((Number(booking.totalAmount || 0) + taxAmount) - Number(booking.paidAmount || 0), 0),
      showGstin: params.showGstin !== "0",
      includeBank: params.includeBank !== "0",
      notes: params.notes || ""
    });
    return createBlobResponse(html, "text/html");
  }

  if (/^\/invoices\/\d+\/sent$/.test(route) && method === "patch") {
    const id = Number(route.split("/")[2]);
    state.invoices = state.invoices.map((item) => (item.id === id ? { ...item, sentStatus: true } : item));
    saveState(state);
    return createResponse(state.invoices.find((item) => item.id === id));
  }

  if (route === "/calendar" && method === "get") {
    const monthParam = String(params.month || new Date().toISOString().slice(0, 7));
    const [year, monthNum] = monthParam.split("-").map(Number);
    const start = new Date(year, monthNum - 1, 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(year, monthNum, 0);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const inRange = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= start && d <= end;
    };

    const bookings = state.bookings
      .filter((b) => inRange(b.departureDate) || inRange(b.endDate))
      .map((b) => {
        const customer = state.customers.find((c) => c.id === b.customerId);
        const travelPackage = state.packages.find((p) => p.id === b.packageId);
        return {
          id: b.id,
          kind: "booking",
          code: b.bookingCode,
          title: travelPackage?.name || "Booking",
          customer: customer?.fullName || "",
          destination: travelPackage?.destination || "",
          departureDate: b.departureDate,
          endDate: b.endDate || null,
          amount: b.totalAmount,
          bookingStatus: b.bookingStatus,
          paymentStatus: b.paymentStatus,
          pax: (b.adults || 0) + (b.children || 0)
        };
      });

    const ticketSales = (state.ticketSales || [])
      .filter((s) => inRange(s.departAt || s.departureDate))
      .map((s) => {
        const customer = state.customers.find((c) => c.id === s.customerId);
        return {
          id: s.id,
          kind: "ticketSale",
          code: s.saleCode,
          title: `${s.ticketType}: ${s.vendor || "Ticket"}`,
          customer: customer?.fullName || "",
          from: s.fromLocation,
          to: s.toLocation,
          departureDate: s.departAt || s.departureDate,
          returnDate: s.returnAt || s.returnDate || null,
          amount: s.totalAmount,
          ticketType: s.ticketType,
          status: s.status,
          paymentStatus: s.paymentStatus,
          pax: s.passengers
        };
      });

    return createResponse({ month: monthParam, bookings, ticketSales });
  }

  if (route === "/accounts/summary" && method === "get") {
    return createResponse(computeAccounts(state, params));
  }

  if (route === "/accounts/export" && method === "get") {
    const { invoices } = computeAccounts(state, params);
    const header = "invoiceNumber,customerName,packageName,totalAmount,collectedAmount,outstandingAmount,paymentStatus";
    const rows = invoices.map((item) =>
      [item.invoiceNumber, item.customerName, item.packageName, item.totalAmount, item.collectedAmount, item.outstandingAmount, item.paymentStatus].join(",")
    );
    return createBlobResponse([header, ...rows].join("\n"), "text/csv");
  }

  /* ===================== Settings ===================== */
  /* ===================== Roles & Rights (demo) ===================== */
  if (route === "/roles" && method === "get") {
    const catalog = [
      { group: "Dashboard", modules: [{ key: "dashboard", label: "View dashboard", actions: ["read"] }] },
      { group: "Bookings", modules: [
        { key: "bookings", label: "Bookings", actions: ["read", "write", "delete"] },
        { key: "calendar", label: "Booking calendar", actions: ["read"] },
        { key: "overview", label: "Monthly overview", actions: ["read"] }
      ] },
      { group: "Ticket Sales", modules: [{ key: "ticketSales", label: "Ticket sales", actions: ["read", "write", "delete"] }] },
      { group: "Customers & Packages", modules: [
        { key: "customers", label: "Customers", actions: ["read", "write", "delete"] },
        { key: "packages", label: "Packages", actions: ["read", "write", "delete"] }
      ] },
      { group: "Accounting", modules: [
        { key: "accounts", label: "Accounts & revenue", actions: ["read", "write"] },
        { key: "invoices", label: "Invoices", actions: ["read", "write"] },
        { key: "ledger", label: "Income / Expense", actions: ["read", "write", "delete"] }
      ] },
      { group: "Vendors / B2B", modules: [
        { key: "vendors", label: "Vendors", actions: ["read", "write", "delete"] },
        { key: "vendorInvoices", label: "B2B invoices", actions: ["read", "write", "delete"] }
      ] },
      { group: "Administration", modules: [
        { key: "users", label: "Users", actions: ["read", "write", "delete"] },
        { key: "settings", label: "Settings", actions: ["read", "write"] },
        { key: "roles", label: "Roles & rights", actions: ["read", "write"] }
      ] }
    ];
    const allModules = catalog.flatMap((g) => g.modules);
    const full = () => Object.fromEntries(allModules.map((m) => [m.key, Object.fromEntries(m.actions.map((a) => [a, true]))]));
    const readOnly = () => Object.fromEntries(allModules.map((m) => [m.key, { read: true }]));
    if (!state.rolePermissions) {
      state.rolePermissions = {
        MANAGER: full(), ACCOUNTANT: readOnly(), AGENT: readOnly(), VIEWER: readOnly()
      };
      saveState(state);
    }
    const rp = state.rolePermissions;
    return createResponse({
      catalog,
      actionLabels: { read: "View", write: "Create / Edit", delete: "Delete" },
      roles: ["ADMIN", "MANAGER", "ACCOUNTANT", "AGENT", "VIEWER"].map((role) => ({
        role,
        system: true,
        editable: role !== "ADMIN",
        permissions: role === "ADMIN" ? full() : (rp[role] || readOnly())
      }))
    });
  }
  if (/^\/roles\/[A-Z]+$/.test(route) && method === "put") {
    const role = route.split("/")[2];
    state.rolePermissions = state.rolePermissions || {};
    state.rolePermissions[role] = payload.permissions || {};
    saveState(state);
    return createResponse({ role, permissions: state.rolePermissions[role] });
  }
  if (/^\/roles\/[A-Z]+\/reset$/.test(route) && method === "post") {
    const role = route.split("/")[2];
    return createResponse({ role, permissions: state.rolePermissions?.[role] || {} });
  }

  if (route === "/settings" && method === "get") {
    return createResponse(state.settings);
  }
  if (route === "/settings" && method === "put") {
    state.settings = { ...state.settings, ...payload, updatedAt: new Date().toISOString() };
    saveState(state);
    return createResponse(state.settings);
  }
  if (route === "/settings/logo" && method === "post") {
    // Logo upload is a no-op in demo mode but return success so UI updates.
    state.settings = { ...state.settings, logoFileName: "demo-logo.png", logoUrl: null, updatedAt: new Date().toISOString() };
    saveState(state);
    return createResponse(state.settings);
  }
  if (route === "/settings/logo" && method === "delete") {
    state.settings = { ...state.settings, logoFileName: null, logoUrl: null, updatedAt: new Date().toISOString() };
    saveState(state);
    return createResponse(state.settings);
  }

  /* ===================== Users ===================== */
  if (route === "/users" && method === "get") {
    const sanitized = state.users.map(({ password, ...rest }) => rest); // eslint-disable-line no-unused-vars
    return createResponse({ items: sanitized });
  }
  if (route === "/users" && method === "post") {
    const next = {
      id: (state.users[state.users.length - 1]?.id || 0) + 1,
      email: payload.email,
      password: payload.password || "ChangeMe@123",
      fullName: payload.fullName || "",
      phone: payload.phone || "",
      role: payload.role || "AGENT",
      isActive: payload.isActive ?? true,
      permissions: payload.permissions ?? null,
      lastLoginAt: null,
      createdAt: new Date().toISOString()
    };
    state.users.push(next);
    saveState(state);
    const { password, ...rest } = next; // eslint-disable-line no-unused-vars
    return createResponse(rest);
  }
  if (/^\/users\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    state.users = state.users.map((u) => {
      if (u.id !== id) return u;
      const merged = { ...u, ...payload };
      if (!payload.password) merged.password = u.password;
      return merged;
    });
    saveState(state);
    const updated = state.users.find((u) => u.id === id);
    const { password, ...rest } = updated || {}; // eslint-disable-line no-unused-vars
    return createResponse(rest);
  }
  if (/^\/users\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.users = state.users.filter((u) => u.id !== id);
    saveState(state);
    return createResponse({ message: "User deleted" });
  }

  /* ===================== Vendors ===================== */
  if (route === "/vendors" && method === "get") {
    return createResponse({ items: state.vendors });
  }
  if (route === "/vendors" && method === "post") {
    const next = {
      id: (state.vendors[state.vendors.length - 1]?.id || 0) + 1,
      name: payload.name,
      type: payload.type || "B2B",
      contactName: payload.contactName || "",
      email: payload.email || "",
      phone: payload.phone || "",
      address: payload.address || "",
      city: payload.city || "",
      state: payload.state || "",
      country: payload.country || "",
      postalCode: payload.postalCode || "",
      gstin: payload.gstin || "",
      pan: payload.pan || "",
      openingBalance: Number(payload.openingBalance || 0),
      notes: payload.notes || "",
      isActive: payload.isActive ?? true,
      createdAt: new Date().toISOString()
    };
    state.vendors.push(next);
    saveState(state);
    return createResponse(next);
  }
  if (/^\/vendors\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    state.vendors = state.vendors.map((v) => (v.id === id ? { ...v, ...payload } : v));
    saveState(state);
    return createResponse(state.vendors.find((v) => v.id === id));
  }
  if (/^\/vendors\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.vendors = state.vendors.filter((v) => v.id !== id);
    saveState(state);
    return createResponse({ message: "Vendor deleted" });
  }

  /* ===================== Vendor Invoices ===================== */
  const decorateVendorInvoice = (inv) => {
    const vendor = state.vendors.find((v) => v.id === inv.vendorId);
    const items = state.vendorInvoiceItems.filter((it) => it.vendorInvoiceId === inv.id);
    const payments = state.vendorInvoicePayments
      .filter((p) => p.vendorInvoiceId === inv.id)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    return { ...inv, vendor: vendor || null, items, payments };
  };

  if (route === "/vendor-invoices" && method === "get") {
    return createResponse({ items: state.vendorInvoices.map(decorateVendorInvoice) });
  }
  if (/^\/vendor-invoices\/\d+$/.test(route) && method === "get") {
    const id = Number(route.split("/")[2]);
    const inv = state.vendorInvoices.find((i) => i.id === id);
    return createResponse(inv ? decorateVendorInvoice(inv) : null);
  }
  if (route === "/vendor-invoices" && method === "post") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const subtotal = items.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.quantity || 1), 0);
    const taxAmount = items.reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 1)) * (Number(it.taxRate || 0) / 100), 0);
    const discount = Number(payload.discountAmount || 0);
    const totalAmount = Math.max(subtotal + taxAmount - discount, 0);
    const id = (state.vendorInvoices[state.vendorInvoices.length - 1]?.id || 0) + 1;
    const inv = {
      id,
      invoiceNumber: payload.invoiceNumber || `${state.settings.vendorInvoicePrefix || "B2B"}-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`,
      vendorId: Number(payload.vendorId),
      issueDate: payload.issueDate ? new Date(payload.issueDate).toISOString() : new Date().toISOString(),
      dueDate: payload.dueDate ? new Date(payload.dueDate).toISOString() : null,
      status: payload.status || "DRAFT",
      subtotalAmount: subtotal,
      taxAmount,
      discountAmount: discount,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      currency: payload.currency || "INR",
      notes: payload.notes || "",
      terms: payload.terms || "",
      reference: payload.reference || "",
      showGstin: payload.showGstin ?? true,
      includeBank: payload.includeBank ?? true,
      sentAt: null,
      paidAt: null,
      createdAt: new Date().toISOString()
    };
    state.vendorInvoices.push(inv);
    items.forEach((it, idx) => {
      state.vendorInvoiceItems.push({
        id: state.vendorInvoiceItems.length + 1,
        vendorInvoiceId: id,
        description: it.description || "",
        hsnCode: it.hsnCode || "",
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        taxRate: Number(it.taxRate || 0),
        discountAmount: Number(it.discountAmount || 0),
        taxAmount: (Number(it.unitPrice || 0) * Number(it.quantity || 1)) * (Number(it.taxRate || 0) / 100),
        totalAmount: Number(it.unitPrice || 0) * Number(it.quantity || 1),
        position: idx
      });
    });
    saveState(state);
    return createResponse(decorateVendorInvoice(inv));
  }
  if (/^\/vendor-invoices\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    const existing = state.vendorInvoices.find((i) => i.id === id);
    if (!existing) throw new Error("Vendor invoice not found");
    const items = Array.isArray(payload.items) ? payload.items : null;
    let totals = {
      subtotalAmount: existing.subtotalAmount,
      taxAmount: existing.taxAmount,
      totalAmount: existing.totalAmount
    };
    if (items) {
      const subtotal = items.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.quantity || 1), 0);
      const taxAmount = items.reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 1)) * (Number(it.taxRate || 0) / 100), 0);
      const discount = Number(payload.discountAmount ?? existing.discountAmount ?? 0);
      const total = Math.max(subtotal + taxAmount - discount, 0);
      totals = { subtotalAmount: subtotal, taxAmount, totalAmount: total };
      state.vendorInvoiceItems = state.vendorInvoiceItems.filter((it) => it.vendorInvoiceId !== id);
      items.forEach((it, idx) => {
        state.vendorInvoiceItems.push({
          id: state.vendorInvoiceItems.length + 1,
          vendorInvoiceId: id,
          description: it.description || "",
          hsnCode: it.hsnCode || "",
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice || 0),
          taxRate: Number(it.taxRate || 0),
          discountAmount: Number(it.discountAmount || 0),
          taxAmount: (Number(it.unitPrice || 0) * Number(it.quantity || 1)) * (Number(it.taxRate || 0) / 100),
          totalAmount: Number(it.unitPrice || 0) * Number(it.quantity || 1),
          position: idx
        });
      });
    }
    state.vendorInvoices = state.vendorInvoices.map((i) =>
      i.id === id
        ? {
            ...i,
            ...payload,
            ...totals,
            balanceDue: Math.max(totals.totalAmount - Number(i.paidAmount || 0), 0)
          }
        : i
    );
    saveState(state);
    return createResponse(decorateVendorInvoice(state.vendorInvoices.find((i) => i.id === id)));
  }
  if (/^\/vendor-invoices\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.vendorInvoices = state.vendorInvoices.filter((i) => i.id !== id);
    state.vendorInvoiceItems = state.vendorInvoiceItems.filter((i) => i.vendorInvoiceId !== id);
    state.vendorInvoicePayments = state.vendorInvoicePayments.filter((p) => p.vendorInvoiceId !== id);
    saveState(state);
    return createResponse({ message: "Vendor invoice deleted" });
  }
  if (/^\/vendor-invoices\/\d+\/mark-sent$/.test(route) && method === "patch") {
    const id = Number(route.split("/")[2]);
    state.vendorInvoices = state.vendorInvoices.map((i) => (i.id === id ? { ...i, status: "SENT", sentAt: new Date().toISOString() } : i));
    saveState(state);
    return createResponse(decorateVendorInvoice(state.vendorInvoices.find((i) => i.id === id)));
  }
  if (/^\/vendor-invoices\/\d+\/cancel$/.test(route) && method === "patch") {
    const id = Number(route.split("/")[2]);
    state.vendorInvoices = state.vendorInvoices.map((i) => (i.id === id ? { ...i, status: "CANCELLED" } : i));
    saveState(state);
    return createResponse(decorateVendorInvoice(state.vendorInvoices.find((i) => i.id === id)));
  }
  if (/^\/vendor-invoices\/\d+\/duplicate$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const original = state.vendorInvoices.find((i) => i.id === id);
    if (!original) throw new Error("Vendor invoice not found");
    const newId = (state.vendorInvoices[state.vendorInvoices.length - 1]?.id || 0) + 1;
    const dup = {
      ...original,
      id: newId,
      invoiceNumber: `${state.settings.vendorInvoicePrefix || "B2B"}-${new Date().getFullYear()}-${String(newId).padStart(4, "0")}`,
      status: "DRAFT",
      sentAt: null,
      paidAt: null,
      paidAmount: 0,
      balanceDue: original.totalAmount,
      createdAt: new Date().toISOString()
    };
    state.vendorInvoices.push(dup);
    const originalItems = state.vendorInvoiceItems.filter((it) => it.vendorInvoiceId === id);
    originalItems.forEach((it) => {
      state.vendorInvoiceItems.push({ ...it, id: state.vendorInvoiceItems.length + 1, vendorInvoiceId: newId });
    });
    saveState(state);
    return createResponse(decorateVendorInvoice(dup));
  }
  if (/^\/vendor-invoices\/\d+\/payments$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const inv = state.vendorInvoices.find((i) => i.id === id);
    if (!inv) throw new Error("Vendor invoice not found");
    const amount = Number(payload.amount || 0);
    const payment = {
      id: state.vendorInvoicePayments.length + 1,
      vendorInvoiceId: id,
      amount,
      paymentDate: stampDateWithNow(payload.paymentDate),
      method: payload.method || "Bank Transfer",
      note: payload.note || ""
    };
    state.vendorInvoicePayments.push(payment);
    inv.paidAmount = Number(inv.paidAmount || 0) + amount;
    inv.balanceDue = Math.max(Number(inv.totalAmount || 0) - inv.paidAmount, 0);
    if (inv.paidAmount >= Number(inv.totalAmount || 0)) {
      inv.status = "PAID";
      inv.paidAt = new Date().toISOString();
    }
    saveState(state);
    return createResponse(decorateVendorInvoice(inv));
  }
  if (/^\/vendor-invoices\/\d+\/pdf/.test(route) && method === "get") {
    const id = Number(route.split("/")[2].split("?")[0]);
    const inv = state.vendorInvoices.find((i) => i.id === id);
    const vendor = state.vendors.find((v) => v.id === inv?.vendorId);
    const items = inv ? state.vendorInvoiceItems.filter((it) => it.vendorInvoiceId === inv.id) : [];
    const lines = items.map((it) => ({
      description: it.description,
      hsn: it.hsnCode || "",
      qty: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
      total: Number(it.unitPrice || 0) * Number(it.quantity || 0)
    }));
    const html = buildInvoiceHtml({
      title: "B2B Invoice",
      settings: state.settings,
      invoiceNumber: inv?.invoiceNumber || "",
      invoiceDate: inv?.issueDate || new Date().toISOString(),
      refLabel: "Vendor",
      refValue: vendor?.name || "",
      customer: vendor ? { fullName: vendor.name, phone: vendor.phone, email: vendor.email, address: [vendor.address, vendor.city, vendor.state].filter(Boolean).join(", ") } : {},
      lines,
      subtotal: Number(inv?.subtotalAmount || 0),
      discountAmount: Number(inv?.discountAmount || 0),
      taxAmount: Number(inv?.taxAmount || 0),
      totalAmount: Number(inv?.totalAmount || 0),
      paidAmount: Number(inv?.paidAmount || 0),
      balanceDue: Number(inv?.balanceDue || 0),
      showGstin: inv?.showGstin !== false,
      includeBank: inv?.includeBank !== false,
      notes: inv?.notes || ""
    });
    return createBlobResponse(html, "text/html");
  }

  /* ===================== Ticket Sales ===================== */
  const decorateTicketSale = (s) => {
    const customer = state.customers.find((c) => c.id === s.customerId);
    const payments = state.ticketSalePayments
      .filter((p) => p.ticketSaleId === s.id)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    const totalAmount = Number(s.totalAmount || 0);
    const costPrice = Number(s.costPrice || 0);
    const margin = totalAmount - costPrice;
    return { ...s, customer: customer || null, payments, margin };
  };

  const computeTicketSaleTotals = (payload, existing = {}) => {
    const sellingPrice = Number(payload.sellingPrice ?? existing.sellingPrice ?? 0);
    const serviceFee = Number(payload.serviceFee ?? existing.serviceFee ?? 0);
    const discountAmount = Number(payload.discountAmount ?? existing.discountAmount ?? 0);
    const totalAmount = Math.max(sellingPrice + serviceFee - discountAmount, 0);
    return { sellingPrice, serviceFee, discountAmount, totalAmount };
  };

  if (route === "/ticket-sales" && method === "get") {
    return createResponse({ items: state.ticketSales.map(decorateTicketSale) });
  }
  if (/^\/ticket-sales\/\d+$/.test(route) && method === "get") {
    const id = Number(route.split("/")[2]);
    const sale = state.ticketSales.find((s) => s.id === id);
    return createResponse(sale ? decorateTicketSale(sale) : null);
  }
  if (route === "/ticket-sales" && method === "post") {
    const id = (state.ticketSales[state.ticketSales.length - 1]?.id || 0) + 1;
    const totals = computeTicketSaleTotals(payload);
    const sale = {
      id,
      saleCode: `${state.settings.ticketSalePrefix || "TKT"}-${String(id).padStart(5, "0")}`,
      customerId: Number(payload.customerId),
      ticketType: payload.ticketType || "FLIGHT",
      vendor: payload.vendor || "",
      reference: payload.reference || "",
      fromLocation: payload.fromLocation || "",
      toLocation: payload.toLocation || "",
      departAt: payload.departAt ? new Date(payload.departAt).toISOString() : null,
      returnAt: payload.returnAt ? new Date(payload.returnAt).toISOString() : null,
      passengers: Number(payload.passengers || 1),
      costPrice: Number(payload.costPrice || 0),
      ...totals,
      paidAmount: 0,
      balanceDue: totals.totalAmount,
      paymentStatus: "PENDING",
      status: payload.status || "BOOKED",
      supplierName: payload.supplierName || "",
      supplierPaid: payload.supplierPaid ?? false,
      supplierPaidDate: null,
      invoiceNumber: null,
      invoicedAt: null,
      note: payload.note || "",
      attachments: [],
      createdAt: new Date().toISOString()
    };
    state.ticketSales.unshift(sale);
    saveState(state);
    return createResponse(decorateTicketSale(sale));
  }
  if (/^\/ticket-sales\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    const existing = state.ticketSales.find((s) => s.id === id);
    if (!existing) throw new Error("Ticket sale not found");
    const totals = computeTicketSaleTotals(payload, existing);
    const updated = {
      ...existing,
      ...payload,
      ...totals,
      customerId: Number(payload.customerId || existing.customerId),
      passengers: Number(payload.passengers || existing.passengers || 1),
      costPrice: Number(payload.costPrice ?? existing.costPrice ?? 0),
      departAt: payload.departAt ? new Date(payload.departAt).toISOString() : existing.departAt,
      returnAt: payload.returnAt ? new Date(payload.returnAt).toISOString() : existing.returnAt,
      balanceDue: Math.max(totals.totalAmount - Number(existing.paidAmount || 0), 0)
    };
    updated.paymentStatus =
      Number(existing.paidAmount || 0) >= totals.totalAmount
        ? "PAID"
        : Number(existing.paidAmount || 0) > 0
          ? "PARTIAL"
          : "PENDING";
    state.ticketSales = state.ticketSales.map((s) => (s.id === id ? updated : s));
    saveState(state);
    return createResponse(decorateTicketSale(updated));
  }
  if (/^\/ticket-sales\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.ticketSales = state.ticketSales.filter((s) => s.id !== id);
    state.ticketSalePayments = state.ticketSalePayments.filter((p) => p.ticketSaleId !== id);
    saveState(state);
    return createResponse({ message: "Ticket sale deleted" });
  }
  if (/^\/ticket-sales\/\d+\/mark-supplier-paid$/.test(route) && method === "patch") {
    const id = Number(route.split("/")[2]);
    state.ticketSales = state.ticketSales.map((s) =>
      s.id === id ? { ...s, supplierPaid: true, supplierPaidDate: new Date().toISOString() } : s
    );
    saveState(state);
    return createResponse(decorateTicketSale(state.ticketSales.find((s) => s.id === id)));
  }
  if (/^\/ticket-sales\/\d+\/payments$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const sale = state.ticketSales.find((s) => s.id === id);
    if (!sale) throw new Error("Ticket sale not found");
    const amount = Number(payload.amount || 0);
    const payment = {
      id: state.ticketSalePayments.length + 1,
      ticketSaleId: id,
      amount,
      paymentDate: stampDateWithNow(payload.paymentDate),
      method: payload.method || "Cash",
      note: payload.note || ""
    };
    state.ticketSalePayments.push(payment);
    sale.paidAmount = Number(sale.paidAmount || 0) + amount;
    sale.balanceDue = Math.max(Number(sale.totalAmount || 0) - sale.paidAmount, 0);
    sale.paymentStatus =
      sale.paidAmount === 0 ? "PENDING" : sale.paidAmount >= Number(sale.totalAmount || 0) ? "PAID" : "PARTIAL";
    saveState(state);
    return createResponse(decorateTicketSale(sale));
  }
  if (/^\/ticket-sales\/\d+\/payments\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const saleId = Number(parts[2]);
    const paymentId = Number(parts[4]);
    const sale = state.ticketSales.find((s) => s.id === saleId);
    const payment = state.ticketSalePayments.find((p) => p.id === paymentId && p.ticketSaleId === saleId);
    if (sale && payment) {
      sale.paidAmount = Math.max(Number(sale.paidAmount || 0) - Number(payment.amount || 0), 0);
      sale.balanceDue = Math.max(Number(sale.totalAmount || 0) - sale.paidAmount, 0);
      sale.paymentStatus =
        sale.paidAmount === 0 ? "PENDING" : sale.paidAmount >= Number(sale.totalAmount || 0) ? "PAID" : "PARTIAL";
      state.ticketSalePayments = state.ticketSalePayments.filter((p) => p.id !== paymentId);
      saveState(state);
    }
    return createResponse(sale ? decorateTicketSale(sale) : { message: "Payment removed" });
  }
  if (/^\/ticket-sales\/\d+\/attachments$/.test(route) && method === "post") {
    // Demo mode does not persist files — return the sale unchanged.
    const id = Number(route.split("/")[2]);
    const sale = state.ticketSales.find((s) => s.id === id);
    return createResponse(sale ? decorateTicketSale(sale) : { attachments: [] });
  }
  if (/^\/ticket-sales\/\d+\/attachments\/\d+$/.test(route) && (method === "delete" || method === "get")) {
    if (method === "get") {
      return createBlobResponse("Demo attachment placeholder", "application/octet-stream");
    }
    return createResponse({ message: "Attachment removed", attachments: [] });
  }
  if (/^\/ticket-sales\/\d+\/invoice\/pdf/.test(route) && method === "get") {
    const id = Number(route.split("/")[2]);
    const sale = state.ticketSales.find((s) => s.id === id);
    const customer = state.customers.find((c) => c.id === sale?.customerId);
    if (sale && !sale.invoiceNumber) {
      sale.invoiceNumber = `${state.settings.invoicePrefix || "OGH"}-${new Date().getFullYear()}-${String(sale.id).padStart(4, "0")}`;
      sale.invoicedAt = new Date().toISOString();
      saveState(state);
    }
    const lines = [];
    const sellingPrice = Number(sale?.sellingPrice || 0);
    if (sellingPrice > 0) lines.push({
      description: `${sale.ticketType || "TICKET"}${sale.vendor ? " — " + sale.vendor : ""}${sale.reference ? " (" + sale.reference + ")" : ""}${(sale.fromLocation || sale.toLocation) ? ` · ${sale.fromLocation || "?"} → ${sale.toLocation || "?"}` : ""}`,
      qty: Number(sale.passengers || 1),
      unitPrice: sellingPrice / Math.max(Number(sale.passengers || 1), 1),
      total: sellingPrice,
      isFare: true
    });
    const serviceFee = Number(sale?.serviceFee || 0);
    if (serviceFee > 0) lines.push({ description: "Service fee", qty: 1, unitPrice: serviceFee, total: serviceFee });
    const html = buildInvoiceHtml({
      title: "Tax Invoice",
      settings: state.settings,
      invoiceNumber: sale?.invoiceNumber || "",
      invoiceDate: sale?.invoicedAt || new Date().toISOString(),
      refLabel: "Sale",
      refValue: sale?.saleCode || "",
      customer: customer || {},
      lines,
      subtotal: sellingPrice + serviceFee,
      discountAmount: Number(sale?.discountAmount || 0),
      taxAmount: Number(params.taxRate || 0) > 0 ? (Number(sale?.totalAmount || 0) * Number(params.taxRate) / 100) : 0,
      totalAmount: Number(sale?.totalAmount || 0),
      paidAmount: Number(sale?.paidAmount || 0),
      balanceDue: Number(sale?.balanceDue || 0),
      showGstin: params.showGstin !== "0",
      includeBank: params.includeBank !== "0",
      notes: params.notes || ""
    });
    return createBlobResponse(html, "text/html");
  }

  /* ===================== Ledger ===================== */
  if (route === "/ledger/report" && method === "get") {
    const monthParam = String(params.month || new Date().toISOString().slice(0, 7));
    const inMonth = (d) => d && new Date(d).toISOString().slice(0, 7) === monthParam;

    const rows = [];
    // Manual entries
    state.ledger.filter((e) => inMonth(e.txDate)).forEach((e) => {
      rows.push({ ...e, id: `m-${e.id}`, sourceType: "Manual" });
    });
    // Auto: booking payments → INCOME
    state.payments.filter((p) => inMonth(p.paymentDate)).forEach((p) => {
      const booking = state.bookings.find((b) => b.id === p.bookingId);
      const customer = booking ? state.customers.find((c) => c.id === booking.customerId) : null;
      rows.push({
        id: `bp-${p.id}`,
        kind: "INCOME",
        category: "Booking Payment",
        party: customer?.fullName || "",
        amount: Number(p.amount || 0),
        txDate: p.paymentDate,
        paymentMethod: p.method,
        reference: booking?.bookingCode || "",
        notes: p.note || "",
        sourceType: "Booking"
      });
    });
    // Auto: ticket-sale payments → INCOME
    state.ticketSalePayments.filter((p) => inMonth(p.paymentDate)).forEach((p) => {
      const sale = state.ticketSales.find((s) => s.id === p.ticketSaleId);
      const customer = sale ? state.customers.find((c) => c.id === sale.customerId) : null;
      rows.push({
        id: `tp-${p.id}`,
        kind: "INCOME",
        category: "Ticket Sale Payment",
        party: customer?.fullName || "",
        amount: Number(p.amount || 0),
        txDate: p.paymentDate,
        paymentMethod: p.method,
        reference: sale?.saleCode || "",
        notes: p.note || "",
        sourceType: "TicketSale"
      });
    });
    // Auto: B2B payments received → INCOME
    state.vendorInvoicePayments.filter((p) => inMonth(p.paymentDate)).forEach((p) => {
      const inv = state.vendorInvoices.find((i) => i.id === p.vendorInvoiceId);
      const vendor = inv ? state.vendors.find((v) => v.id === inv.vendorId) : null;
      rows.push({
        id: `vp-${p.id}`,
        kind: "INCOME",
        category: "B2B Invoice Payment",
        party: vendor?.name || "",
        amount: Number(p.amount || 0),
        txDate: p.paymentDate,
        paymentMethod: p.method,
        reference: inv?.invoiceNumber || "",
        notes: p.note || "",
        sourceType: "VendorInvoice"
      });
    });

    const summary = rows.reduce(
      (acc, r) => {
        if (r.kind === "INCOME") acc.income += Number(r.amount || 0);
        else acc.expense += Number(r.amount || 0);
        return acc;
      },
      { income: 0, expense: 0, net: 0 }
    );
    summary.net = summary.income - summary.expense;

    const byCatMap = new Map();
    rows.forEach((r) => {
      const key = `${r.kind}::${r.category}`;
      const cur = byCatMap.get(key) || { kind: r.kind, category: r.category, total: 0, count: 0 };
      cur.total += Number(r.amount || 0);
      cur.count += 1;
      byCatMap.set(key, cur);
    });

    return createResponse({
      month: monthParam,
      summary,
      rows,
      byCategory: Array.from(byCatMap.values()).sort((a, b) => b.total - a.total)
    });
  }
  if (route === "/ledger/export" && method === "get") {
    const monthParam = String(params.month || new Date().toISOString().slice(0, 7));
    const rows = state.ledger.filter((e) => String(e.txDate || "").slice(0, 7) === monthParam);
    const header = "txDate,kind,category,party,amount,paymentMethod,reference,notes";
    const lines = rows.map((r) =>
      [r.txDate, r.kind, r.category, r.party, r.amount, r.paymentMethod, r.reference, r.notes]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    return createBlobResponse([header, ...lines].join("\n"), "text/csv");
  }
  if (route === "/ledger" && method === "post") {
    const id = (state.ledger[state.ledger.length - 1]?.id || 0) + 1;
    const entry = {
      id,
      kind: payload.kind || "INCOME",
      category: payload.category || "Other",
      party: payload.party || "",
      amount: Number(payload.amount || 0),
      txDate: payload.txDate ? new Date(payload.txDate).toISOString() : new Date().toISOString(),
      paymentMethod: payload.paymentMethod || "",
      reference: payload.reference || "",
      notes: payload.notes || "",
      sourceType: "Manual",
      createdAt: new Date().toISOString()
    };
    state.ledger.push(entry);
    saveState(state);
    return createResponse(entry);
  }
  if (/^\/ledger\/\d+$/.test(route) && method === "put") {
    const id = Number(route.split("/")[2]);
    state.ledger = state.ledger.map((e) => (e.id === id ? { ...e, ...payload, amount: Number(payload.amount ?? e.amount) } : e));
    saveState(state);
    return createResponse(state.ledger.find((e) => e.id === id));
  }
  if (/^\/ledger\/\d+$/.test(route) && method === "delete") {
    const id = Number(route.split("/")[2]);
    state.ledger = state.ledger.filter((e) => e.id !== id);
    saveState(state);
    return createResponse({ message: "Entry deleted" });
  }

  /* ===================== Customer Detail (GET) ===================== */
  if (/^\/customers\/\d+$/.test(route) && method === "get") {
    const id = Number(route.split("/")[2]);
    const customer = state.customers.find((c) => c.id === id);
    return createResponse(customer || null);
  }

  /* ===================== Booking sub-resources ===================== */
  const refreshBooking = (id) => {
    const updated = state.bookings.find((b) => b.id === id);
    return updated ? withRelations(state, updated) : null;
  };

  if (/^\/bookings\/\d+\/travellers$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    const arr = booking.travellers || [];
    const nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    arr.unshift({
      id: nextId,
      fullName: payload.fullName,
      age: payload.age ?? null,
      gender: payload.gender ?? null,
      passportNo: payload.passportNo ?? null,
      phone: payload.phone ?? null,
      isPrimary: !!payload.isPrimary,
      note: payload.note ?? null
    });
    booking.travellers = arr;
    saveState(state);
    return createResponse(refreshBooking(id));
  }
  if (/^\/bookings\/\d+\/travellers\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const id = Number(parts[2]);
    const travellerId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === id);
    if (booking) {
      booking.travellers = (booking.travellers || []).filter((t) => t.id !== travellerId);
      saveState(state);
    }
    return createResponse(refreshBooking(id));
  }

  if (/^\/bookings\/\d+\/payouts$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    const arr = booking.payouts || [];
    const nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    arr.unshift({
      id: nextId,
      payeeType: payload.payeeType || "OTHER",
      payeeName: payload.payeeName,
      amount: Number(payload.amount || 0),
      status: payload.status || "PENDING",
      dueDate: payload.dueDate || null,
      paidDate: payload.paidDate || null,
      reference: payload.reference || null,
      note: payload.note || null
    });
    booking.payouts = arr;
    saveState(state);
    return createResponse(refreshBooking(id));
  }
  if (/^\/bookings\/\d+\/payouts\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const id = Number(parts[2]);
    const payoutId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === id);
    if (booking) {
      booking.payouts = (booking.payouts || []).filter((p) => p.id !== payoutId);
      saveState(state);
    }
    return createResponse(refreshBooking(id));
  }
  if (/^\/bookings\/\d+\/payouts\/\d+\/mark-paid$/.test(route) && method === "patch") {
    const parts = route.split("/");
    const id = Number(parts[2]);
    const payoutId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === id);
    if (booking) {
      booking.payouts = (booking.payouts || []).map((p) =>
        p.id === payoutId ? { ...p, status: "PAID", paidDate: new Date().toISOString() } : p
      );
      saveState(state);
    }
    return createResponse(refreshBooking(id));
  }

  if (/^\/bookings\/\d+\/tickets$/.test(route) && method === "post") {
    const id = Number(route.split("/")[2]);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    const arr = booking.tickets || [];
    const nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    arr.unshift({
      id: nextId,
      ticketType: payload.ticketType || "FLIGHT",
      vendor: payload.vendor || null,
      reference: payload.reference || null,
      fromLocation: payload.fromLocation || null,
      toLocation: payload.toLocation || null,
      departAt: payload.departAt || null,
      returnAt: payload.returnAt || null,
      passengers: Number(payload.passengers || 1),
      amount: Number(payload.amount || 0),
      status: payload.status || "BOOKED",
      note: payload.note || null
    });
    booking.tickets = arr;
    saveState(state);
    return createResponse(refreshBooking(id));
  }
  if (/^\/bookings\/\d+\/tickets\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const id = Number(parts[2]);
    const ticketId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === id);
    if (booking) {
      booking.tickets = (booking.tickets || []).filter((t) => t.id !== ticketId);
      saveState(state);
    }
    return createResponse(refreshBooking(id));
  }

  if (/^\/bookings\/\d+\/attachments$/.test(route) && method === "post") {
    // Demo: don't actually store the files. Pretend each file became an attachment record.
    const id = Number(route.split("/")[2]);
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    const arr = booking.attachments || [];
    const fd = config.data instanceof FormData ? config.data : null;
    const filesList = fd ? fd.getAll("files") : [];
    let nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
    filesList.forEach((f) => {
      nextId += 1;
      arr.unshift({
        id: nextId,
        originalName: f.name || "file",
        fileName: `demo-${nextId}-${f.name || "file"}`,
        mimeType: f.type || "application/octet-stream",
        size: f.size || 0,
        uploadedAt: new Date().toISOString()
      });
    });
    booking.attachments = arr;
    saveState(state);
    return createResponse({ ...refreshBooking(id), attachments: arr });
  }
  if (/^\/bookings\/\d+\/attachments\/\d+$/.test(route) && method === "get") {
    return createBlobResponse("Demo attachment placeholder", "application/octet-stream");
  }
  if (/^\/bookings\/\d+\/attachments\/\d+$/.test(route) && method === "delete") {
    const parts = route.split("/");
    const id = Number(parts[2]);
    const attId = Number(parts[4]);
    const booking = state.bookings.find((b) => b.id === id);
    if (booking) {
      booking.attachments = (booking.attachments || []).filter((a) => a.id !== attId);
      saveState(state);
    }
    const updated = refreshBooking(id);
    return createResponse({ ...updated, attachments: updated?.attachments || [] });
  }

  // Reachable only in demo mode when the UI exercises a brand-new endpoint
  // that hasn't been ported into the offline mock yet. Keep the surfaced
  // message friendly; the developer detail goes to the console.
  console.warn(`Mock route not implemented: ${method.toUpperCase()} ${route}`);
  throw new Error("This action isn't available in demo mode.");
}

export const isMockSession = () => Boolean(window.localStorage.getItem(AUTH_KEY));
