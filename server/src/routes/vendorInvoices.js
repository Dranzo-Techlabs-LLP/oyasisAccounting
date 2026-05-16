import { VendorInvoiceStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextVendorInvoiceNumber } from "../utils/codeGenerators.js";
import { toNumber, toPlainAmount } from "../utils/formatters.js";
import { buildVendorInvoicePdf } from "../services/vendorInvoicePdf.js";

const router = Router();

const itemSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  description: z.string().min(1),
  hsnCode: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0)
});

const invoiceSchema = z.object({
  vendorId: z.coerce.number().int().positive(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  status: z.nativeEnum(VendorInvoiceStatus).default("DRAFT"),
  currency: z.string().optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  showGstin: z.boolean().optional().default(true),
  includeBank: z.boolean().optional().default(true),
  items: z.array(itemSchema).min(1)
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
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
  res.json({ items: items.map(serialize) });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include });
  if (!inv) return res.status(404).json({ message: "Invoice not found" });
  res.json(serialize(inv));
});

router.post("/", async (req, res) => {
  const body = invoiceSchema.parse(req.body);
  const vendor = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  const c = computeItems(body.items);
  const invoiceNumber = await nextVendorInvoiceNumber(prisma);

  const created = await prisma.vendorInvoice.create({
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
    },
    include
  });
  res.status(201).json(serialize(created));
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = invoiceSchema.parse(req.body);
  const existing = await prisma.vendorInvoice.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Invoice not found" });

  const c = computeItems(body.items);
  const balance = Math.max(c.total - toNumber(existing.paidAmount), 0);

  await prisma.vendorInvoiceItem.deleteMany({ where: { vendorInvoiceId: id } });
  const updated = await prisma.vendorInvoice.update({
    where: { id },
    data: {
      vendorId: body.vendorId,
      issueDate: body.issueDate ? new Date(body.issueDate) : existing.issueDate,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status,
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
      balanceDue: balance,
      items: { create: c.items }
    },
    include
  });
  res.json(serialize(updated));
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
  res.json(serialize(updated));
});

router.patch("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.vendorInvoice.update({
    where: { id },
    data: { status: "CANCELLED" },
    include
  });
  res.json(serialize(updated));
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
      category: "B2B Invoice Payment",
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

  res.status(201).json(serialize(updated));
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
  const pdf = await buildVendorInvoicePdf(serialize(inv), opts);
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
  res.status(201).json(serialize(dup));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await prisma.ledgerEntry.deleteMany({ where: { sourceType: "VendorInvoice", sourceId: id } });
  await prisma.vendorInvoice.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

export default router;
