import { VendorInvoiceStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextVendorInvoiceNumber } from "../utils/codeGenerators.js";
import { toNumber, toPlainAmount } from "../utils/formatters.js";
import { buildVendorInvoicePdf } from "../services/vendorInvoicePdf.js";
import { optionalString, optionalDateString } from "../utils/zodHelpers.js";

const router = Router();

const itemSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  description: z.string().min(1),
  hsnCode: optionalString,
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0)
});

// One row of the payment history shown in the invoice form. A row with an id is
// an existing payment (edited in place); a row without one is a new payment.
const paymentRowSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive(),
  paymentDate: optionalDateString,
  method: optionalString,
  note: optionalString
});

const invoiceSchema = z.object({
  vendorId: z.coerce.number().int().positive(),
  issueDate: optionalDateString,
  dueDate: optionalDateString,
  status: z.nativeEnum(VendorInvoiceStatus).default("DRAFT"),
  currency: optionalString,
  notes: optionalString,
  terms: optionalString,
  reference: optionalString,
  showGstin: z.boolean().optional().default(true),
  includeBank: z.boolean().optional().default(true),
  items: z.array(itemSchema).min(1),
  // Full payment history. When present it REPLACES the invoice's payments
  // (update by id / create / delete the rest); when omitted, payments are left
  // exactly as they are.
  payments: z.array(paymentRowSchema).optional()
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: optionalDateString,
  paymentMethod: optionalString,
  reference: optionalString,
  notes: optionalString
});

const include = {
  vendor: true,
  items: { orderBy: { position: "asc" } }
};

const computeItems = (items) => {
  let subtotal = 0, taxTotal = 0, discountTotal = 0, total = 0;
  const computed = items.map((it, idx) => {
    const qty = toNumber(it.quantity);
    const unit = toNumber(it.unitPrice);
    const disc = toNumber(it.discountAmount);
    const lineGross = qty * unit;
    const lineAfterDiscount = Math.max(lineGross - disc, 0);
    const lineTax = lineAfterDiscount * (toNumber(it.taxRate) / 100);
    const lineTotal = lineAfterDiscount + lineTax;
    subtotal += lineGross;
    discountTotal += disc;
    taxTotal += lineTax;
    total += lineTotal;
    return {
      description: it.description,
      hsnCode: it.hsnCode || null,
      quantity: toPlainAmount(qty),
      unitPrice: toPlainAmount(unit),
      taxRate: toPlainAmount(toNumber(it.taxRate)),
      discountAmount: toPlainAmount(disc),
      taxAmount: toPlainAmount(lineTax),
      totalAmount: toPlainAmount(lineTotal),
      position: idx
    };
  });
  return {
    items: computed,
    subtotal: toPlainAmount(subtotal),
    discount: toPlainAmount(discountTotal),
    tax: toPlainAmount(taxTotal),
    total: toPlainAmount(total)
  };
};

const serialize = (inv) => ({
  ...inv,
  subtotalAmount: toNumber(inv.subtotalAmount),
  taxAmount: toNumber(inv.taxAmount),
  discountAmount: toNumber(inv.discountAmount),
  totalAmount: toNumber(inv.totalAmount),
  paidAmount: toNumber(inv.paidAmount),
  balanceDue: toNumber(inv.balanceDue),
  items: (inv.items || []).map((it) => ({
    ...it,
    quantity: toNumber(it.quantity),
    unitPrice: toNumber(it.unitPrice),
    taxRate: toNumber(it.taxRate),
    discountAmount: toNumber(it.discountAmount),
    taxAmount: toNumber(it.taxAmount),
    totalAmount: toNumber(it.totalAmount)
  })),
  vendor: inv.vendor ? {
    ...inv.vendor,
    openingBalance: toNumber(inv.vendor.openingBalance)
  } : null
});

