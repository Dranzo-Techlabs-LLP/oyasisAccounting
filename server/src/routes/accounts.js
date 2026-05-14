import dayjs from "dayjs";
import { Router } from "express";
import { stringify } from "csv-stringify/sync";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

const fetchAccountRows = async (month, year) => {
  const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).startOf("month");
  const end = start.endOf("month");

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { createdAt: { gte: start.toDate(), lte: end.toDate() } },
        { invoice: { issuedDate: { gte: start.toDate(), lte: end.toDate() } } }
      ]
    },
    include: { customer: true, travelPackage: true, invoice: true },
    orderBy: { createdAt: "desc" }
  });

  const ticketSales = await prisma.ticketSale.findMany({
    where: { createdAt: { gte: start.toDate(), lte: end.toDate() } },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });

  const bookingSummary = bookings.reduce(
    (acc, b) => {
      acc.totalInvoiced += toNumber(b.totalAmount);
      acc.totalCollected += toNumber(b.paidAmount);
      acc.totalOutstanding += toNumber(b.balanceDue);
      return acc;
    },
    { totalInvoiced: 0, totalCollected: 0, totalOutstanding: 0 }
  );

  const ticketSummary = ticketSales.reduce(
    (acc, s) => {
      const total = toNumber(s.totalAmount);
      const cost = toNumber(s.costPrice);
      acc.totalSales += total;
      acc.totalCollected += toNumber(s.paidAmount);
      acc.totalOutstanding += toNumber(s.balanceDue);
      acc.totalCost += cost;
      acc.totalMargin += total - cost;
      acc.supplierPending += s.supplierPaid ? 0 : cost;
      return acc;
    },
    { totalSales: 0, totalCollected: 0, totalOutstanding: 0, totalCost: 0, totalMargin: 0, supplierPending: 0 }
  );

  // Combined view (legacy `summary` retains booking-only numbers for back-compat)
  const summary = {
    ...bookingSummary,
    totalRevenue: bookingSummary.totalInvoiced + ticketSummary.totalSales,
    totalCollectedAll: bookingSummary.totalCollected + ticketSummary.totalCollected,
    totalOutstandingAll: bookingSummary.totalOutstanding + ticketSummary.totalOutstanding,
    totalMargin: ticketSummary.totalMargin,
    supplierPending: ticketSummary.supplierPending
  };

  return {
    summary,
    bookingSummary,
    ticketSummary,
    invoices: bookings
      .filter((b) => b.invoice)
      .map((b) => ({
        id: b.invoice.id,
        invoiceNumber: b.invoice.invoiceNumber,
        issuedDate: b.invoice.issuedDate,
        sentStatus: b.invoice.sentStatus,
        bookingCode: b.bookingCode,
        customerName: b.customer.fullName,
        packageName: b.travelPackage.name,
        totalAmount: toNumber(b.totalAmount),
        collectedAmount: toNumber(b.paidAmount),
        outstandingAmount: toNumber(b.balanceDue),
        paymentStatus: b.paymentStatus
      })),
    ticketSales: ticketSales.map((s) => ({
      id: s.id,
      saleCode: s.saleCode,
      createdAt: s.createdAt,
      customerName: s.customer.fullName,
      ticketType: s.ticketType,
      vendor: s.vendor,
      reference: s.reference,
      route: `${s.fromLocation || "?"} → ${s.toLocation || "?"}`,
      totalAmount: toNumber(s.totalAmount),
      collectedAmount: toNumber(s.paidAmount),
      outstandingAmount: toNumber(s.balanceDue),
      costPrice: toNumber(s.costPrice),
      margin: toNumber(s.totalAmount) - toNumber(s.costPrice),
      paymentStatus: s.paymentStatus,
      status: s.status,
      supplierPaid: s.supplierPaid
    }))
  };
};

router.get("/summary", async (req, res) => {
  const month = Number(req.query.month || dayjs().month() + 1);
  const year = Number(req.query.year || dayjs().year());
  const data = await fetchAccountRows(month, year);
  res.json({ month, year, ...data });
});

router.get("/export", async (req, res) => {
  const month = Number(req.query.month || dayjs().month() + 1);
  const year = Number(req.query.year || dayjs().year());
  const data = await fetchAccountRows(month, year);
  const csv = stringify(data.invoices, { header: true });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="accounts-${year}-${month}.csv"`);
  res.send(csv);
});

export default router;
