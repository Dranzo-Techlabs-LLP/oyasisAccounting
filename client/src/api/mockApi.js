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

const readState = () => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    return JSON.parse(raw);
  }
  const seeded = createSeedState();
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
  return state.bookings
    .map((item) => withRelations(state, item))
    .filter((item) => {
      const matchesQuery =
        !q ||
        item.bookingCode.toLowerCase().includes(q) ||
        item.customer.fullName.toLowerCase().includes(q) ||
        item.travelPackage.name.toLowerCase().includes(q);
      const matchesStatus = !status || item.bookingStatus === status;
      return matchesQuery && matchesStatus;
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

  throw new Error(`Mock route not implemented: ${method.toUpperCase()} ${route}`);
}

export const isMockSession = () => Boolean(window.localStorage.getItem(AUTH_KEY));
