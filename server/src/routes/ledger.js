import { LedgerKind } from "@prisma/client";
import dayjs from "dayjs";
import { Router } from "express";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";
import { optionalString, optionalDateString } from "../utils/zodHelpers.js";

const router = Router();

const entrySchema = z.object({
  kind: z.nativeEnum(LedgerKind),
  category: z.string().min(1),
  party: optionalString,
  amount: z.coerce.number().positive(),
  txDate: optionalDateString,
  paymentMethod: optionalString,
  reference: optionalString,
  notes: optionalString
});

const serialize = (e) => ({ ...e, amount: toNumber(e.amount) });

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const kind = String(req.query.kind || "");
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const items = await prisma.ledgerEntry.findMany({
    where: {
      AND: [
        kind ? { kind } : {},
        q ? {
          OR: [
            { category: { contains: q } },
            { party: { contains: q } },
            { reference: { contains: q } },
            { notes: { contains: q } }
          ]
        } : {},
        from || to ? { txDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}
      ]
    },
    orderBy: { txDate: "desc" }
  });
  res.json({ items: items.map(serialize) });
});

router.post("/", async (req, res) => {
  const body = entrySchema.parse(req.body);
  const e = await prisma.ledgerEntry.create({
    data: {
      kind: body.kind,
      category: body.category,
      party: body.party || null,
      amount: body.amount,
      txDate: body.txDate ? new Date(body.txDate) : new Date(),
      paymentMethod: body.paymentMethod || null,
      reference: body.reference || null,
      notes: body.notes || null,
      sourceType: "Manual",
      sourceId: null
    }
  });
  res.status(201).json(serialize(e));
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = entrySchema.parse(req.body);
  const e = await prisma.ledgerEntry.update({
    where: { id },
    data: {
      kind: body.kind,
      category: body.category,
      party: body.party || null,
      amount: body.amount,
      txDate: body.txDate ? new Date(body.txDate) : undefined,
      paymentMethod: body.paymentMethod || null,
      reference: body.reference || null,
      notes: body.notes || null
    }
  });
  res.json(serialize(e));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.ledgerEntry.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

// Aggregate report: includes manual ledger + auto-derived from bookings/sales/payouts
router.get("/report", async (req, res) => {
  const month = String(req.query.month || dayjs().format("YYYY-MM"));
  const start = dayjs(`${month}-01`).startOf("month").toDate();
  const end = dayjs(`${month}-01`).endOf("month").toDate();

  const [
    manualEntries,
    bookingPayments,
    ticketSalePayments,
    paidPayouts,
    paidTicketSupplier
  ] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { txDate: { gte: start, lte: end } } }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: { booking: { include: { customer: true } } }
    }),
    prisma.ticketSalePayment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
      include: { ticketSale: { include: { customer: true } } }
    }),
    prisma.bookingPayout.findMany({
      where: { status: "PAID", paidDate: { gte: start, lte: end } },
      include: { booking: true }
    }),
    prisma.ticketSale.findMany({
      where: { supplierPaid: true, supplierPaidDate: { gte: start, lte: end } }
    })
  ]);

  // Build virtual ledger view
  const rows = [];

  manualEntries.forEach((e) => rows.push({
    id: `m-${e.id}`,
    kind: e.kind,
    category: e.category,
    party: e.party,
    amount: toNumber(e.amount),
    txDate: e.txDate,
    paymentMethod: e.paymentMethod,
    reference: e.reference,
    sourceType: e.sourceType || "Manual",
    sourceId: e.sourceId
  }));

  bookingPayments.forEach((p) => rows.push({
    id: `bp-${p.id}`,
    kind: "INCOME",
    category: "Booking Payment",
    party: p.booking?.customer?.fullName,
    amount: toNumber(p.amount),
    txDate: p.paymentDate,
    paymentMethod: p.method,
    reference: p.booking?.bookingCode,
    sourceType: "BookingPayment",
    sourceId: p.id
  }));

  ticketSalePayments.forEach((p) => rows.push({
    id: `tp-${p.id}`,
    kind: "INCOME",
    category: "Ticket Sale Payment",
    party: p.ticketSale?.customer?.fullName,
    amount: toNumber(p.amount),
    txDate: p.paymentDate,
    paymentMethod: p.method,
    reference: p.ticketSale?.saleCode,
    sourceType: "TicketSalePayment",
    sourceId: p.id
  }));

  paidPayouts.forEach((po) => rows.push({
    id: `po-${po.id}`,
    kind: "EXPENSE",
    category: `Booking Payout (${po.payeeType})`,
    party: po.payeeName,
    amount: toNumber(po.amount),
    txDate: po.paidDate,
    reference: po.reference || po.booking?.bookingCode,
    sourceType: "BookingPayout",
    sourceId: po.id
  }));

  paidTicketSupplier.forEach((s) => rows.push({
    id: `ts-${s.id}`,
    kind: "EXPENSE",
    category: "Ticket Sale Supplier",
    party: s.supplierName || s.vendor,
    amount: toNumber(s.costPrice),
    txDate: s.supplierPaidDate,
    reference: s.saleCode,
    sourceType: "TicketSaleSupplier",
    sourceId: s.id
  }));

  rows.sort((a, b) => new Date(b.txDate) - new Date(a.txDate));

  const summary = rows.reduce((acc, r) => {
    if (r.kind === "INCOME") acc.income += r.amount;
    else acc.expense += r.amount;
    return acc;
  }, { income: 0, expense: 0 });
  summary.net = summary.income - summary.expense;

  // By category
  const byCategory = {};
  for (const r of rows) {
    const k = `${r.kind}::${r.category}`;
    byCategory[k] = byCategory[k] || { kind: r.kind, category: r.category, total: 0, count: 0 };
    byCategory[k].total += r.amount;
    byCategory[k].count += 1;
  }

  res.json({
    month,
    summary,
    rows,
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total)
  });
});

router.get("/export", async (req, res) => {
  const month = String(req.query.month || dayjs().format("YYYY-MM"));
  // Reuse report logic by inlining minimal call
  const start = dayjs(`${month}-01`).startOf("month").toDate();
  const end = dayjs(`${month}-01`).endOf("month").toDate();
  const entries = await prisma.ledgerEntry.findMany({
    where: { txDate: { gte: start, lte: end } },
    orderBy: { txDate: "desc" }
  });
  const csv = stringify(entries.map((e) => ({
    date: dayjs(e.txDate).format("YYYY-MM-DD"),
    kind: e.kind,
    category: e.category,
    party: e.party || "",
    amount: toNumber(e.amount),
    method: e.paymentMethod || "",
    reference: e.reference || "",
    notes: e.notes || ""
  })), { header: true });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="ledger-${month}.csv"`);
  res.send(csv);
});

export default router;