// ---------------------------------------------------------------------------
// Payments
// Each payment against a B2B invoice is stored as an INCOME ledger entry linked
// to the invoice (sourceType "VendorInvoice", sourceId = invoice id) — so the
// income/expense books and the invoice always agree, and no extra table is
// needed. These helpers read that history back and keep paid / balance / status
// in step with it.
// ---------------------------------------------------------------------------
const PAYMENT_CATEGORY = "B2B Invoice Payment";
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const loadPaymentMap = async (client, ids) => {
  const map = new Map(ids.map((i) => [i, []]));
  if (ids.length === 0) return map;
  const rows = await client.ledgerEntry.findMany({
    where: { sourceType: "VendorInvoice", sourceId: { in: ids }, kind: "INCOME" },
    orderBy: [{ txDate: "asc" }, { id: "asc" }]
  });
  for (const r of rows) {
    map.get(r.sourceId)?.push({
      id: r.id,
      amount: toNumber(r.amount),
      paymentDate: r.txDate,
      method: r.paymentMethod || "",
      note: r.notes || ""
    });
  }
  return map;
};

// Serialized invoice + its dated payment list. If the invoice says more was
// paid than its payment rows add up to (older data recorded without a row),
// the gap is surfaced as a read-only "Earlier payment" line so Paid, Balance
// and the history always reconcile.
const withPayments = (inv, payments = []) => {
  const base = serialize(inv);
  const itemised = payments.reduce((s, p) => s + p.amount, 0);
  const gap = round2(base.paidAmount - itemised);
  const list = gap > 0.005
    ? [{ id: null, legacy: true, amount: gap, paymentDate: inv.paidAt || inv.issueDate, method: "", note: "Earlier payment" }, ...payments]
    : payments;
  return { ...base, payments: list };
};

const present = async (inv) => {
  const map = await loadPaymentMap(prisma, [inv.id]);
  return withPayments(inv, map.get(inv.id) || []);
};

// Replace an invoice's payment rows with `rows` (update by id / create / delete
// the rest) and return the new total paid. Any paid amount that was never
// itemised (older data) is carried forward untouched.
const reconcilePayments = async (tx, inv, rows, vendorName) => {
  const before = await tx.ledgerEntry.findMany({
    where: { sourceType: "VendorInvoice", sourceId: inv.id, kind: "INCOME" },
    select: { id: true, amount: true }
  });
  const ownIds = new Set(before.map((b) => b.id));
  const keepIds = new Set(rows.map((r) => r.id).filter((id) => ownIds.has(id)));
  const beforeSum = before.reduce((s, b) => s + toNumber(b.amount), 0);
  const carried = Math.max(round2(toNumber(inv.paidAmount) - beforeSum), 0);

  const dropIds = before.filter((b) => !keepIds.has(b.id)).map((b) => b.id);
  if (dropIds.length > 0) await tx.ledgerEntry.deleteMany({ where: { id: { in: dropIds } } });

  let paid = carried;
  for (const r of rows) {
    const data = {
      amount: r.amount,
      txDate: r.paymentDate ? new Date(r.paymentDate) : new Date(),
      paymentMethod: r.method || null,
      notes: r.note || null,
      party: vendorName || null,
      reference: inv.invoiceNumber
    };
    if (r.id && ownIds.has(r.id)) {
      await tx.ledgerEntry.update({ where: { id: r.id }, data });
    } else {
      await tx.ledgerEntry.create({
        data: { ...data, kind: "INCOME", category: PAYMENT_CATEGORY, sourceType: "VendorInvoice", sourceId: inv.id }
      });
    }
    paid += r.amount;
  }
  return round2(paid);
};

