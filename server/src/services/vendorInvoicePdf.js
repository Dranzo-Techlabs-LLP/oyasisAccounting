import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { formatDate, toNumber } from "../utils/formatters.js";
import { getSettings } from "../lib/settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_DIR = path.resolve(__dirname, "../../uploads/branding");

const money = (value, currency = "INR") =>
  `${currency} ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const sectionTitle = (doc, text, x, y) => {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#1d3a6e").text(text, x, y);
};
const detailLine = (doc, text, x, y, w) => {
  doc.font("Helvetica").fontSize(10).fillColor("#142447").text(text || " ", x, y, { width: w });
};

const tableRow = (doc, cells, y, { bold = false, borderTop = false } = {}) => {
  if (borderTop) doc.moveTo(46, y - 6).lineTo(549, y - 6).stroke("#dbe4f0");
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#142447");
  // cells: array of { text, x, width, align }
  for (const c of cells) {
    doc.text(c.text, c.x, y, { width: c.width, align: c.align || "left" });
  }
};

export const buildVendorInvoicePdf = async (invoice, options = {}) => {
  const settings = await getSettings();
  const showGstin = options.showGstin !== false && invoice.showGstin !== false;
  const includeBank = options.includeBank !== false && invoice.includeBank !== false;
  const customNote = options.notes || invoice.notes || "";

  return new Promise((resolve, reject) => {
    // Smaller bottom margin so short invoices stay on one page (see
    // invoicePdf.js for the full explanation of the blank-second-page bug).
    const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 24, left: 50, right: 50 } });
    const buffers = [];
    doc.on("data", (c) => buffers.push(c));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // ---------- Header ----------
    if (settings.logoFileName) {
      const logoPath = path.join(LOGO_DIR, settings.logoFileName);
      if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 46, 40, { fit: [80, 80] }); } catch { /* ignore */ }
      }
    }
    const headerX = settings.logoFileName ? 140 : 46;
    doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(24)
      .text(settings.businessName || "OyasisGo Holidays", headerX, 44);
    const addressLine = [settings.address, settings.city, settings.state, settings.country, settings.postalCode].filter(Boolean).join(", ");
    const contactLine = [settings.phone && `Phone: ${settings.phone}`, settings.email && `Email: ${settings.email}`, settings.website].filter(Boolean).join(" | ");
    const taxLine = showGstin
      ? [settings.gstin && `GSTIN: ${settings.gstin}`, settings.pan && `PAN: ${settings.pan}`].filter(Boolean).join(" | ")
      : "";
    doc.fillColor("#57658a").font("Helvetica").fontSize(9)
      .text(addressLine || " ", headerX, 78, { width: 280 })
      .text(contactLine || " ", headerX, 92, { width: 280 })
      .text(taxLine || " ", headerX, 106, { width: 280 });

    // Right badge
    doc.save()
      .roundedRect(404, 48, 140, 44, 10)
      .fillAndStroke("#fff4e0", "#f08826")
      .fillColor("#9b5b00")
      .font("Helvetica-Bold").fontSize(12)
      .text("TAX INVOICE", 404, 65, { width: 140, align: "center" })
      .restore();
    doc.fillColor("#142447").font("Helvetica-Bold").fontSize(20)
      .text(invoice.invoiceNumber, 404, 116, { width: 140, align: "center" });

    // Invoice meta strip
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#57658a").text("Invoice Date", 46, 158);
    doc.font("Helvetica").fontSize(12).fillColor("#142447").text(formatDate(invoice.issueDate), 46, 172);
    if (invoice.dueDate) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#57658a").text("Due Date", 200, 158);
      doc.font("Helvetica").fontSize(12).fillColor("#142447").text(formatDate(invoice.dueDate), 200, 172);
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#57658a").text("Status", 360, 158);
    const statusColors = {
      DRAFT: { bg: "#eef3fa", text: "#1d3a6e" },
      SENT: { bg: "#fff4e0", text: "#9b5b00" },
      PAID: { bg: "#e6f7ee", text: "#0a6f3e" },
      OVERDUE: { bg: "#fde6ec", text: "#a01a3c" },
      CANCELLED: { bg: "#eceff5", text: "#57658a" }
    };
    const pill = statusColors[invoice.status] || statusColors.DRAFT;
    doc.font("Helvetica-Bold").fontSize(10);
    const sw = doc.widthOfString(invoice.status) + 16;
    doc.roundedRect(360, 172, sw, 18, 9).fillAndStroke(pill.bg, pill.bg);
    doc.fillColor(pill.text).text(invoice.status, 360 + 8, 176);

    // ---------- Bill To + Notes/Reference ----------
    const v = invoice.vendor || {};
    const billLines = [
      v.name,
      v.contactName,
      v.phone,
      v.email,
      [v.address, v.city, v.state, v.postalCode, v.country].filter(Boolean).join(", "),
      showGstin && v.gstin && `GSTIN: ${v.gstin}`,
      showGstin && v.pan && `PAN: ${v.pan}`
    ].filter(Boolean);

    const detailsTop = 208;
    const firstLineOffset = 38;
    const lineHeight = 16;
    const maxLines = Math.max(billLines.length, 3);
    const cardH = firstLineOffset + (maxLines - 1) * lineHeight + 18;

    doc.roundedRect(46, detailsTop, 320, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");
    doc.roundedRect(384, detailsTop, 160, cardH, 10).fillAndStroke("#f7faff", "#dbe4f0");

    sectionTitle(doc, "Bill To", 60, detailsTop + 14);
    billLines.forEach((txt, i) => {
      detailLine(doc, txt, 60, detailsTop + firstLineOffset + i * lineHeight, 290);
    });

    sectionTitle(doc, "Reference", 396, detailsTop + 14);
    detailLine(doc, invoice.reference || "—", 396, detailsTop + firstLineOffset, 140);
    detailLine(doc, `Currency: ${invoice.currency || "INR"}`, 396, detailsTop + firstLineOffset + lineHeight, 140);

    const tableTop = detailsTop + cardH + 20;

    // ---------- Items table ----------
    // Columns: # | Description | Qty | Rate | Tax% | Amount
    // The Rate cell embeds "unit x qty" inline (e.g. "INR 28,999 x 5") so a
    // buyer can verify the line total without a separate Calc column.
    const colX = { idx: 46, desc: 76, qty: 326, rate: 360, tax: 442, total: 488 };
    const colW = { idx: 26, desc: 248, qty: 30, rate: 78, tax: 42, total: 60 };

    // Header
    doc.rect(46, tableTop, 503, 24).fillAndStroke("#1d3a6e", "#1d3a6e");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    doc.text("#", colX.idx + 6, tableTop + 8, { width: colW.idx });
    doc.text("Description", colX.desc, tableTop + 8, { width: colW.desc });
    doc.text("Qty", colX.qty, tableTop + 8, { width: colW.qty, align: "right" });
    doc.text("Rate", colX.rate, tableTop + 8, { width: colW.rate, align: "right" });
    doc.text("Tax %", colX.tax, tableTop + 8, { width: colW.tax, align: "right" });
    doc.text("Amount", colX.total, tableTop + 8, { width: colW.total, align: "right" });

    let rowY = tableTop + 30;
    const items = (invoice.items || []);
    items.forEach((item, idx) => {
      if (rowY > 720) {
        doc.addPage();
        rowY = 60;
      }
      const zebra = idx % 2 === 1;
      if (zebra) {
        doc.rect(46, rowY - 6, 503, 24).fill("#f7faff");
      }
      const qty = toNumber(item.quantity);
      const unit = toNumber(item.unitPrice);
      const rateText = qty > 1 && unit > 0
        ? `${money(unit, invoice.currency)} x ${qty}`
        : money(unit, invoice.currency);
      doc.font("Helvetica").fontSize(10).fillColor("#142447");
      doc.text(String(idx + 1), colX.idx + 6, rowY, { width: colW.idx });
      doc.text(item.description, colX.desc, rowY, { width: colW.desc });
      doc.text(String(qty), colX.qty, rowY, { width: colW.qty, align: "right" });
      doc.text(rateText, colX.rate - 4, rowY, { width: colW.rate + 4, align: "right" });
      doc.text(`${toNumber(item.taxRate)}%`, colX.tax, rowY, { width: colW.tax, align: "right" });
      doc.text(money(item.totalAmount, invoice.currency), colX.total - 10, rowY, { width: colW.total + 10, align: "right" });
      rowY += 24;
    });

    // ---------- Totals box ----------
    const totalsTop = rowY + 12;
    const totalsRows = [
      ["Subtotal", money(invoice.subtotalAmount, invoice.currency)],
      ...(toNumber(invoice.discountAmount) > 0 ? [["Discount", `- ${money(invoice.discountAmount, invoice.currency)}`]] : []),
      ...(toNumber(invoice.taxAmount) > 0 ? [["Tax (GST)", money(invoice.taxAmount, invoice.currency)]] : []),
      ["Total", money(invoice.totalAmount, invoice.currency), { bold: true, borderTop: true }],
      ["Amount Paid", money(invoice.paidAmount, invoice.currency)],
      ["Balance Due", money(invoice.balanceDue, invoice.currency), { bold: true }]
    ];
    let ty = totalsTop;
    for (const [label, value, opts = {}] of totalsRows) {
      tableRow(doc,
        [
          { text: label, x: 326, width: 130, align: "right" },
          { text: value, x: 460, width: 90, align: "right" }
        ], ty, opts);
      ty += 20;
    }

    // ---------- Footer ----------
    let footerY = Math.max(ty + 20, 700);

    if (includeBank) {
      const bankItems = [
        settings.bankName && `Bank: ${settings.bankName}`,
        settings.bankAccountName && `A/C Name: ${settings.bankAccountName}`,
        settings.bankAccountNumber && `A/C No: ${settings.bankAccountNumber}`,
        settings.bankIfsc && `IFSC: ${settings.bankIfsc}`,
        settings.bankBranch && `Branch: ${settings.bankBranch}`,
        settings.upiId && `UPI: ${settings.upiId}`
      ].filter(Boolean);
      if (bankItems.length > 0 && footerY < 740) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1d3a6e").text("Payment Details", 46, footerY);
        footerY += 14;
        doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(bankItems.join("  ·  "), 46, footerY, { width: 498 });
        footerY += Math.ceil(doc.heightOfString(bankItems.join("  ·  "), { width: 498 })) + 10;
      }
    }

    if (customNote && footerY < 750) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1d3a6e").text("Note", 46, footerY);
      footerY += 14;
      doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(customNote, 46, footerY, { width: 498 });
      footerY += Math.ceil(doc.heightOfString(customNote, { width: 498 })) + 8;
    }

    doc.font("Helvetica").fontSize(9).fillColor("#57658a").text(
      `Generated by ${settings.businessName || "OyasisGo Holidays"} · System invoice — valid without signature`,
      46, 792, { width: 498, align: "center", lineBreak: false }
    );

    // ---------- Terms & Conditions on a dedicated page ----------
    // Prefer the invoice's own terms; fall back to the business default.
    const termsText = (invoice.terms && String(invoice.terms).trim())
      || (settings.invoiceTerms && String(settings.invoiceTerms).trim());
    if (termsText) {
      doc.addPage();
      doc.fillColor("#1d3a6e").font("Helvetica-Bold").fontSize(18)
        .text(settings.businessName || "OyasisGo Holidays", 46, 48, { lineBreak: false });
      doc.fillColor("#57658a").font("Helvetica").fontSize(9)
        .text(`Invoice ${invoice.invoiceNumber}`, 46, 72, { lineBreak: false });
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
