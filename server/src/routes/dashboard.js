import { BookingStatus } from "@prisma/client";
import dayjs from "dayjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

// Resolve the reporting window from the query.
//   ?all=1              -> no date constraint (all time)
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD -> that inclusive span
//   (nothing)          -> the current calendar month (previous default)
// The dashboard filters records by their entry date (createdAt) so "revenue in
// range" means the value of bookings/tickets entered in that period; ledger and
// vendor invoices use their own date columns.
const resolveRange = (query) => {
  if (query.all === "1" || query.all === "true") {
    return { all: true, from: null, to: null, label: "All time" };
  }
  const from = query.from ? dayjs(query.from).startOf("day") : dayjs().startOf("month");
  const to = query.to ? dayjs(query.to).endOf("day") : dayjs().endOf("month");
  return { all: false, from: from.toDate(), to: to.toDate() };
};

router.get("/summary", async (req, res) => {
  const range = resolveRange(req.query);
  // Filter helpers: when "all time", the where-clause fragment is empty.
  const on = (field) => (range.all ? {} : { [field]: { gte: range.from, lte: range.to } });
  const created = on("createdAt");

  const [
    bookingsInRange,
    revenueAgg,
    pendingAgg,
    departuresInRange,
    recentBookings,
    rangeBookings,
    ticketSalesInRange,
    ticketRevenueAgg,
    ticketPendingAgg,
    ticketMarginAgg
  ] = await Promise.all([
    prisma.booking.count({ where: { ...created } }),
    prisma.booking.aggregate({ where: { ...created }, _sum: { totalAmount: true } }),
    // Outstanding customer balance for bookings entered in the range.
    prisma.booking.aggregate({ where: { ...created }, _sum: { balanceDue: true } }),
    // Departures that fall inside the window (by travel date).
    prisma.booking.count({ where: { ...on("departureDate") } }),
    prisma.booking.findMany({
      where: { ...created },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { customer: true, travelPackage: true }
    }),
    prisma.booking.findMany({
      where: { ...created },
      include: { travelPackage: true }
    }),
    prisma.ticketSale.count({ where: { ...created } }),
    prisma.ticketSale.aggregate({ where: { ...created }, _sum: { totalAmount: true, costPrice: true } }),
    prisma.ticketSale.aggregate({ where: { ...created }, _sum: { balanceDue: true } }),
    prisma.ticketSale.aggregate({ where: { ...created }, _sum: { totalAmount: true, costPrice: true } })
  ]);

  const [
    payoutAggAll,
    payoutAggPending,
    supplierPendingTicketsAgg,
    vendorInvoiceAgg,
    vendorInvoicePendingAgg,
    ledgerAgg
  ] = await Promise.all([
    prisma.bookingPayout.aggregate({ where: { ...created }, _sum: { amount: true } }),
    prisma.bookingPayout.aggregate({ where: { status: "PENDING", ...created }, _sum: { amount: true } }),
    prisma.ticketSale.aggregate({ where: { supplierPaid: false, ...created }, _sum: { costPrice: true } }),
    prisma.vendorInvoice.aggregate({ where: { ...created }, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.vendorInvoice.aggregate({
      where: { status: { in: ["SENT", "OVERDUE", "DRAFT"] }, ...created },
      _sum: { balanceDue: true }
    }),
    prisma.ledgerEntry.groupBy({
      by: ["kind"],
      where: { ...on("txDate") },
      _sum: { amount: true }
    })
  ]);

  const manualIncome = toNumber(ledgerAgg.find((r) => r.kind === "INCOME")?._sum?.amount);
  const manualExpense = toNumber(ledgerAgg.find((r) => r.kind === "EXPENSE")?._sum?.amount);

  const revenueByMonthMap = new Map();
  const statusCounts = {
    [BookingStatus.CONFIRMED]: 0,
    [BookingStatus.TENTATIVE]: 0,
    [BookingStatus.CANCELLED]: 0,
    [BookingStatus.COMPLETED]: 0
  };
  const packageCounts = new Map();

  rangeBookings.forEach((booking) => {
    const month = dayjs(booking.createdAt).format("MMM YY");
    revenueByMonthMap.set(month, (revenueByMonthMap.get(month) || 0) + toNumber(booking.totalAmount));
    statusCounts[booking.bookingStatus] += 1;
    packageCounts.set(
      booking.travelPackage.name,
      (packageCounts.get(booking.travelPackage.name) || 0) + 1
    );
  });

  // Order the revenue-by-month buckets chronologically.
  const revenueByMonth = Array.from(revenueByMonthMap.entries())
    .map(([month, revenue]) => ({ month, revenue, _k: dayjs(month, "MMM YY").valueOf() }))
    .sort((a, b) => a._k - b._k)
    .map(({ month, revenue }) => ({ month, revenue }));

  const bookingStatuses = Object.entries(statusCounts).map(([status, value]) => ({ status, value }));

  const topPackages = Array.from(packageCounts.entries())
    .map(([name, bookings]) => ({ name, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const ticketRevenue = toNumber(ticketRevenueAgg._sum.totalAmount);
  const ticketMargin = toNumber(ticketMarginAgg._sum.totalAmount) - toNumber(ticketMarginAgg._sum.costPrice);
  const bookingRevenue = toNumber(revenueAgg._sum.totalAmount);
  const bookingPending = toNumber(pendingAgg._sum.balanceDue);
  const ticketPending = toNumber(ticketPendingAgg._sum.balanceDue);
  const payoutsAll = toNumber(payoutAggAll._sum.amount);
  const payoutsPending = toNumber(payoutAggPending._sum.amount);
  const supplierTicketPending = toNumber(supplierPendingTicketsAgg._sum.costPrice);

  res.json({
    range: {
      all: range.all,
      from: range.from ? dayjs(range.from).format("YYYY-MM-DD") : null,
      to: range.to ? dayjs(range.to).format("YYYY-MM-DD") : null
    },
    kpis: {
      // The keys keep their historical names (…ThisMonth) so nothing else that
      // reads them breaks; they now reflect the SELECTED range.
      bookingsThisMonth: bookingsInRange,
      revenueThisMonth: bookingRevenue,
      pendingPayments: bookingPending,
      upcomingDepartures: departuresInRange,
      ticketSalesThisMonth: ticketSalesInRange,
      ticketRevenueThisMonth: ticketRevenue,
      ticketPending,
      ticketMargin,
      totalRevenueThisMonth: bookingRevenue + ticketRevenue,
      totalCustomerPending: bookingPending + ticketPending,
      supplierPayoutsAll: payoutsAll,
      supplierPayoutsPending: payoutsPending + supplierTicketPending,
      vendorInvoicedThisMonth: toNumber(vendorInvoiceAgg._sum.totalAmount),
      vendorCollectedThisMonth: toNumber(vendorInvoiceAgg._sum.paidAmount),
      vendorOutstanding: toNumber(vendorInvoicePendingAgg._sum.balanceDue),
      ledgerIncomeThisMonth: manualIncome,
      ledgerExpenseThisMonth: manualExpense,
      incomeThisMonth: bookingRevenue + ticketRevenue + manualIncome,
      expenseThisMonth: manualExpense,
      netThisMonth: (bookingRevenue + ticketRevenue + manualIncome) - manualExpense
    },
    recentBookings: recentBookings.map((booking) => ({
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customer.fullName,
      packageName: booking.travelPackage.name,
      destination: booking.travelPackage.destination,
      totalAmount: toNumber(booking.totalAmount),
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      departureDate: booking.departureDate
    })),
    revenueByMonth,
    bookingStatuses,
    topPackages
  });
});

export default router;
