import { VendorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { toNumber } from "../utils/formatters.js";

const router = Router();

const vendorSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(VendorType).default("B2B"),
  contactName: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  openingBalance: z.coerce.number().default(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true)
});

const serialize = (v) => ({
  ...v,
  openingBalance: toNumber(v.openingBalance)
});

router.get("/", async (req, res) => {
  const q = String(req.query.q || "");
  const items = await prisma.vendor.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { gstin: { contains: q } }
          ]
        }
      : {},
    orderBy: { name: "asc" }
  });
  res.json({ items: items.map(serialize) });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const v = await prisma.vendor.findUnique({
    where: { id },
    include: { invoices: { orderBy: { issueDate: "desc" } } }
  });
  if (!v) return res.status(404).json({ message: "Vendor not found" });
  res.json({
    ...serialize(v),
    invoices: v.invoices.map((inv) => ({
      ...inv,
      subtotalAmount: toNumber(inv.subtotalAmount),
      taxAmount: toNumber(inv.taxAmount),
      discountAmount: toNumber(inv.discountAmount),
      totalAmount: toNumber(inv.totalAmount),
      paidAmount: toNumber(inv.paidAmount),
      balanceDue: toNumber(inv.balanceDue)
    }))
  });
});

router.post("/", async (req, res) => {
  const body = vendorSchema.parse(req.body);
  const v = await prisma.vendor.create({ data: { ...body, email: body.email || null } });
  res.status(201).json(serialize(v));
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = vendorSchema.parse(req.body);
  const v = await prisma.vendor.update({
    where: { id },
    data: { ...body, email: body.email || null }
  });
  res.json(serialize(v));
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const invoiceCount = await prisma.vendorInvoice.count({ where: { vendorId: id } });
  if (invoiceCount > 0) {
    return res.status(400).json({ message: `Vendor has ${invoiceCount} invoice(s). Delete or reassign them first.` });
  }
  await prisma.vendor.delete({ where: { id } });
  res.json({ message: "Vendor deleted" });
});

export default router;
