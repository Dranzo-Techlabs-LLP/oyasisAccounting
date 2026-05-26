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

const withRelations = (state, booking) => ({
  ...booking,
  customer: state.customers.find((item) => item.id === booking.customerId),
  travelPackage: state.packages.find((item) => item.id === booking.packageId),
  payments: state.payments.filter((item) => item.bookingId === booking.id).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
  invoice: state.invoices.find((item) => item.bookingId === booking.id) || null
});

const createResponse = (data) => Promise.resolve({ data });

const createBlobResponse = (text, contentType = "application/octet-stream") =>
  Promise.resolve({ data: new Blob([text], { type: contentType }) });

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
    const adultTotal = selectedPackage.priceAdult * payload.adults;
    const childTotal = selectedPackage.priceChild * payload.children;
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
    const nextBooking = {
      id: state.bookings.length + 1,
      bookingCode: `BK-${String(state.bookings.length + 1).padStart(5, "0")}`,
      customerId,
      packageId: payload.packageId,
      departureDate: new Date(payload.departureDate).toISOString(),
      adults: payload.adults,
      children: payload.children,
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
      createdAt: new Date().toISOString()
    };
    state.bookings.unshift(nextBooking);
    if (paidAmount > 0) {
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
    const adultRate =
      payload.adultPriceOverride != null
        ? Number(payload.adultPriceOverride)
        : Number(selectedPackage?.priceAdult || 0);
    const childRate =
      payload.childPriceOverride != null
        ? Number(payload.childPriceOverride)
        : Number(selectedPackage?.priceChild || 0);
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

    // Apply any "new" installments that came along with the edit
    const newInstallments = Array.isArray(payload.payments) ? payload.payments : [];
    let addedPaid = 0;
    for (const p of newInstallments) {
      const amount = Number(p.amount || 0);
      if (amount <= 0) continue;
      addedPaid += amount;
      state.payments.unshift({
        id: state.payments.length + 1,
        bookingId: id,
        amount,
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : new Date().toISOString(),
        method: p.method || "Cash",
        note: p.note || ""
      });
    }

    // Append new travellers / payouts / tickets if provided
    const appendList = (key, items, factory) => {
      if (!Array.isArray(items) || items.length === 0) return;
      const arr = Array.isArray(existing[key]) ? existing[key] : [];
      let nextId = arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
      for (const it of items) {
        nextId += 1;
        arr.unshift(factory({ ...it, id: nextId }));
      }
      existing[key] = arr;
    };
    appendList("travellers", payload.travellers, (t) => ({
      id: t.id,
      fullName: t.fullName,
      age: t.age ?? null,
      gender: t.gender ?? null,
      passportNo: t.passportNo ?? null,
      phone: t.phone ?? null,
      isPrimary: !!t.isPrimary,
      note: t.note ?? null
    }));
    appendList("payouts", payload.payouts, (p) => ({
      id: p.id,
      payeeType: p.payeeType || "OTHER",
      payeeName: p.payeeName,
      amount: Number(p.amount || 0),
      status: p.status || "PENDING",
      dueDate: p.dueDate || null,
      paidDate: p.paidDate || null,
      reference: p.reference || null,
      note: p.note || null
    }));
    appendList("tickets", payload.tickets, (t) => ({
      id: t.id,
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

    const paidAmount = Number(existing.paidAmount || 0) + addedPaid;
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
      adultPriceOverride: payload.adultPriceOverride ?? null,
      childPriceOverride: payload.childPriceOverride ?? null,
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
      paymentDate: new Date(payload.paymentDate).toISOString(),
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

  if (/^\/invoices\/\d+\/pdf$/.test(route) && method === "get") {
    const bookingId = Number(route.split("/")[2]);
    const booking = withRelations(state, state.bookings.find((item) => item.id === bookingId));
    const text = [
      "OasisGo Holidays Invoice",
      booking.invoice?.invoiceNumber || `OGH-2026-${String(bookingId).padStart(4, "0")}`,
      booking.customer.fullName,
      booking.travelPackage.name,
      `Total: INR ${booking.totalAmount}`,
      `Paid: INR ${booking.paidAmount}`,
      `Balance: INR ${booking.balanceDue}`
    ].join("\n");
    return createBlobResponse(text, "application/pdf");
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
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate).toISOString() : new Date().toISOString(),
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
    const text = [
      `${state.settings.businessName} – Vendor Invoice`,
      `Invoice: ${inv?.invoiceNumber || ""}`,
      `Vendor: ${vendor?.name || ""}`,
      `Total: INR ${inv?.totalAmount || 0}`,
      `Paid: INR ${inv?.paidAmount || 0}`,
      `Balance: INR ${inv?.balanceDue || 0}`
    ].join("\n");
    return createBlobResponse(text, "application/pdf");
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
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate).toISOString() : new Date().toISOString(),
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
    const text = [
      `${state.settings.businessName} – Ticket Sale Invoice`,
      `Sale: ${sale?.saleCode || ""}`,
      `Invoice: ${sale?.invoiceNumber || ""}`,
      `Customer: ${customer?.fullName || ""}`,
      `Total: INR ${sale?.totalAmount || 0}`,
      `Paid: INR ${sale?.paidAmount || 0}`,
      `Balance: INR ${sale?.balanceDue || 0}`
    ].join("\n");
    return createBlobResponse(text, "application/pdf");
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

  throw new Error(`Mock route not implemented: ${method.toUpperCase()} ${route}`);
}

export const isMockSession = () => Boolean(window.localStorage.getItem(AUTH_KEY));
