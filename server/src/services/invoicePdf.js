import PDFDocument from "pdfkit";
import { formatDate, toNumber } from "../utils/formatters.js";

const money = (value) =>
  `INR ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const labelValue = (doc, label, value, x, y, width = 200) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#567070").text(label, x, y, { width });
  doc.font("Helvetica").fontSize(16).fillColor("#163c3c").text(value, x, y + 16, { width });
};

const sectionTitle = (doc, text, x, y) => {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#163c3c").text(text, x, y);
};

const detailLine = (doc, text, x, y, width) => {
  doc.font("Helvetica").fontSize(11).fillColor("#294a4a").text(text, x, y, { width });
};

const tableRow = (doc, label, value, y, options = {}) => {
  const { bold = false, borderTop = false } = options;
  if (borderTop) {
    doc.moveTo(54, y - 8).lineTo(541, y - 8).stroke("#d7e8e6");
  }
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(11)
    .fillColor("#173f3f")
    .text(label, 58, y, { width: 260 });
  doc
    .font(bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(11)
    .fillColor("#173f3f")
    .text(value, 380, y, { width: 150, align: "right" });
};

export const buildInvoicePdf = (booking) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fillColor("#0D6E6E").font("Helvetica-Bold").fontSize(30).text("OasisGo Holidays", 46, 44);
    doc
      .fillColor("#4f6464")
      .font("Helvetica")
      .fontSize(11)
      .text("Travel & Tourism Booking and Accounting Management System", 46, 88)
      .text("12 Marine Drive, Kochi, Kerala", 46, 104)
      .text("Phone: +91 98765 43210 | Email: hello@oasisgoholidays.com", 46, 120);

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

    doc.roundedRect(46, 240, 240, 92, 10).fillAndStroke("#f9fbfb", "#d7e8e6");
    doc.roundedRect(304, 240, 240, 92, 10).fillAndStroke("#f9fbfb", "#d7e8e6");

    sectionTitle(doc, "Bill To", 60, 258);
    detailLine(doc, booking.customer.fullName, 60, 282, 210);
    detailLine(doc, booking.customer.phone, 60, 300, 210);
    detailLine(doc, booking.customer.email || "No email provided", 60, 318, 210);

    sectionTitle(doc, "Package Details", 318, 258);
    detailLine(doc, booking.travelPackage.name, 318, 282, 210);
    detailLine(doc, booking.travelPackage.destination, 318, 300, 210);
    detailLine(
      doc,
      `${booking.travelPackage.durationDays} Days / ${booking.travelPackage.durationNights} Nights`,
      318,
      318,
      210
    );
    detailLine(doc, `Departure ${formatDate(booking.departureDate)}`, 318, 336, 210);

    const baseY = 374;
    const extraChargeCount = (booking.extraCharges || []).length;
    const tableHeight = 200 + Math.max(0, extraChargeCount - 2) * 20;
    doc
      .roundedRect(46, baseY, 498, tableHeight, 12)
      .fillAndStroke("#ffffff", "#d7e8e6");

    sectionTitle(doc, "Cost Breakdown", 60, baseY + 18);

    let cursorY = baseY + 52;
    tableRow(
      doc,
      `Adult rate x ${booking.adults}`,
      money(toNumber(booking.travelPackage.priceAdult) * booking.adults),
      cursorY
    );
    cursorY += 24;
    tableRow(
      doc,
      `Child rate x ${booking.children}`,
      money(toNumber(booking.travelPackage.priceChild) * booking.children),
      cursorY
    );

    cursorY += 24;
    for (const charge of booking.extraCharges || []) {
      tableRow(doc, charge.label, money(charge.amount), cursorY);
      cursorY += 24;
    }

    tableRow(doc, "Subtotal", money(booking.subtotalAmount), cursorY, {
      bold: true,
      borderTop: true
    });
    cursorY += 28;
    tableRow(doc, "Discount", `- ${money(booking.discountAmount)}`, cursorY);
    cursorY += 24;
    tableRow(doc, "Total Amount", money(booking.totalAmount), cursorY, {
      bold: true,
      borderTop: true
    });
    cursorY += 28;
    tableRow(doc, "Amount Paid", money(booking.paidAmount), cursorY);
    cursorY += 24;
    tableRow(doc, "Balance Due", money(booking.balanceDue), cursorY, {
      bold: true
    });

    const footerY = baseY + tableHeight + 26;
    doc
      .moveTo(46, footerY)
      .lineTo(544, footerY)
      .stroke("#d7e8e6")
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#0D6E6E")
      .text(`Payment Status: ${booking.paymentStatus}`, 46, footerY + 18);
    doc
      .font("Helvetica")
      .fillColor("#5f7676")
      .fontSize(10)
      .text(
        "Thank you for choosing OasisGo Holidays. Please review the itinerary and terms before departure.",
        46,
        footerY + 44,
        {
          width: 498,
          align: "center"
        }
      )
      .text(
        "All prices are quoted in INR. This invoice is system generated and valid without signature.",
        46,
        footerY + 64,
        {
          width: 498,
          align: "center"
        }
      );

    doc
      .font("Helvetica")
      .fillColor("#5f7676")
      .fontSize(9)
      .text("Generated by OasisGo Holidays Booking & Accounts", 46, 796, {
        width: 498,
        align: "center"
      });

    doc.end();
  });
