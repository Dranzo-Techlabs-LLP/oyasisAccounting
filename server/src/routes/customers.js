import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

const customerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().or(z.literal("")).optional(),
  nationality: z.string().optional(),
  passportNo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const items = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } }
          ]
        }
      : undefined,
    orderBy: { createdAt: "desc" }
  });
  res.json({ items });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          travelPackage: true,
          invoice: true,
          payments: {
            orderBy: { paymentDate: "desc" }
          }
        },
        orderBy: { departureDate: "desc" }
      }
    }
  });

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const bookings = customer.bookings.map((booking) => ({
    ...booking,
    extraCharges: booking.extraCharges || [],
    subtotalAmount: toNumber(booking.subtotalAmount),
    discountValue: toNumber(booking.discountValue),
    discountAmount: toNumber(booking.discountAmount),
    totalAmount: toNumber(booking.totalAmount),
    paidAmount: toNumber(booking.paidAmount),
    balanceDue: toNumber(booking.balanceDue),
    travelPackage: {
      ...booking.travelPackage,
      priceAdult: toNumber(booking.travelPackage.priceAdult),
      priceChild: toNumber(booking.travelPackage.priceChild)
    },
    payments: booking.payments.map((payment) => ({
      ...payment,
      amount: toNumber(payment.amount)
    }))
  }));

  const summary = bookings.reduce(
    (acc, booking) => {
      acc.totalBookings += 1;
      acc.totalRevenue += booking.totalAmount;
      acc.totalCollected += booking.paidAmount;
      acc.outstandingAmount += booking.balanceDue;
      return acc;
    },
    {
      totalBookings: 0,
      totalRevenue: 0,
      totalCollected: 0,
      outstandingAmount: 0
    }
  );

  res.json({
    customer: {
      ...customer,
      bookings: undefined
    },
    summary,
    bookings
  });
});

router.post("/", async (req, res) => {
  const data = customerSchema.parse(req.body);
  const created = await prisma.customer.create({
    data: {
      ...data,
      email: data.email || null,
      nationality: data.nationality || null,
      passportNo: data.passportNo || null,
      address: data.address || null,
      notes: data.notes || null
    }
  });
  res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = customerSchema.parse(req.body);
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      nationality: data.nationality || null,
      passportNo: data.passportNo || null,
      address: data.address || null,
      notes: data.notes || null
    }
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.customer.delete({ where: { id } });
  res.json({ message: "Customer deleted" });
});

export default router;
