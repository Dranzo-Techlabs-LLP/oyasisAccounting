import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaymentStatus, TicketStatus, TicketType } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { nextTicketSaleCode, nextInvoiceNumber } from "../utils/codeGenerators.js";
import { toNumber, toPlainAmount } from "../utils/formatters.js";
import { buildTicketSaleInvoicePdf } from "../services/ticketSaleInvoicePdf.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, "../../uploads/ticket-sales");
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
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const customerInlineSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().or(z.literal("")).optional(),
  nationality: z.string().optional(),
  passportNo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

const paymentInputSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentDate: z.string(),
  method: z.string().min(1).default("Cash"),
  note: z.string().optional()
});

const ticketSaleSchema = z.object({
  customerId: z.coerce.number().int().positive().optional(),
  customer: customerInlineSchema.optional(),
  ticketType: z.nativeEnum(TicketType).default("FLIGHT"),
  vendor: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  fromLocation: z.string().optional().nullable(),
  toLocation: z.string().optional().nullable(),
  departAt: z.string().optional().nullable(),
  returnAt: z.string().optional().nullable(),
  passengers: z.coerce.number().int().min(1).default(1),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0),
  serviceFee: z.coerce.number().min(0).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  status: z.nativeEnum(TicketStatus).default("BOOKED"),
  supplierName: z.string().optional().nullable(),
  supplierPaid: z.boolean().optional().default(false),
  supplierPaidDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  payments: z.array(paymentInputSchema).optional()
});

const includeAll = {
  customer: true,
  payments: { orderBy: { paymentDate: "desc" } },
  attachments: { orderBy: { uploadedAt: "desc" } }
};

const serialize = (sale) => ({
  ...sale,
  costPrice: toNumber(sale.costPrice),
  sellingPrice: toNumber(sale.sellingPrice),
  serviceFee: toNumber(sale.serviceFee),
  discountAmount: toNumber(sale.discountAmount),
  totalAmount: toNumber(sale.totalAmount),
  paidAmount: toNumber(sale.paidAmount),
  balanceDue: toNumber(sale.balanceDue),
  margin: toNumber(sale.totalAmount) - toNumber(sale.costPrice),
  payments: sale.payments?.map((p) => ({ ...p, amount: toNumber(p.amount) })),
  attachments: sale.attachments || []
});

const computeAmounts = ({ sellingPrice, serviceFee, discountAmount, paidAmount }) => {
  const selling = toNumber(sellingPrice);
  const fee = toNumber(serviceFee);
  const discount = Math.min(toNumber(discountAmount), selling + fee);
  const total = Math.max(selling + fee - discount, 0);
  const paid = Math.min(toNumber(paidAmount), total);
  const balance = Math.max(total - paid, 0);
  let paymentStatus = PaymentStatus.PENDING;
  if (paid > 0 && paid < total) paymentStatus = PaymentStatus.PARTIAL;
  if (paid >= total && total > 0) paymentStatus = PaymentStatus.PAID;
  return {
    totalAmount: toPlainAmount(total),
    paidAmount: toPlainAmount(paid),
    balanceDue: toPlainAmount(balance),
    discountAmount: toPlainAmount(discount),
    paymentStatus
  };
};

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const status = String(req.query.status || "");
  const items = await prisma.ticketSale.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { saleCode: { contains: q } },
                { reference: { contains: q } },
                { vendor: { contains: q } },
                { customer: { fullName: { contains: q } } }
              ]
            }
          : {},
        status ? { status } : {}
      ]
    },
    include: includeAll,
    orderBy: { createdAt: "desc" }
  });
  res.json({ items: items.map(serialize) });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });
  res.json(serialize(sale));
});

