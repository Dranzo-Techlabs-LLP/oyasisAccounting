import dayjs from "dayjs";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

router.get("/", async (req, res) => {
  const monthParam = String(req.query.month || dayjs().format("YYYY-MM"));
  const start = dayjs(`${monthParam}-01`).startOf("month").subtract(7, "day").toDate();
  const end = dayjs(`${monthParam}-01`).endOf("month").add(7, "day").toDate();

  const [bookings, ticketSales] = await Promise.all([
    prisma.booking.findMany({
      where: {
        OR: [
          { departureDate: { gte: start, lte: end } },
          { endDate: { gte: start, lte: end } }
        ]
      },
      include: { customer: true, travelPackage: true },
      orderBy: { departureDate: "asc" }
    }),
    prisma.ticketSale.findMany({
      where: { departAt: { gte: start, lte: end } },
      include: { customer: true },
      orderBy: { departAt: "asc" }
    })
  ]);

  res.json({
    month: monthParam,
    bookings: bookings.map((b) => ({
      id: b.id,
      kind: "booking",
      code: b.bookingCode,
      title: b.travelPackage?.name || "Booking",
      customer: b.customer?.fullName || "",
      destination: b.travelPackage?.destination || "",
      departureDate: b.departureDate,
      endDate: b.endDate,
      amount: toNumber(b.totalAmount),
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      pax: b.adults + b.children
    })),
    ticketSales: ticketSales.map((s) => ({
      id: s.id,
      kind: "ticketSale",
      code: s.saleCode,
      title: `${s.ticketType}: ${s.vendor || "Ticket"}`,
      customer: s.customer?.fullName || "",
      from: s.fromLocation,
      to: s.toLocation,
      departureDate: s.departAt,
      returnDate: s.returnAt,
      amount: toNumber(s.totalAmount),
      ticketType: s.ticketType,
      status: s.status,
      paymentStatus: s.paymentStatus,
      pax: s.passengers
    }))
  });
});

export default router;
