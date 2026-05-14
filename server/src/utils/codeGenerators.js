import dayjs from "dayjs";

export const nextBookingCode = async (prisma) => {
  const count = await prisma.booking.count();
  return `BK-${String(count + 1).padStart(5, "0")}`;
};

export const nextTicketSaleCode = async (prisma) => {
  const count = await prisma.ticketSale.count();
  return `TKT-${String(count + 1).padStart(5, "0")}`;
};

export const nextInvoiceNumber = async (prisma) => {
  const year = dayjs().year();
  const count = await prisma.invoice.count({
    where: {
      issuedDate: {
        gte: dayjs(`${year}-01-01`).startOf("day").toDate(),
        lte: dayjs(`${year}-12-31`).endOf("day").toDate()
      }
    }
  });

  return `OGH-${year}-${String(count + 1).padStart(4, "0")}`;
};
