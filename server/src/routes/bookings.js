import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BookingStatus, DiscountType, PaymentStatus, PayeeType, PayoutStatus, TicketType, TicketStatus } from "@prisma/client";
import dayjs from "dayjs";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { computeBookingAmounts } from "../utils/bookingMath.js";
import { nextBookingCode } from "../utils/codeGenerators.js";
import { toNumber } from "../utils/formatters.js";
import { optionalString, optionalEmail, optionalDateString } from "../utils/zodHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String(req.params.id));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

const router = Router();

const extraChargeSchema = z.object({
  label: z.string().min(1),
  amount: z.coerce.number().min(0)
});

const customerInlineSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: optionalEmail,
  nationality: optionalString,
  passportNo: optionalString,
  address: optionalString,
  notes: optionalString
});

const paymentInputSchema = z.object({
  // id lets the booking-edit PUT reconcile kept rows in place instead of
  // delete-and-recreate, so existing payment ids stay stable across saves.
  id: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive(),
  paymentDate: z.string(),
  method: z.string().min(1).default("Cash"),
  note: optionalString
});

const travellerSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  fullName: z.string().min(1),
  age: z.coerce.number().int().min(0).max(120).optional().nullable(),
  gender: optionalString,
  passportNo: optionalString,
  phone: optionalString,
  isPrimary: z.boolean().optional().default(false),
  note: optionalString
});

const payoutSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  payeeType: z.nativeEnum(PayeeType).default("OTHER"),
  payeeName: z.string().min(1),
  amount: z.coerce.number().min(0),
  status: z.nativeEnum(PayoutStatus).default("PENDING"),
  dueDate: optionalDateString,
  paidDate: optionalDateString,
  reference: optionalString,
  note: optionalString
});

const ticketSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  ticketType: z.nativeEnum(TicketType).default("FLIGHT"),
  vendor: optionalString,
  reference: optionalString,
  fromLocation: optionalString,
  toLocation: optionalString,
  departAt: optionalDateString,
  returnAt: optionalDateString,
  passengers: z.coerce.number().int().min(0).default(1),
  amount: z.coerce.number().min(0).default(0),
  status: z.nativeEnum(TicketStatus).default("BOOKED"),
  note: optionalString
});

const bookingSchema = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  customer: customerInlineSchema.optional(),
  packageId: z.coerce.number().int().positive(),
  departureDate: z.string(),
  endDate: optionalDateString,
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0),
  adultPriceOverride: z.union([z.coerce.number().min(0), z.null()]).optional(),
  childPriceOverride: z.union([z.coerce.number().min(0), z.null()]).optional(),
  extraCharges: z.array(extraChargeSchema).default([]),
  discountType: z.nativeEnum(DiscountType).default("NONE"),
  discountValue: z.coerce.number().min(0).default(0),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  amountPaid: z.coerce.number().min(0).default(0),
  payments: z.array(paymentInputSchema).optional(),
  travellers: z.array(travellerSchema).optional(),
  payouts: z.array(payoutSchema).optional(),
  tickets: z.array(ticketSchema).optional(),
  bookingStatus: z.nativeEnum(BookingStatus),
  notes: optionalString
});

const paymentSchema = paymentInputSchema.extend({
  method: z.string().min(1)
});

const bookingInclude = {
  customer: true,
  travelPackage: true,
  payments: { orderBy: [{ paymentDate: "asc" }, { id: "asc" }] },
  travellers: { orderBy: { id: "asc" } },
  payouts: { orderBy: { id: "asc" } },
  tickets: { orderBy: { id: "asc" } },
  attachments: { orderBy: { uploadedAt: "desc" } },
  invoice: true
};