// Status follows the money: fully paid -> PAID; first payment on a draft ->
// SENT; and an invoice that WAS fully paid but now has a balance again (a
// payment was removed/reduced) drops back to SENT. A status the user chose by
// hand is otherwise respected, as is CANCELLED.
const settle = (requested, total, paid, prev) => {
  const balance = Math.max(round2(total - paid), 0);
  let status = requested;
  if (status !== "CANCELLED") {
    if (total > 0 && balance === 0 && paid > 0) status = "PAID";
    else if (status === "PAID" && balance > 0 && toNumber(prev?.balanceDue) === 0 && toNumber(prev?.paidAmount) > 0) status = "SENT";
    else if (paid > 0 && status === "DRAFT") status = "SENT";
  }
  return { balance, status, paidAt: status === "PAID" ? (prev?.paidAt || new Date()) : null };
};

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const status = String(req.query.status || "");
  const items = await prisma.vendorInvoice.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { invoiceNumber: { contains: q } },
            { reference: { contains: q } },
            { vendor: { name: { contains: q } } }
          ]
        } : {},
        status ? { status } : {}
      ]
    },
    include,
    orderBy: { issueDate: "desc" }
  });
  const payments = await loadPaymentMap(prisma, items.map((i) => i.id));
  res.json({ items: items.map((i) => withPayments(i, payments.get(i.id) || [])) });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include });
  if (!inv) return res.status(404).json({ message: "Invoice not found" });
  res.json(await present(inv));
});

router.post("/", async (req, res) => {
  const body = invoiceSchema.parse(req.body);
  const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  const c = computeItems(body.items);
  const invoiceNumber = await nextVendorInvoiceNumber(prisma);

  const created = await prisma.$transaction(async (tx) => {
    const inv = await tx.vendorInvoice.create({
      data: {
        invoiceNumber,
        vendorId: body.vendorId,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status,
        currency: body.currency || "INR",
        notes: body.notes || null,
        terms: body.terms || null,
        reference: body.reference || null,
        showGstin: body.showGstin ?? true,
        includeBank: body.includeBank ?? true,
        subtotalAmount: c.subtotal,
        discountAmount: c.discount,
        taxAmount: c.tax,
        totalAmount: c.total,
        paidAmount: 0,
        balanceDue: c.total,
        items: { create: c.items }
      }
    });
    // Part payments entered on the form: record them and settle paid/balance.
    if (body.payments && body.payments.length > 0) {
      const paid = await reconcilePayments(tx, inv, body.payments, vendor.name);
      const s = settle(body.status, toNumber(inv.totalAmount), paid, inv);
      await tx.vendorInvoice.update({
        where: { id: inv.id },
        data: { paidAmount: paid, balanceDue: s.balance, status: s.status, paidAt: s.paidAt }
      });
    }
    return tx.vendorInvoice.findUnique({ where: { id: inv.id }, include });
  });
  res.status(201).json(await present(created));
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = invoiceSchema.parse(req.body);
  const existing = await prisma.vendorInvoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Invoice not found" });
  const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  const c = computeItems(body.items);

  const updated = await prisma.$transaction(async (tx) => {
    // Payments: replace with the submitted history when given, otherwise leave
    // exactly as they are.
    const paid = body.payments
      ? await reconcilePayments(tx, existing, body.payments, vendor.name)
      : toNumber(existing.paidAmount);
    const s = settle(body.status, c.total, paid, existing);

    await tx.vendorInvoiceItem.deleteMany({ where: { vendorInvoiceId: id } });
    return tx.vendorInvoice.update({
      where: { id },
      data: {
        vendorId: body.vendorId,
        issueDate: body.issueDate ? new Date(body.issueDate) : existing.issueDate,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: s.status,
        currency: body.currency || existing.currency,
        notes: body.notes || null,
        terms: body.terms || null,
        reference: body.reference || null,
        showGstin: body.showGstin ?? true,
        includeBank: body.includeBank ?? true,
        subtotalAmount: c.subtotal,
        discountAmount: c.discount,
        taxAmount: c.tax,
        totalAmount: c.total,
        paidAmount: paid,
        balanceDue: s.balance,
        paidAt: s.paidAt,
        items: { create: c.items }
      },
      include
    });
  });
  res.json(await present(updated));
});

