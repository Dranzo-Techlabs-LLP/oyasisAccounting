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
  `INR ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const labelValue = (doc, label, value, x, y, width = 200) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#57658a").text(label, x, y, { width });
  doc.font("Helvetica").fontSize(16).fillColor("#1d3a6e").text(value, x, y + 16, { width });
};

const sectionTitle = (doc, text, x, y) => {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#1d3a6e").text(text, x, y);
};

const detailLine = (doc, text, x, y, width) => {
  doc.font("Helvetica").fontSize(11).fillColor("#142447").text(text, x, y, { width });
};

const tableRow = (doc, label, value, y, options = {}) => {
  const { bold = false, borderTop = false } = options;
  if (borderTop) {
    doc.moveTo(54, y - 8).lineTo(541, y - 8).stroke("#dbe4f0");
  }
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(11)
    .fillColor("#142447")
    .text(label, 58, y, { width: 260 });
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(11)
    .fillColor("#142447")
    .text(value, 380, y, { width: 150, align: "right" });
};

export const buildInvoicePdf = async (booking, options = {}) => {
  const settings = await getSettings();
  const showGstin = options.showGstin !== false; // default true
  const includeBank = options.includeBank !== false;
  const taxRate = Number(options.taxRate || 0);
  const customNote = options.notes || "";
  return new Promise((resolve, reject) => {
    // A4 is 841.89pt tall. A generous bottom margin (50) plus footer lines
    // pinned near the page bottom used to push content past the margin, which
    // makes PDFKit auto-append a blank second page. A smaller bottom margin
    // keeps the whole invoice on one page when the content is short.
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 24, left: 50, right: 50 } });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Logo
    if (settings.logoFileName) {
      const logoPath = path.join(LOGO_DIR, settings.logoFileName);
      if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 46, 40, { fit: [80, 80] }); } catch { /* ignore */ }
      }
    }
    const headerX = settings.logoFileName ? 140 : 46;
    doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(26).text(settings.businessName || "OasisGo Holidays", headerX, 44);
    const addressLine = [settings.address, settings.city, settings.state, settings.country, settings.postalCode].filter(Boolean).join(", ");
    const contactLine = [settings.phone && `Phone: ${settings.phone}`, settings.email && `Email: ${settings.email}`, settings.website].filter(Boolean).join(" | ");
    const taxLine = showGstin
      ? [settings.gstin && `GSTIN: ${settings.gstin}`, settings.pan && `PAN: ${settings.pan}`].filter(Boolean).join(" | ")
      : "";
    doc
      .fillColor("#4f6464")
      .font("Helvetica")
      .fontSize(10)
      .text(addressLine || " ", headerX, 80, { width: 280 })
      .text(contactLine || " ", headerX, 96, { width: 280 })
      .text(taxLine || " ", headerX, 112, { width: 280 });

    doc
      .save()
      .roundedRect(404, 48, 140, 44, 10)
      .fillAndStroke("#f6efe0", "#f5a623")
      .fillColor("#7a4b00")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(booking.invoice?.sentStatus ? "SENT" : "DRAFT", 404, 63, {
        width: 140,
        align: "center"
      })
      .restore();

    doc
      .fillColor("#123636")
      .font("Helvetica-Bold")
      .fontSize(28)
      .text("Invoice", 404, 116, { width: 140, align: "center" });

    labelValue(doc, "Invoice No", booking.invoice.invoiceNumber, 46, 166, 150);
    labelValue(doc, "Invoice Date", formatDate(booking.invoice.issuedDate), 208, 166, 140);
    labelValue(doc, "Booking ID", booking.bookingCode, 360, 166, 140);

    // ---------- Bill To + Package Details (dynamic height) ----------
    const billLines = [
      booking.customer.fullName,
      booking.customer.phone,
      booking.customer.email || "No email provided"
    ];
    const endRange = booking.endDate
      ? `${formatDate(booking.departureDate)} → ${formatDate(booking.endDate)}`
      : `Departure ${formatDate(booking.departureDate)}`;
    const pkgLines = [
      booking.travelPackage.name,
      booking.travelPackage.destination,
      `${booking.travelPackage.durationDays} Days / ${booking.travelPackage.durationNights} Nights`,
      endRange
    ];
    const detailsTop = 240;
    const titleOffset = 18;
    const firstLineOffset = 42; // y of first detail line relative to card top
    const lineHeight = 18;
    const bottomPad = 14;
    const maxLines = Math.max(billLines.length, pkgLines.length);
    const cardHeight = firstLineOffset + maxLines * lineHeight + bottomPad - lineHeight; // last line baseline
    // simpler: lines fit cleanly if card spans firstLineOffset + maxLines*lineHeight + bottomPad
    const cardH = firstLineOffset + (maxLines - 1) * lineHeight + bottomPad + 4;

    doc.roundedRect(46,  detailsTop, 240, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");
    doc.roundedRect(304, detailsTop, 240, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");

    sectionTitle(doc, "Bill To", 60, detailsTop + titleOffset);
    billLines.forEach((txt, i) => {
      detailLine(doc, txt, 60, detailsTop + firstLineOffset + i * lineHeight, 210);
    });

    sectionTitle(doc, "Package Details", 318, detailsTop + titleOffset);
    pkgLines.forEach((txt, i) => {
      detailLine(doc, txt, 318, detailsTop + firstLineOffset + i * lineHeight, 210);
    });

    // Anchor for cost table — placed cleanly below info cards
    const detailsBottom = detailsTop + cardH;

    // ---------- Cost Breakdown (dynamic layout) ----------
    const baseTotal = toNumber(booking.totalAmount);
    const taxAmount = taxRate > 0 ? baseTotal * (taxRate / 100) : 0;
    const displayTotal = baseTotal + taxAmount;
    const displayBalance = Math.max(displayTotal - toNumber(booking.paidAmount), 0);
    const extras = booking.extraCharges || [];

    // Use per-booking price overrides when set so the invoice matches the
    // booking's actual cost basis rather than the default package price.
    const effAdultRate = booking.adultPriceOverride != null
      ? toNumber(booking.adultPriceOverride)
      : toNumber(booking.travelPackage.priceAdult);
    const effChildRate = booking.childPriceOverride != null
      ? toNumber(booking.childPriceOverride)
      : toNumber(booking.travelPackage.priceChild);

    // Row definitions: { label, value, bold, borderTop, gap (px below) }
    // Only include lines that carry meaningful value. Empty / zero rows are
    // omitted so the invoice doesn't surface "Child rate × 0" or
    // "Visa Fees · INR 0.00" when those weren't actually charged.
    // Fare rows always spell out the per-pax rate and the multiplier, even
    // when the count is 1 — so the invoice reads consistently. Example:
    //   "Adult fare [INR 28,999.00] × 5"
    //   "Child fare [INR 19,999.00] × 1"
    // Non-fare extras (Visa Fees, Insurance) stay on their single line.
    const rows = [];
    const adultCount = Number(booking.adults || 0);
    const adultLineTotal = effAdultRate * adultCount;
    if (adultCount > 0 && adultLineTotal > 0) {
      rows.push({
        label: `Adult fare [${money(effAdultRate)}] × ${adultCount}`,
        value: money(adultLineTotal),
        gap: 22
      });
    }
    const childCount = Number(booking.children || 0);
    const childLineTotal = effChildRate * childCount;
    if (childCount > 0 && childLineTotal > 0) {
      rows.push({
        label: `Child fare [${money(effChildRate)}] × ${childCount}`,
        value: money(childLineTotal),
        gap: 22
      });
    }
    extras.forEach((c) => {
      const amt = toNumber(c.amount);
      const label = String(c.label || "").trim();
      if (amt > 0 && label) {
        rows.push({ label, value: money(amt), gap: 22 });
      }
    });
    rows.push({ label: "Subtotal", value: money(booking.subtotalAmount), bold: true, borderTop: true, gap: 24 });
    if (toNumber(booking.discountAmount) > 0) {
      rows.push({ label: "Discount", value: `- ${money(booking.discountAmount)}`, gap: 22 });
    }
    if (taxAmount > 0) {
      rows.push({ label: `GST @ ${taxRate}%`, value: money(taxAmount), gap: 22 });
    }
    rows.push({ label: "Total Amount", value: money(displayTotal), bold: true, borderTop: true, gap: 26 });
    if (toNumber(booking.paidAmount) > 0) {
      rows.push({ label: "Amount Paid", value: money(booking.paidAmount), gap: 22 });
    }
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

    // ---------- Footer block (positioned cleanly below table) ----------
    let footerY = baseY + tableHeight + 18;

    // Payment status pill
    const statusColors = {
      PAID: { bg: "#e6f7ee", text: "#0a6f3e" },
      PARTIAL: { bg: "#fff4e0", text: "#9b5b00" },
      PENDING: { bg: "#fde6ec", text: "#a01a3c" }
    };
    const pill = statusColors[booking.paymentStatus] || { bg: "#eef3fa", text: "#1d3a6e" };
    const pillText = `Payment Status: ${booking.paymentStatus}`;
    doc.font("Helvetica-Bold").fontSize(11);
    const pillW = doc.widthOfString(pillText) + 24;
    doc.roundedRect(46, footerY, pillW, 26, 13).fillAndStroke(pill.bg, pill.bg);
    doc.fillColor(pill.text).text(pillText, 46 + 12, footerY + 8);
    footerY += 38;

    // Bank details
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

    // Custom note
    if (customNote) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1d3a6e").text("Note", 46, footerY);
      footerY += 14;
      doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(customNote, 46, footerY, { width: 498 });
      footerY += Math.ceil(doc.heightOfString(customNote, { width: 498 })) + 10;
    }

    // Footer line + thank-you
    if (footerY < 740) {
      doc.moveTo(46, footerY).lineTo(544, footerY).stroke("#dbe4f0");
      footerY += 10;
      doc.font("Helvetica").fontSize(9).fillColor("#8b97b3").text(
        `Thank you for choosing ${settings.businessName || "OyasisGo Holidays"}.`,
        46, footerY, { width: 498, align: "center" }
      );
      footerY += 14;
    }

    // Generated line pinned at the bottom of page 1.
    doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(
      `Generated by ${settings.businessName || "OyasisGo Holidays"} · System invoice — valid without signature`,
      46, 792, { width: 498, align: "center", lineBreak: false }
    );

    // ---------- Terms & Conditions on a dedicated page ----------
    // Printed on its own page so the full text is never truncated. The page
    // count follows the content: no terms -> single page; with terms -> a
    // second page (and PDFKit paginates onto further pages if the terms are
    // very long).
    const termsText = settings.invoiceTerms && String(settings.invoiceTerms).trim();
    if (termsText) {
      doc.addPage();
      // Slim brand header so the terms page is clearly part of the invoice.
      doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(18)
        .text(settings.businessName || "OyasisGo Holidays", 46, 48, { lineBreak: false });
      doc.fillColor("#57658a").font("Helvetica").fontSize(9)
        .text(`Invoice ${booking.invoice.invoiceNumber} · Booking ${booking.bookingCode}`, 46, 72, { lineBreak: false });
      doc.moveTo(46, 92).lineTo(549, 92).stroke("#dbe4f0");

      doc.fillColor("#123636").font("Helvetica-Bold").fontSize(15)
        .text("Terms & Conditions", 46, 108);

      // Full terms, word-wrapped. Newlines in the stored text are preserved,
      // and the block flows/paginates naturally for long content.
      doc.font("Helvetica").fontSize(10).fillColor("#142447").text(
        termsText,
        46, 138,
        { width: 503, align: "left", lineGap: 3, paragraphGap: 6 }
      );
    }

    doc.end();
  });
};
