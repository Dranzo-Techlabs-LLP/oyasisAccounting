import { BookingStatus, Prisma } from "@prisma/client";
import dayjs from "dayjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

router.get("/summary", async (_req, res) => {
  const monthStart = dayjs().startOf("month").toDate();
  const monthEnd = dayjs().endOf("month").toDate();
  const nextWeek = dayjs().add(7, "day").endOf("day").toDate();
  const sixMonthsStart = dayjs().subtract(5, "month").startOf("month").toDate();

  const [
    bookingsThisMonth,
    revenueThisMonthAgg,
    pendingAgg,
    upcomingCount,
    recentBookings,
    allBookings,
    ticketSalesThisMonth,
    ticketRevenueAgg,
    ticketPendingAgg,
    ticketMarginAgg
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.booking.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true }
    }),
    prisma.booking.aggregate({ _sum: { balanceDue: true } }),
    prisma.booking.count({
      where: { departureDate: { gte: dayjs().startOf("day").toDate(), lte: nextWeek } }
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { customer: true, travelPackage: true }
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: sixMonthsStart } },
      include: { travelPackage: true }
    }),
    prisma.ticketSale.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.ticketSale.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true, costPrice: true }
    }),
    prisma.ticketSale.aggregate({ _sum: { balanceDue: true } }),
    prisma.ticketSale.aggregate({
      _sum: { totalAmount: true, costPrice: true }
    })
  ]);

  const [payoutAggAll, payoutAggPending, supplierPendingTicketsAgg] = await Promise.all([
    prisma.bookingPayout.aggregate({ _sum: { amount: true } }),
    prisma.bookingPayout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
    prisma.ticketSale.aggregate({ where: { supplierPaid: false }, _sum: { costPrice: true } })
  ]);

  const revenueByMonthMap = new Map();
  const statusCounts = {
    [BookingStatus.CONFIRMED]: 0,
    [BookingStatus.TENTATIVE]: 0,
    [BookingStatus.CANCELLED]: 0,
    [BookingStatus.COMPLETED]: 0
  };
  const packageCounts = new Map();

  allBookings.forEach((booking) => {
    const month = dayjs(booking.createdAt).format("MMM YY");
    revenueByMonthMap.set(month, (revenueByMonthMap.get(month) || 0) + toNumber(booking.totalAmount));
    statusCounts[booking.bookingStatus] += 1;
    packageCounts.set(
      booking.travelPackage.name,
      (packageCounts.get(booking.travelPackage.name) || 0) + 1
    );
  });

  const revenueByMonth = Array.from(revenueByMonthMap.entries()).map(([month, revenue]) => ({
    month,
    revenue
  }));

  const bookingStatuses = Object.entries(statusCounts).map(([status, value]) => ({
    status,
    value
  }));

  const topPackages = Array.from(packageCounts.entries())
    .map(([name, bookings]) => ({ name, bookings }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const ticketRevenueMonth = toNumber(ticketRevenueAgg._sum.totalAmount);
  const ticketMarginAll = toNumber(ticketMarginAgg._sum.totalAmount) - toNumber(ticketMarginAgg._sum.costPrice);
  const bookingRevenueMonth = toNumber(revenueThisMonthAgg._sum.totalAmount);
  const bookingPending = toNumber(pendingAgg._sum.balanceDue);
  const ticketPending = toNumber(ticketPendingAgg._sum.balanceDue);
  const payoutsAll = toNumber(payoutAggAll._sum.amount);
  const payoutsPending = toNumber(payoutAggPending._sum.amount);
  const supplierTicketPending = toNumber(supplierPendingTicketsAgg._sum.costPrice);

  res.json({
    kpis: {
      bookingsThisMonth,
      revenueThisMonth: bookingRevenueMonth,
      pendingPayments: bookingPending,
      upcomingDepartures: upcomingCount,
      ticketSalesThisMonth,
      ticketRevenueThisMonth: ticketRevenueMonth,
      ticketPending,
      ticketMargin: ticketMarginAll,
      // combined
      totalRevenueThisMonth: bookingRevenueMonth + ticketRevenueMonth,
      totalCustomerPending: bookingPending + ticketPending,
      supplierPayoutsAll: payoutsAll,
      supplierPayoutsPending: payoutsPending + supplierTicketPending
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
