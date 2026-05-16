import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { buildInvoicePdf } from "../services/invoicePdf.js";
import { nextInvoiceNumber } from "../utils/codeGenerators.js";

const router = Router();

const invoiceInclude = {
  customer: true,
  travelPackage: true,
  payments: true,
  invoice: true
};

const ensureInvoice = async (bookingId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: invoiceInclude
  });

  if (!booking) {
    return null;
  }

  if (booking.invoice) {
    return booking;
  }

  await prisma.invoice.create({
    data: {
      bookingId,
      invoiceNumber: await nextInvoiceNumber(prisma)
    }
  });

  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: invoiceInclude
  });
};

router.post("/:bookingId/generate", async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const booking = await ensureInvoice(bookingId);
  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }
  res.json({ invoice: booking.invoice });
});

router.get("/:bookingId/pdf", async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const booking = await ensureInvoice(bookingId);

  if (!booking) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const opts = {
    showGstin: req.query.showGstin !== "0",
    includeBank: req.query.includeBank !== "0",
    taxRate: Number(req.query.taxRate || 0),
    notes: req.query.notes ? String(req.query.notes) : ""
  };
  const pdf = await buildInvoicePdf(booking, opts);
  const inline = req.query.inline === "1";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${inline ? "inline" : "attachment"}; filename="${booking.invoice.invoiceNumber}.pdf"`
  );
  res.send(pdf);
});

router.patch("/:id/sent", async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { sentStatus: true }
  });
  res.json(invoice);
});

export default router;