const serializeBooking = (booking) => ({
  ...booking,
  extraCharges: booking.extraCharges || [],
  adults: Number(booking.adults),
  children: Number(booking.children),
  adultPriceOverride: booking.adultPriceOverride != null ? toNumber(booking.adultPriceOverride) : null,
  childPriceOverride: booking.childPriceOverride != null ? toNumber(booking.childPriceOverride) : null,
  subtotalAmount: toNumber(booking.subtotalAmount),
  discountValue: toNumber(booking.discountValue),
  discountAmount: toNumber(booking.discountAmount),
  totalAmount: toNumber(booking.totalAmount),
  paidAmount: toNumber(booking.paidAmount),
  balanceDue: toNumber(booking.balanceDue),
  travelPackage: booking.travelPackage
    ? {
        ...booking.travelPackage,
        priceAdult: toNumber(booking.travelPackage.priceAdult),
        priceChild: toNumber(booking.travelPackage.priceChild)
      }
    : null,
  payments: booking.payments?.map((payment) => ({
    ...payment,
    amount: toNumber(payment.amount)
  })),
  payouts: booking.payouts?.map((p) => ({ ...p, amount: toNumber(p.amount) })),
  tickets: booking.tickets?.map((t) => ({ ...t, amount: toNumber(t.amount) })) || [],
  travellers: booking.travellers || [],
  attachments: booking.attachments || []
});

const ticketDataFromInput = (t) => ({
  ticketType: t.ticketType || "FLIGHT",
  vendor: t.vendor || null,
  reference: t.reference || null,
  fromLocation: t.fromLocation || null,
  toLocation: t.toLocation || null,
  departAt: t.departAt ? new Date(t.departAt) : null,
  returnAt: t.returnAt ? new Date(t.returnAt) : null,
  passengers: Number(t.passengers ?? 1),
  amount: Number(t.amount || 0),
  status: t.status || "BOOKED",
  note: t.note || null
});

const payoutDataFromInput = (p) => ({
  payeeType: p.payeeType,
  payeeName: p.payeeName,
  amount: Number(p.amount || 0),
  status: p.status,
  dueDate: p.dueDate ? new Date(p.dueDate) : null,
  paidDate: p.paidDate ? new Date(p.paidDate) : null,
  reference: p.reference || null,
  note: p.note || null
});

const travellerDataFromInput = (t) => ({
  fullName: t.fullName,
  age: t.age ?? null,
  gender: t.gender || null,
  passportNo: t.passportNo || null,
  phone: t.phone || null,
  isPrimary: Boolean(t.isPrimary),
  note: t.note || null
});

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const status = String(req.query.status || "");
  const items = await prisma.booking.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { bookingCode: { contains: q } },
                { customer: { fullName: { contains: q } } },
                { travelPackage: { name: { contains: q } } }
              ]
            }
          : {},
        status ? { bookingStatus: status } : {}
      ]
    },
    include: {
      customer: true,
      travelPackage: true,
      invoice: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ items: items.map((item) => serializeBooking({ ...item, payments: [] })) });
});

router.get("/overview", async (req, res) => {
  const month = String(req.query.month || dayjs().format("YYYY-MM"));
  const start = dayjs(`${month}-01`).startOf("month");
  const end = start.endOf("month");

  const bookings = await prisma.booking.findMany({
    where: { departureDate: { gte: start.toDate(), lte: end.toDate() } },
    include: { customer: true, travelPackage: true, payouts: true },
    orderBy: { departureDate: "asc" }
  });

  const now = dayjs();
  const serialized = bookings.map((item) => {
    const payoutsTotal = (item.payouts || []).reduce((s, p) => s + toNumber(p.amount), 0);
    const payoutsPending = (item.payouts || []).filter((p) => p.status === "PENDING").reduce((s, p) => s + toNumber(p.amount), 0);
    return {
      ...serializeBooking({ ...item, payments: [], invoice: null }),
      payoutsTotal,
      payoutsPending,
      estimatedMargin: toNumber(item.totalAmount) - payoutsTotal
    };
  });
  const summary = serialized.reduce(
    (acc, item) => {
      acc.totalBookings += 1;
      acc.totalRevenue += item.totalAmount;
      acc.pendingPayments += item.balanceDue;
      acc.totalPayouts += item.payoutsTotal;
      acc.payoutsPending += item.payoutsPending;
      acc.estimatedMargin += item.estimatedMargin;
      return acc;
    },
    { totalBookings: 0, totalRevenue: 0, pendingPayments: 0, totalPayouts: 0, payoutsPending: 0, estimatedMargin: 0 }
  );

  res.json({
    month,
    summary,
    upcoming: serialized.filter((item) => dayjs(item.departureDate).isAfter(now)),
    past: serialized.filter((item) => !dayjs(item.departureDate).isAfter(now))
  });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  res.json(serializeBooking(booking));
});