router.post("/", async (req, res) => {
  const body = ticketSaleSchema.parse(req.body);

  let customerId = body.customerId;
  if (!customerId && body.customer) {
    const created = await prisma.customer.create({
      data: {
        ...body.customer,
        email: body.customer.email || null,
        nationality: body.customer.nationality || null,
        passportNo: body.customer.passportNo || null,
        address: body.customer.address || null,
        notes: body.customer.notes || null
      }
    });
    customerId = created.id;
  }
  if (!customerId) return res.status(400).json({ message: "Customer is required" });

  const installments = (body.payments || []).filter((p) => Number(p.amount) > 0);
  const paidSum = installments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const amounts = computeAmounts({
    sellingPrice: body.sellingPrice,
    serviceFee: body.serviceFee,
    discountAmount: body.discountAmount,
    paidAmount: paidSum
  });

  const sale = await prisma.ticketSale.create({
    data: {
      saleCode: await nextTicketSaleCode(prisma),
      customerId,
      ticketType: body.ticketType,
      vendor: body.vendor || null,
      reference: body.reference || null,
      fromLocation: body.fromLocation || null,
      toLocation: body.toLocation || null,
      departAt: body.departAt ? new Date(body.departAt) : null,
      returnAt: body.returnAt ? new Date(body.returnAt) : null,
      passengers: body.passengers,
      costPrice: body.costPrice,
      sellingPrice: body.sellingPrice,
      serviceFee: body.serviceFee,
      discountAmount: amounts.discountAmount,
      totalAmount: amounts.totalAmount,
      paidAmount: amounts.paidAmount,
      balanceDue: amounts.balanceDue,
      paymentStatus: amounts.paymentStatus,
      status: body.status,
      supplierName: body.supplierName || null,
      supplierPaid: !!body.supplierPaid,
      supplierPaidDate: body.supplierPaidDate ? new Date(body.supplierPaidDate) : null,
      note: body.note || null
    },
    include: includeAll
  });

  if (installments.length > 0) {
    await prisma.ticketSalePayment.createMany({
      data: installments.map((p) => ({
        ticketSaleId: sale.id,
        amount: Number(p.amount),
        paymentDate: new Date(p.paymentDate),
        method: p.method || "Cash",
        note: p.note || null
      }))
    });
  }

  const fresh = await prisma.ticketSale.findUnique({ where: { id: sale.id }, include: includeAll });
  res.status(201).json(serialize(fresh));
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = ticketSaleSchema.parse(req.body);
  const existing = await prisma.ticketSale.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Ticket sale not found" });

  const amounts = computeAmounts({
    sellingPrice: body.sellingPrice,
    serviceFee: body.serviceFee,
    discountAmount: body.discountAmount,
    paidAmount: toNumber(existing.paidAmount)
  });

  const updated = await prisma.ticketSale.update({
    where: { id },
    data: {
      customerId: body.customerId || existing.customerId,
      ticketType: body.ticketType,
      vendor: body.vendor || null,
      reference: body.reference || null,
      fromLocation: body.fromLocation || null,
      toLocation: body.toLocation || null,
      departAt: body.departAt ? new Date(body.departAt) : null,
      returnAt: body.returnAt ? new Date(body.returnAt) : null,
      passengers: body.passengers,
      costPrice: body.costPrice,
      sellingPrice: body.sellingPrice,
      serviceFee: body.serviceFee,
      discountAmount: amounts.discountAmount,
      totalAmount: amounts.totalAmount,
      balanceDue: amounts.balanceDue,
      paymentStatus: amounts.paymentStatus,
      status: body.status,
      supplierName: body.supplierName || null,
      supplierPaid: !!body.supplierPaid,
      supplierPaidDate: body.supplierPaidDate ? new Date(body.supplierPaidDate) : null,
      note: body.note || null
    },
    include: includeAll
  });
  res.json(serialize(updated));
});

router.post("/:id/payments", async (req, res) => {
  const id = Number(req.params.id);
  const body = paymentInputSchema.parse(req.body);
  const sale = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });

  await prisma.ticketSalePayment.create({
    data: {
      ticketSaleId: id,
      amount: body.amount,
      paymentDate: new Date(body.paymentDate),
      method: body.method,
      note: body.note || null
    }
  });

  const nextPaid = toNumber(sale.paidAmount) + body.amount;
  const total = toNumber(sale.totalAmount);
  const paymentStatus =
    nextPaid >= total && total > 0
      ? PaymentStatus.PAID
      : nextPaid > 0
        ? PaymentStatus.PARTIAL
        : PaymentStatus.PENDING;

  await prisma.ticketSale.update({
    where: { id },
    data: { paidAmount: nextPaid, balanceDue: Math.max(total - nextPaid, 0), paymentStatus }
  });

  const refreshed = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  res.status(201).json(serialize(refreshed));
});

