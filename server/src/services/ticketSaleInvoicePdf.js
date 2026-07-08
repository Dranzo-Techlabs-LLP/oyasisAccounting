import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { formatDate, toNumber } from "../utils/formatters.js";
import { getSettings } from "../lib/settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_DIR = path.resolve(__dirname, "../../uploads/branding");

const money = (value) =>
  `INR ${toNumber(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const sectionTitle = (doc, text, x, y) => {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1d3a6e").text(text, x, y);
};
const detailLine = (doc, text, x, y, w) => {
  doc.font("Helvetica").fontSize(11).fillColor("#294a4a").text(text, x, y, { width: w });
};
const tableRow = (doc, label, value, y, { bold = false, borderTop = false } = {}) => {
  if (borderTop) doc.moveTo(54, y - 8).lineTo(541, y - 8).stroke("#d7e8e6");
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(11).fillColor("#173f3f").text(label, 58, y, { width: 260 });
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(11).fillColor("#173f3f").text(value, 380, y, { width: 150, align: "right" });
};

const TICKET_TYPE_LABEL = {
  FLIGHT: "Flight", TRAIN: "Train", BUS: "Bus", CAR: "Car",
  BOAT: "Boat", FERRY: "Ferry", OTHER: "Ticket"
};

export const buildTicketSaleInvoicePdf = async (sale, invoiceNumber, options = {}) => {
  const settings = await getSettings();
  const showGstin = options.showGstin !== false;
  const includeBank = options.includeBank !== false;
  const taxRate = Number(options.taxRate || 0);
  const customNote = options.notes || "";
  return new Promise((resolve, reject) => {
    // Smaller bottom margin so short invoices stay on one page (see
    // invoicePdf.js for the full explanation of the blank-second-page bug).
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 24, left: 50, right: 50 } });
    const buffers = [];
    doc.on("data", (c) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header / logo
    if (settings.logoFileName) {
      const logoPath = path.join(LOGO_DIR, settings.logoFileName);
      if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 46, 40, { fit: [80, 80] }); } catch { /* ignore */ }
      }
    }
    const headerX = settings.logoFileName ? 140 : 46;
    doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(26)
      .text(settings.businessName || "OasisGo Holidays", headerX, 44);
    const addressLine = [settings.address, settings.city, settings.state, settings.country, settings.postalCode].filter(Boolean).join(", ");
    const contactLine = [settings.phone && `Phone: ${settings.phone}`, settings.email && `Email: ${settings.email}`, settings.website].filter(Boolean).join(" | ");
    const taxLine = showGstin
      ? [settings.gstin && `GSTIN: ${settings.gstin}`, settings.pan && `PAN: ${settings.pan}`].filter(Boolean).join(" | ")
      : "";
    doc.fillColor("#57658a").font("Helvetica").fontSize(10)
      .text(addressLine || " ", headerX, 80, { width: 280 })
      .text(contactLine || " ", headerX, 96, { width: 280 })
      .text(taxLine || " ", headerX, 112, { width: 280 });

    // Right badge
    doc.save().roundedRect(404, 48, 140, 44, 10).fillAndStroke("#f6efe0", "#f5a623")
      .fillColor("#7a4b00").font("Helvetica-Bold").fontSize(14)
      .text("TICKET INVOICE", 404, 63, { width: 140, align: "center" }).restore();
    doc.fillColor("#123636").font("Helvetica-Bold").fontSize(24)
      .text(invoiceNumber, 404, 116, { width: 140, align: "center" });

    // Invoice meta
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#567070").text("Invoice No", 46, 166);
    doc.font("Helvetica").fontSize(14).fillColor("#1d3a6e").text(invoiceNumber, 46, 182);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#567070").text("Invoice Date", 220, 166);
    doc.font("Helvetica").fontSize(14).fillColor("#1d3a6e").text(formatDate(new Date()), 220, 182);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#567070").text("Sale Code", 380, 166);
    doc.font("Helvetica").fontSize(14).fillColor("#1d3a6e").text(sale.saleCode, 380, 182);

    // ---------- Bill To + Ticket Details (dynamic height) ----------
    const billLines = [
      sale.customer?.fullName || "Customer",
      sale.customer?.phone || "",
      sale.customer?.email || "No email provided"
    ].filter(Boolean);
    const ticketLines = [
      `${TICKET_TYPE_LABEL[sale.ticketType] || "Ticket"} via ${sale.vendor || "—"}`,
      `Ref: ${sale.reference || "—"}`,
      `${sale.fromLocation || "?"} → ${sale.toLocation || "?"}`,
      `Depart: ${sale.departAt ? formatDate(sale.departAt) : "—"}${sale.returnAt ? `  ·  Return: ${formatDate(sale.returnAt)}` : ""}`
    ];
    const detailsTop = 240;
    const titleOffset = 18;
    const firstLineOffset = 42;
    const lineHeight = 18;
    const bottomPad = 14;
    const maxLines = Math.max(billLines.length, ticketLines.length);
    const cardH = firstLineOffset + (maxLines - 1) * lineHeight + bottomPad + 4;

    doc.roundedRect(46,  detailsTop, 240, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");
    doc.roundedRect(304, detailsTop, 240, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");

    sectionTitle(doc, "Bill To", 60, detailsTop + titleOffset);
    billLines.forEach((txt, i) => {
      detailLine(doc, txt, 60, detailsTop + firstLineOffset + i * lineHeight, 210);
    });

    sectionTitle(doc, "Ticket Details", 318, detailsTop + titleOffset);
    ticketLines.forEach((txt, i) => {
      detailLine(doc, txt, 318, detailsTop + firstLineOffset + i * lineHeight, 210);
    });

    const detailsBottom = detailsTop + cardH;

    // ---------- Cost Breakdown (dynamic) ----------
    const baseTotal = toNumber(sale.totalAmount);
    const taxAmount = taxRate > 0 ? baseTotal * (taxRate / 100) : 0;
    const displayTotal = baseTotal + taxAmount;
    const displayBalance = Math.max(displayTotal - toNumber(sale.paidAmount), 0);

    // Show the per-pax rate in brackets and the multiplier inline so the
    // buyer can see how the total was calculated. Format is consistent
    // whether the sale is for 1 passenger or 10:
    //   "Ticket fare [INR 6,500.00] × 2 pax"
    //   "Ticket fare [INR 6,500.00] × 1 pax"
    const pax = Number(sale.passengers || 1);
    const perPax = pax > 0 ? toNumber(sale.sellingPrice) / pax : toNumber(sale.sellingPrice);
    const fareLabel = `Ticket fare [${money(perPax)}] × ${pax} pax`;
    const rows = [
      { label: fareLabel, value: money(sale.sellingPrice), gap: 22 }
    ];
    if (toNumber(sale.serviceFee) > 0) {
      rows.push({ label: "Service Fee", value: money(sale.serviceFee), gap: 22 });
    }
    rows.push({ label: "Subtotal", value: money(toNumber(sale.sellingPrice) + toNumber(sale.serviceFee)), bold: true, borderTop: true, gap: 24 });
    if (toNumber(sale.discountAmount) > 0) {
      rows.push({ label: "Discount", value: `- ${money(sale.discountAmount)}`, gap: 22 });
    }
    if (taxAmount > 0) {
      rows.push({ label: `GST @ ${taxRate}%`, value: money(taxAmount), gap: 22 });
    }
    rows.push({ label: "Total Amount", value: money(displayTotal), bold: true, borderTop: true, gap: 26 });
    rows.push({ label: "Amount Paid", value: money(sale.paidAmount), gap: 22 });
    rows.push({ label: "Balance Due", value: money(displayBalance), bold: true, gap: 0 });

    const TITLE_PAD_TOP = 18;
    const TITLE_HEIGHT = 28;
    const ROW_PAD_BOTTOM = 20;
    const baseY = detailsBottom + 18;
    const contentHeight = rows.reduce((sum, r) => sum + r.gap, 0) + 22;
    const tableHeight = TITLE_PAD_TOP + TITLE_HEIGHT + contentHeight + ROW_PAD_BOTTOM;

    doc.roundedRect(46, baseY, 498, tableHeight, 12).fillAndStroke("#ffffff", "#dbe4f0");
    sectionTitle(doc, "Cost Breakdown", 60, baseY + TITLE_PAD_TOP);

    let cursorY = baseY + TITLE_PAD_TOP + TITLE_HEIGHT;
    for (const row of rows) {
      tableRow(doc, row.label, row.value, cursorY, { bold: !!row.bold, borderTop: !!row.borderTop });
      cursorY += row.gap > 0 ? row.gap : 22;
    }

    // ---------- Footer ----------
    let footerY = baseY + tableHeight + 18;

    const statusColors = {
      PAID: { bg: "#e6f7ee", text: "#0a6f3e" },
      PARTIAL: { bg: "#fff4e0", text: "#9b5b00" },
      PENDING: { bg: "#fde6ec", text: "#a01a3c" }
    };
    const pill = statusColors[sale.paymentStatus] || { bg: "#eef3fa", text: "#1d3a6e" };
    const pillText = `Payment Status: ${sale.paymentStatus}`;
    doc.font("Helvetica-Bold").fontSize(11);
    const pillW = doc.widthOfString(pillText) + 24;
    doc.roundedRect(46, footerY, pillW, 26, 13).fillAndStroke(pill.bg, pill.bg);
    doc.fillColor(pill.text).text(pillText, 46 + 12, footerY + 8);
    footerY += 38;

    if (includeBank) {
      const bankItems = [
        settings.bankName && `Bank: ${settings.bankName}`,
        settings.bankAccountName && `A/C Name: ${settings.bankAccountName}`,
        settings.bankAccountNumber && `A/C No: ${settings.bankAccountNumber}`,
        settings.bankIfsc && `IFSC: ${settings.bankIfsc}`,
        settings.bankBranch && `Branch: ${settings.bankBranch}`,
        settings.upiId && `UPI: ${settings.upiId}`
      ].filter(Boolean);
      if (bankItems.length > 0) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1d3a6e").text("Payment Details", 46, footerY);
        footerY += 14;
        doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(bankItems.join("  ·  "), 46, footerY, { width: 498 });
        footerY += Math.ceil(doc.heightOfString(bankItems.join("  ·  "), { width: 498 })) + 12;
      }
    }
    if (customNote) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1d3a6e").text("Note", 46, footerY);
      footerY += 14;
      doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(customNote, 46, footerY, { width: 498 });
      footerY += Math.ceil(doc.heightOfString(customNote, { width: 498 })) + 10;
    }
    if (footerY < 740) {
      doc.moveTo(46, footerY).lineTo(544, footerY).stroke("#dbe4f0");
      footerY += 10;
      doc.font("Helvetica").fontSize(9).fillColor("#8b97b3").text(
        `Thank you for choosing ${settings.businessName || "OyasisGo Holidays"}.`,
        46, footerY, { width: 498, align: "center" }
      );
    }
    doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(
      `Generated by ${settings.businessName || "OyasisGo Holidays"} · System invoice — valid without signature`,
      46, 792, { width: 498, align: "center", lineBreak: false }
    );

    // ---------- Terms & Conditions on a dedicated page ----------
    const termsText = settings.invoiceTerms && String(settings.invoiceTerms).trim();
    if (termsText) {
      doc.addPage();
      doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(18)
        .text(settings.businessName || "OyasisGo Holidays", 46, 48, { lineBreak: false });
      doc.fillColor("#57658a").font("Helvetica").fontSize(9)
        .text(`Invoice ${sale.invoiceNumber || sale.saleCode}`, 46, 72, { lineBreak: false });
      doc.moveTo(46, 92).lineTo(549, 92).stroke("#dbe4f0");
      doc.fillColor("#123636").font("Helvetica-Bold").fontSize(15)
        .text("Terms & Conditions", 46, 108);
      doc.font("Helvetica").fontSize(10).fillColor("#142447").text(
        termsText, 46, 138, { width: 503, align: "left", lineGap: 3, paragraphGap: 6 }
      );
    }

    doc.end();
  });
};