router.post("/", async (req, res) => {
  const body = bookingSchema.parse(req.body);
  const travelPackage = await prisma.package.findUnique({ where: { id: body.packageId } });

  if (!travelPackage) {
    return res.status(404).json({ message: "Travel package not found" });
  }

  let customerId = body.customerId;
  if (!customerId && body.customer) {
    const createdCustomer = await prisma.customer.create({
      data: {
        ...body.customer,
        email: body.customer.email || null,
        nationality: body.customer.nationality || null,
        passportNo: body.customer.passportNo || null,
        address: body.customer.address || null,
        notes: body.customer.notes || null
      }
    });
    customerId = createdCustomer.id;
  }

  if (!customerId) {
    return res.status(400).json({ message: "Customer is required" });
  }

  const installments = Array.isArray(body.payments) && body.payments.length > 0
    ? body.payments
    : (body.amountPaid > 0
        ? [{
            amount: body.amountPaid,
            paymentDate: body.departureDate,
            method: "Initial Payment",
            note: "Recorded while creating booking"
          }]
        : []);
  const paidSum = installments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Defensive: a 0 override means "free" but in practice it's almost always a
  // form bug (user enabled override, never filled the field). Treat it as
  // "no override" so the package default kicks in and the booking gets a
  // sane total instead of being silently zeroed out.
  const adultOverride = body.adultPriceOverride != null && Number(body.adultPriceOverride) > 0 ? body.adultPriceOverride : null;
  const childOverride = body.childPriceOverride != null && Number(body.childPriceOverride) > 0 ? body.childPriceOverride : null;
  const effectiveAdultRate = adultOverride != null ? adultOverride : travelPackage.priceAdult;
  const effectiveChildRate = childOverride != null ? childOverride : travelPackage.priceChild;
  const amounts = computeBookingAmounts({
    adultRate: effectiveAdultRate,
    childRate: effectiveChildRate,
    adults: body.adults,
    children: body.children,
    extraCharges: body.extraCharges,
    discountType: body.discountType,
    discountValue: body.discountValue,
    paidAmount: paidSum
  });

  const booking = await prisma.booking.create({
    data: {
      bookingCode: await nextBookingCode(prisma),
      customerId,
      packageId: body.packageId,
      departureDate: new Date(body.departureDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      adults: body.adults,
      children: body.children,
      adultPriceOverride: adultOverride,
      childPriceOverride: childOverride,
      extraCharges: body.extraCharges,
      discountType: body.discountType,
      discountValue: body.discountValue,
      discountAmount: amounts.discountAmount,
      subtotalAmount: amounts.subtotalAmount,
      totalAmount: amounts.totalAmount,
      paidAmount: amounts.paidAmount,
      balanceDue: amounts.balanceDue,
      paymentStatus: amounts.paymentStatus,
      bookingStatus: body.bookingStatus,
      notes: body.notes || null
    },
    include: bookingInclude
  });

  if (installments.length > 0) {
    await prisma.payment.createMany({
      data: installments.map((p) => ({
        bookingId: booking.id,
        amount: Number(p.amount),
        paymentDate: new Date(p.paymentDate),
        method: p.method || "Cash",
        note: p.note || null
      }))
    });
  }

  if (Array.isArray(body.travellers) && body.travellers.length > 0) {
    await prisma.bookingTraveller.createMany({
      data: body.travellers.map((t) => ({
        bookingId: booking.id,
        ...travellerDataFromInput(t)
      }))
    });
  }

  if (Array.isArray(body.payouts) && body.payouts.length > 0) {
    await prisma.bookingPayout.createMany({
      data: body.payouts.map((p) => ({
        bookingId: booking.id,
        ...payoutDataFromInput(p)
      }))
    });
  }

  if (Array.isArray(body.tickets) && body.tickets.length > 0) {
    await prisma.bookingTicket.createMany({
      data: body.tickets.map((t) => ({
        bookingId: booking.id,
        ...ticketDataFromInput(t)
      }))
    });
  }

  const fresh = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: bookingInclude
  });
  res.status(201).json(serializeBooking(fresh));
});

