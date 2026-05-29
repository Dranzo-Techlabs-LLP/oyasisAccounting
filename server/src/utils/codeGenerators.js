import dayjs from "dayjs";
import { getSettings, invalidateSettings } from "../lib/settings.js";

const pad = (n, w = 5) => String(n).padStart(w, "0");

// Generic helper: starting from `start`, format candidate numbers via
// `format(num)` and walk forward until one isn't already used in the DB
// (`isUsed(candidate)` returns truthy for collisions). Returns the candidate
// number and the integer it was generated from. Cap the walk at 10k to avoid
// infinite loops in degenerate cases.
const findFreeNumber = async (start, format, isUsed) => {
  let num = Math.max(Number(start) || 1, 1);
  for (let i = 0; i < 10000; i++) {
    const candidate = format(num);
    // eslint-disable-next-line no-await-in-loop
    const taken = await isUsed(candidate);
    if (!taken) return { num, candidate };
    num += 1;
  }
  throw new Error("Could not find a free sequence number after 10,000 attempts");
};

export const nextBookingCode = async (prisma) => {
  const s = await getSettings();
  const prefix = s.bookingPrefix || "BK";
  const start = s.bookingNextNumber || (await prisma.booking.count()) + 1;
  const { num, candidate } = await findFreeNumber(
    start,
    (n) => `${prefix}-${pad(n)}`,
    async (c) => Boolean(await prisma.booking.findUnique({ where: { bookingCode: c } }))
  );
  await prisma.setting.update({ where: { id: 1 }, data: { bookingNextNumber: num + 1 } });
  invalidateSettings();
  return candidate;
};

export const nextTicketSaleCode = async (prisma) => {
  const s = await getSettings();
  const prefix = s.ticketSalePrefix || "TKT";
  const start = s.ticketSaleNextNumber || (await prisma.ticketSale.count()) + 1;
  const { num, candidate } = await findFreeNumber(
    start,
    (n) => `${prefix}-${pad(n)}`,
    async (c) => Boolean(await prisma.ticketSale.findUnique({ where: { saleCode: c } }))
  );
  await prisma.setting.update({ where: { id: 1 }, data: { ticketSaleNextNumber: num + 1 } });
  invalidateSettings();
  return candidate;
};

export const nextVendorInvoiceNumber = async (prisma) => {
  const s = await getSettings();
  const prefix = s.vendorInvoicePrefix || "B2B";
  const useYear = s.vendorInvoiceUseYear !== false;
  const start = s.vendorInvoiceNextNumber || (await prisma.vendorInvoice.count()) + 1;
  const year = dayjs().year();
  const format = (n) => (useYear ? `${prefix}-${year}-${pad(n, 4)}` : `${prefix}-${pad(n, 4)}`);
  const { num, candidate } = await findFreeNumber(
    start,
    format,
    async (c) => Boolean(await prisma.vendorInvoice.findUnique({ where: { invoiceNumber: c } }))
  );
  await prisma.setting.update({ where: { id: 1 }, data: { vendorInvoiceNextNumber: num + 1 } });
  invalidateSettings();
  return candidate;
};

export const nextInvoiceNumber = async (prisma) => {
  const s = await getSettings();
  const prefix = s.invoicePrefix || "OGH";
  const useYear = s.invoiceUseYear !== false;
  const start = s.invoiceNextNumber || (await prisma.invoice.count()) + 1;
  const year = dayjs().year();
  const format = (n) => (useYear ? `${prefix}-${year}-${pad(n, 4)}` : `${prefix}-${pad(n, 4)}`);
  const { num, candidate } = await findFreeNumber(
    start,
    format,
    async (c) => Boolean(await prisma.invoice.findUnique({ where: { invoiceNumber: c } }))
  );
  await prisma.setting.update({ where: { id: 1 }, data: { invoiceNextNumber: num + 1 } });
  invalidateSettings();
  return candidate;
};