router.patch("/:id/mark-sent", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.vendorInvoice.findUnique({ where: { id } });
  if (!inv) return res.status(404).json({ message: "Invoice not found" });
  const updated = await prisma.vendorInvoice.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    include
  });
  res.json(await present(updated));
});

router.patch("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.vendorInvoice.update({
    where: { id },
    data: { status: "CANCELLED" },
    include
  });
  res.json(await present(updated));
});

router.post("/:id/payments", async (req, res) => {
  const id = Number(req.params.id);
  const body = paymentSchema.parse(req.body);
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include: { vendor: true } });
  if (!inv) return res.status(404).json({ message: "Invoice not found" });

  const nextPaid = toNumber(inv.paidAmount) + body.amount;
  const total = toNumber(inv.totalAmount);
  const balance = Math.max(total - nextPaid, 0);
  const status = balance === 0 && total > 0 ? "PAID" : inv.status === "DRAFT" ? "SENT" : inv.status;

  const updated = await prisma.vendorInvoice.update({
    where: { id },
    data: {
      paidAmount: nextPaid,
      balanceDue: balance,
      status,
      paidAt: balance === 0 ? new Date() : inv.paidAt
    },
    include
  });

  // Mirror to ledger as INCOME
  await prisma.ledgerEntry.create({
    data: {
      kind: "INCOME",
      category: PAYMENT_CATEGORY,
      party: inv.vendor?.name || null,
      amount: body.amount,
      txDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod || null,
      reference: body.reference || inv.invoiceNumber,
      notes: body.notes || null,
      sourceType: "VendorInvoice",
      sourceId: id
    }
  });

  res.status(201).json(await present(updated));
});

router.get("/:id/pdf", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include });
  if (!inv) return res.status(404).json({ message: "Invoice not found" });

  const opts = {
    showGstin: req.query.showGstin !== "0",
    includeBank: req.query.includeBank !== "0",
    notes: req.query.notes ? String(req.query.notes) : ""
  };
  // Includes the dated payment history so the invoice shows each payment and
  // the balance still to pay.
  const pdf = await buildVendorInvoicePdf(await present(inv), opts);
  const inline = req.query.inline === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${inv.invoiceNumber}.pdf"`
  );
  res.send(pdf);
});

router.post("/:id/duplicate", async (req, res) => {
  const id = Number(req.params.id);
  const src = await prisma.vendorInvoice.findUnique({ where: { id }, include });
  if (!src) return res.status(404).json({ message: "Invoice not found" });
  const invoiceNumber = await nextVendorInvoiceNumber(prisma);
  const dup = await prisma.vendorInvoice.create({
    data: {
      invoiceNumber,
      vendorId: src.vendorId,
      issueDate: new Date(),
      dueDate: src.dueDate,
      status: "DRAFT",
      currency: src.currency,
      notes: src.notes,
      terms: src.terms,
      reference: src.reference,
      showGstin: src.showGstin,
      includeBank: src.includeBank,
      subtotalAmount: src.subtotalAmount,
      discountAmount: src.discountAmount,
      taxAmount: src.taxAmount,
      totalAmount: src.totalAmount,
      paidAmount: 0,
      balanceDue: src.totalAmount,
      items: {
        create: src.items.map((it) => ({
          description: it.description, hsnCode: it.hsnCode, quantity: it.quantity,
          unitPrice: it.unitPrice, taxRate: it.taxRate, discountAmount: it.discountAmount,
          taxAmount: it.taxAmount, totalAmount: it.totalAmount, position: it.position
        }))
      }
    },
    include
  });
  res.status(201).json(withPayments(dup, []));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.ledgerEntry.deleteMany({ where: { sourceType: "VendorInvoice", sourceId: id } });
  await prisma.vendorInvoice.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

export default router;