router.delete("/:id/payments/:paymentId", async (req, res) => {
  const id = Number(req.params.id);
  const paymentId = Number(req.params.paymentId);
  const payment = await prisma.ticketSalePayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.ticketSaleId !== id) return res.status(404).json({ message: "Payment not found" });
  const sale = await prisma.ticketSale.findUnique({ where: { id }, include: { payments: true } });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });

  await prisma.ticketSalePayment.delete({ where: { id: paymentId } });
  const remaining = sale.payments.filter((p) => p.id !== paymentId).reduce((s, p) => s + toNumber(p.amount), 0);
  const total = toNumber(sale.totalAmount);
  const paymentStatus =
    remaining >= total && total > 0
      ? PaymentStatus.PAID
      : remaining > 0
        ? PaymentStatus.PARTIAL
        : PaymentStatus.PENDING;
  await prisma.ticketSale.update({
    where: { id },
    data: { paidAmount: remaining, balanceDue: Math.max(total - remaining, 0), paymentStatus }
  });

  const refreshed = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  res.json(serialize(refreshed));
});

// ----- Invoice -----
router.post("/:id/invoice/generate", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id } });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });
  if (sale.invoiceNumber) {
    return res.json({ invoiceNumber: sale.invoiceNumber, invoicedAt: sale.invoicedAt });
  }
  const invoiceNumber = await nextInvoiceNumber(prisma);
  const updated = await prisma.ticketSale.update({
    where: { id },
    data: { invoiceNumber, invoicedAt: new Date() }
  });
  res.status(201).json({ invoiceNumber: updated.invoiceNumber, invoicedAt: updated.invoicedAt });
});

router.get("/:id/invoice/pdf", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });
  let invoiceNumber = sale.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = await nextInvoiceNumber(prisma);
    await prisma.ticketSale.update({ where: { id }, data: { invoiceNumber, invoicedAt: new Date() } });
  }
  const fresh = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  const opts = {
    showGstin: req.query.showGstin !== "0",
    includeBank: req.query.includeBank !== "0",
    taxRate: Number(req.query.taxRate || 0),
    notes: req.query.notes ? String(req.query.notes) : ""
  };
  const pdf = await buildTicketSaleInvoicePdf(serialize(fresh), invoiceNumber, opts);
  const inline = req.query.inline === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${invoiceNumber}.pdf"`
  );
  res.send(pdf);
});

router.patch("/:id/mark-supplier-paid", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id } });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });
  await prisma.ticketSale.update({
    where: { id },
    data: { supplierPaid: true, supplierPaidDate: new Date() }
  });
  const refreshed = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  res.json(serialize(refreshed));
});

// ----- Attachments -----
router.post("/:id/attachments", upload.array("files", 10), async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id } });
  if (!sale) {
    (req.files || []).forEach((f) => { try { fs.unlinkSync(f.path); } catch { /* ignore */ } });
    return res.status(404).json({ message: "Ticket sale not found" });
  }
  const label = req.body?.label ? String(req.body.label) : null;
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ message: "No files uploaded" });

  await prisma.ticketSaleAttachment.createMany({
    data: files.map((f) => ({
      ticketSaleId: id,
      fileName: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      label
    }))
  });
  const refreshed = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  res.status(201).json(serialize(refreshed));
});

router.get("/:id/attachments/:attachmentId", async (req, res) => {
  const id = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  const att = await prisma.ticketSaleAttachment.findUnique({ where: { id: attachmentId } });
  if (!att || att.ticketSaleId !== id) return res.status(404).json({ message: "Attachment not found" });
  const filePath = path.join(UPLOAD_ROOT, String(id), att.fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing on disk" });
  res.setHeader("Content-Type", att.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${att.originalName}"`);
  fs.createReadStream(filePath).pipe(res);
});

router.delete("/:id/attachments/:attachmentId", async (req, res) => {
  const id = Number(req.params.id);
  const attachmentId = Number(req.params.attachmentId);
  const att = await prisma.ticketSaleAttachment.findUnique({ where: { id: attachmentId } });
  if (!att || att.ticketSaleId !== id) return res.status(404).json({ message: "Attachment not found" });
  const filePath = path.join(UPLOAD_ROOT, String(id), att.fileName);
  if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch { /* ignore */ } }
  await prisma.ticketSaleAttachment.delete({ where: { id: attachmentId } });
  const refreshed = await prisma.ticketSale.findUnique({ where: { id }, include: includeAll });
  res.json(serialize(refreshed));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.ticketSale.findUnique({ where: { id } });
  if (!sale) return res.status(404).json({ message: "Ticket sale not found" });
  await prisma.ticketSale.delete({ where: { id } });
  const dir = path.join(UPLOAD_ROOT, String(id));
  if (fs.existsSync(dir)) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } }
  res.json({ message: "Ticket sale deleted" });
});

export default router;
