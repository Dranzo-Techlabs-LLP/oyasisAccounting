import dayjs from "dayjs";
import { getSettings, invalidateSettings } from "../lib/settings.js";

const pad = (n, w = 5) => String(n).padStart(w, "0");

export const nextBookingCode = async (prisma) => {
  const s = await getSettings();
  const prefix = s.bookingPrefix || "BK";
  const num = s.bookingNextNumber || (await prisma.booking.count()) + 1;
  await prisma.setting.update({ where: { id: 1 }, data: { bookingNextNumber: num + 1 } });
  invalidateSettings();
  return `${prefix}-${pad(num)}`;
};

export const nextTicketSaleCode = async (prisma) => {
  const s = await getSettings();
  const prefix = s.ticketSalePrefix || "TKT";
  const num = s.ticketSaleNextNumber || (await prisma.ticketSale.count()) + 1;
  await prisma.setting.update({ where: { id: 1 }, data: { ticketSaleNextNumber: num + 1 } });
  invalidateSettings();
  return `${prefix}-${pad(num)}`;
};

export const nextVendorInvoiceNumber = async (prisma) => {
  const s = await getSettings();
  const prefix = s.vendorInvoicePrefix || "B2B";
  const useYear = s.vendorInvoiceUseYear !== false;
  const num = s.vendorInvoiceNextNumber || (await prisma.vendorInvoice.count()) + 1;
  await prisma.setting.update({ where: { id: 1 }, data: { vendorInvoiceNextNumber: num + 1 } });
  invalidateSettings();
  if (useYear) {
    return `${prefix}-${dayjs().year()}-${pad(num, 4)}`;
  }
  return `${prefix}-${pad(num, 4)}`;
};

export const nextInvoiceNumber = async (prisma) => {
  const s = await getSettings();
  const prefix = s.invoicePrefix || "OGH";
  const useYear = s.invoiceUseYear !== false;
  const num = s.invoiceNextNumber || (await prisma.invoice.count()) + 1;
  await prisma.setting.update({ where: { id: 1 }, data: { invoiceNextNumber: num + 1 } });
  invalidateSettings();
  if (useYear) {
    return `${prefix}-${dayjs().year()}-${pad(num, 4)}`;
  }
  return `${prefix}-${pad(num, 4)}`;
};