// Convert a possibly empty/null client date value into either a Date or null.
const dateOrNull = (v) => {
  if (v == null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = bookingSchema.parse(req.body);
  const travelPackage = await prisma.package.findUnique({ where: { id: body.packageId } });

  if (!travelPackage) {
    return res.status(404).json({ message: "Travel package not found" });
  }

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ message: "Booking not found" });
  }

  // Same defensive coercion as POST: a 0 override is treated as "no
  // override" so a misconfigured booking re-saves with sane totals.
  const adultOverride = body.adultPriceOverride != null && Number(body.adultPriceOverride) > 0 ? body.adultPriceOverride : null;
  const childOverride = body.childPriceOverride != null && Number(body.childPriceOverride) > 0 ? body.childPriceOverride : null;
  const effectiveAdultRate = adultOverride != null ? adultOverride : travelPackage.priceAdult;
  const effectiveChildRate = childOverride != null ? childOverride : travelPackage.priceChild;

  // Reconcile everything inside a single transaction so a mid-write failure
  // leaves nothing half-applied.
  const refreshed = await prisma.$transaction(async (tx) => {
    // -------- Payments (reconcile: update kept rows, create new rows, delete removed rows) --------
    let paidSum = toNumber(existing.paidAmount);
    if (Array.isArray(body.payments)) {
      const submitted = body.payments.filter((p) => Number(p.amount || 0) > 0);
      const keepIds = submitted.map((p) => Number(p.id)).filter((n) => Number.isFinite(n) && n > 0);
      await tx.payment.deleteMany({
        where: {
          bookingId: id,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
        }
      });
      for (const p of submitted) {
        const data = {
          amount: Number(p.amount || 0),
          paymentDate: dateOrNull(p.paymentDate) || new Date(),
          method: p.method || "Cash",
          note: p.note || null
        };
        if (Number(p.id) > 0) {
          await tx.payment.update({ where: { id: Number(p.id) }, data });
        } else {
          await tx.payment.create({ data: { ...data, bookingId: id } });
        }
      }
      // Recompute paid from the reconciled payments table.
      const rows = await tx.payment.findMany({
        where: { bookingId: id },
        select: { amount: true }
      });
      paidSum = rows.reduce((s, r) => s + toNumber(r.amount), 0);
    }

    // -------- Travellers --------
    if (Array.isArray(body.travellers)) {
      const submitted = body.travellers.filter((t) => String(t.fullName || "").trim());
      const keepIds = submitted.map((t) => Number(t.id)).filter((n) => Number.isFinite(n) && n > 0);
      await tx.bookingTraveller.deleteMany({
        where: {
          bookingId: id,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
        }
      });
      for (const t of submitted) {
        const data = {
          fullName: t.fullName.trim(),
          age: t.age == null || t.age === "" ? null : Number(t.age),
          gender: t.gender || null,
          passportNo: t.passportNo || null,
          phone: t.phone || null,
          isPrimary: !!t.isPrimary,
          note: t.note || null
        };
        if (Number(t.id) > 0) {
          await tx.bookingTraveller.update({ where: { id: Number(t.id) }, data });
        } else {
          await tx.bookingTraveller.create({ data: { ...data, bookingId: id } });
        }
      }
    }

    // -------- Payouts (suppliers) --------
    if (Array.isArray(body.payouts)) {
      const submitted = body.payouts.filter((p) => String(p.payeeName || "").trim());
      const keepIds = submitted.map((p) => Number(p.id)).filter((n) => Number.isFinite(n) && n > 0);
      await tx.bookingPayout.deleteMany({
        where: {
          bookingId: id,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
        }
      });
      for (const p of submitted) {
        const data = {
          payeeType: p.payeeType || PayeeType.OTHER,
          payeeName: p.payeeName.trim(),
          amount: Number(p.amount || 0),
          status: p.status || PayoutStatus.PENDING,
          dueDate: dateOrNull(p.dueDate),
          paidDate: dateOrNull(p.paidDate),
          reference: p.reference || null,
          note: p.note || null
        };
        if (Number(p.id) > 0) {
          await tx.bookingPayout.update({ where: { id: Number(p.id) }, data });
        } else {
          await tx.bookingPayout.create({ data: { ...data, bookingId: id } });
        }
      }
    }

    // -------- Tickets --------
    if (Array.isArray(body.tickets)) {
      const submitted = body.tickets.filter(
        (t) => t.vendor || t.reference || t.fromLocation || t.toLocation
      );
      const keepIds = submitted.map((t) => Number(t.id)).filter((n) => Number.isFinite(n) && n > 0);
      await tx.bookingTicket.deleteMany({
        where: {
          bookingId: id,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {})
        }
      });
      for (const t of submitted) {
        const data = {
          ticketType: t.ticketType || TicketType.FLIGHT,
          vendor: t.vendor || null,
          reference: t.reference || null,
          fromLocation: t.fromLocation || null,
          toLocation: t.toLocation || null,
          departAt: dateOrNull(t.departAt),
          returnAt: dateOrNull(t.returnAt),
          passengers: Number(t.passengers || 1),
          amount: Number(t.amount || 0),
          status: t.status || TicketStatus.BOOKED,
          note: t.note || null
        };
        if (Number(t.id) > 0) {
          await tx.bookingTicket.update({ where: { id: Number(t.id) }, data });
        } else {
          await tx.bookingTicket.create({ data: { ...data, bookingId: id } });
        }
      }
    }

    // -------- Booking core + recomputed totals --------
    const amounts = computeBookingAmounts({
      adultRate: effectiveAdultRate,
      childRate: effectiveChildRate,
      adults: body.adults,
      children: body.children,
      extraCharges: body.extraCharges,
      discountType: body.discountType,
      discountValue: body.discountValue,
      paidAmount: paidSum
    });

    await tx.booking.update({
      where: { id },
      data: {
        customerId: body.customerId || existing.customerId,
        packageId: body.packageId,
        departureDate: new Date(body.departureDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        adults: body.adults,
        children: body.children,
        adultPriceOverride: adultOverride,
        childPriceOverride: childOverride,
        extraCharges: body.extraCharges,
        discountType: body.discountType,
        discountValue: body.discountValue,
        discountAmount: amounts.discountAmount,
        subtotalAmount: amounts.subtotalAmount,
        totalAmount: amounts.totalAmount,
        paidAmount: paidSum,
        balanceDue: Math.max(amounts.totalAmount - paidSum, 0),
        paymentStatus:
          paidSum >= amounts.totalAmount
            ? PaymentStatus.PAID
            : paidSum > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING,
        bookingStatus: body.bookingStatus,
        notes: body.notes || null
      }
    });

    return tx.booking.findUnique({ where: { id }, include: bookingInclude });
  });

  res.json(serializeBooking(refreshed));
});

router.post("/:id/payments", async (req, res) => {
  const id = Number(req.params.id);
  const body = paymentSchema.parse(req.body);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  await prisma.payment.create({
    data: {
      bookingId: id,
      amount: body.amount,
      paymentDate: new Date(body.paymentDate),
      method: body.method,
      note: body.note || null
    }
  });

  const nextPaidAmount = toNumber(booking.paidAmount) + body.amount;
  const paymentStatus =
    nextPaidAmount >= toNumber(booking.totalAmount)
      ? PaymentStatus.PAID
      : nextPaidAmount > 0
        ? PaymentStatus.PARTIAL
        : PaymentStatus.PENDING;

  await prisma.booking.update({
    where: { id },
    data: {
      paidAmount: nextPaidAmount,
      balanceDue: Math.max(toNumber(booking.totalAmount) - nextPaidAmount, 0),
      paymentStatus
    }
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });

  res.status(201).json(serializeBooking(refreshed));
});

// ----- Travellers -----
router.post("/:id/travellers", async (req, res) => {
  const id = Number(req.params.id);
  const data = travellerSchema.parse(req.body);
  const exists = await prisma.booking.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: "Booking not found" });
  await prisma.bookingTraveller.create({
    data: { bookingId: id, ...travellerDataFromInput(data) }
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.status(201).json(serializeBooking(refreshed));
});

router.put("/:id/travellers/:travellerId", async (req, res) => {
  const id = Number(req.params.id);
  const travellerId = Number(req.params.travellerId);
  const data = travellerSchema.parse(req.body);
  const t = await prisma.bookingTraveller.findUnique({ where: { id: travellerId } });
  if (!t || t.bookingId !== id) return res.status(404).json({ message: "Traveller not found" });
  await prisma.bookingTraveller.update({
    where: { id: travellerId },
    data: travellerDataFromInput(data)
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

router.delete("/:id/travellers/:travellerId", async (req, res) => {
  const id = Number(req.params.id);
  const travellerId = Number(req.params.travellerId);
  const t = await prisma.bookingTraveller.findUnique({ where: { id: travellerId } });
  if (!t || t.bookingId !== id) return res.status(404).json({ message: "Traveller not found" });
  await prisma.bookingTraveller.delete({ where: { id: travellerId } });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

// ----- Payouts (B2B / hotel / supplier) -----
router.post("/:id/payouts", async (req, res) => {
  const id = Number(req.params.id);
  const data = payoutSchema.parse(req.body);
  const exists = await prisma.booking.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: "Booking not found" });
  await prisma.bookingPayout.create({
    data: { bookingId: id, ...payoutDataFromInput(data) }
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.status(201).json(serializeBooking(refreshed));
});

router.put("/:id/payouts/:payoutId", async (req, res) => {
  const id = Number(req.params.id);
  const payoutId = Number(req.params.payoutId);
  const data = payoutSchema.parse(req.body);
  const p = await prisma.bookingPayout.findUnique({ where: { id: payoutId } });
  if (!p || p.bookingId !== id) return res.status(404).json({ message: "Payout not found" });
  await prisma.bookingPayout.update({
    where: { id: payoutId },
    data: payoutDataFromInput(data)
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

router.patch("/:id/payouts/:payoutId/mark-paid", async (req, res) => {
  const id = Number(req.params.id);
  const payoutId = Number(req.params.payoutId);
  const p = await prisma.bookingPayout.findUnique({ where: { id: payoutId } });
  if (!p || p.bookingId !== id) return res.status(404).json({ message: "Payout not found" });
  await prisma.bookingPayout.update({
    where: { id: payoutId },
    data: { status: "PAID", paidDate: new Date() }
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

router.delete("/:id/payouts/:payoutId", async (req, res) => {
  const id = Number(req.params.id);
  const payoutId = Number(req.params.payoutId);
  const p = await prisma.bookingPayout.findUnique({ where: { id: payoutId } });
  if (!p || p.bookingId !== id) return res.status(404).json({ message: "Payout not found" });
  await prisma.bookingPayout.delete({ where: { id: payoutId } });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

// ----- Tickets -----
router.post("/:id/tickets", async (req, res) => {
  const id = Number(req.params.id);
  const data = ticketSchema.parse(req.body);
  const exists = await prisma.booking.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: "Booking not found" });
  await prisma.bookingTicket.create({ data: { bookingId: id, ...ticketDataFromInput(data) } });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.status(201).json(serializeBooking(refreshed));
});

router.put("/:id/tickets/:ticketId", async (req, res) => {
  const id = Number(req.params.id);
  const ticketId = Number(req.params.ticketId);
  const data = ticketSchema.parse(req.body);
  const t = await prisma.bookingTicket.findUnique({ where: { id: ticketId } });
  if (!t || t.bookingId !== id) return res.status(404).json({ message: "Ticket not found" });
  await prisma.bookingTicket.update({ where: { id: ticketId }, data: ticketDataFromInput(data) });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

router.delete("/:id/tickets/:ticketId", async (req, res) => {
  const id = Number(req.params.id);
  const ticketId = Number(req.params.ticketId);
  const t = await prisma.bookingTicket.findUnique({ where: { id: ticketId } });
  if (!t || t.bookingId !== id) return res.status(404).json({ message: "Ticket not found" });
  await prisma.bookingTicket.delete({ where: { id: ticketId } });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

// ----- Attachments -----
router.post("/:id/attachments", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.booking.findUnique({ where: { id } });
  if (!exists) {
    (req.files || []).forEach((f) => fs.unlinkSync(f.path));
    return res.status(404).json({ message: "Booking not found" });
  }
  const label = req.body?.label ? String(req.body.label) : null;
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ message: "No files uploaded" });

  await prisma.bookingAttachment.createMany({
    data: files.map((f) => ({
      bookingId: id,
      fileName: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      label
    }))
  });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.status(201).json(serializeBooking(refreshed));
});

router.get("/:id/attachments/:attachmentId", async (req, res) => {
  const id = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  const att = await prisma.bookingAttachment.findUnique({ where: { id: attachmentId } });
  if (!att || att.bookingId !== id) return res.status(404).json({ message: "Attachment not found" });
  const filePath = path.join(UPLOAD_ROOT, String(id), att.fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing on disk" });
  res.setHeader("Content-Type", att.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${att.originalName}"`);
  fs.createReadStream(filePath).pipe(res);
});

router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  const id = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  const att = await prisma.bookingAttachment.findUnique({ where: { id: attachmentId } });
  if (!att || att.bookingId !== id) return res.status(404).json({ message: "Attachment not found" });
  const filePath = path.join(UPLOAD_ROOT, String(id), att.fileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
  await prisma.bookingAttachment.delete({ where: { id: attachmentId } });
  const refreshed = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  res.json(serializeBooking(refreshed));
});

router.delete("/:id/payments/:paymentId", async (req, res) => {
  const id = Number(req.params.id);
  const paymentId = Number(req.params.paymentId);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.bookingId !== id) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payments: true }
  });
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  await prisma.payment.delete({ where: { id: paymentId } });

  const remaining = booking.payments
    .filter((p) => p.id !== paymentId)
    .reduce((sum, p) => sum + toNumber(p.amount), 0);

  const total = toNumber(booking.totalAmount);
  const paymentStatus =
    remaining >= total && total > 0
      ? PaymentStatus.PAID
      : remaining > 0
        ? PaymentStatus.PARTIAL
        : PaymentStatus.PENDING;

  await prisma.booking.update({
    where: { id },
    data: {
      paidAmount: remaining,
      balanceDue: Math.max(total - remaining, 0),
      paymentStatus
    }
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });
  res.json(serializeBooking(refreshed));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { invoice: true, payments: true }
  });

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  await prisma.booking.delete({ where: { id } });

  const dir = path.join(UPLOAD_ROOT, String(id));
  if (fs.existsSync(dir)) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  return res.json({ message: "Booking deleted" });
});

export default router;
