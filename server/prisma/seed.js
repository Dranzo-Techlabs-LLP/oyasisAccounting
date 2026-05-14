import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import { PrismaClient, BookingStatus, DiscountType, PackageStatus, PaymentStatus } from "@prisma/client";
import { env } from "../src/config/env.js";
import { computeBookingAmounts } from "../src/utils/bookingMath.js";

const prisma = new PrismaClient();

const packages = [
  {
    name: "Golden Triangle Escape",
    destination: "Delhi - Agra - Jaipur",
    durationDays: 5,
    durationNights: 4,
    inclusions: { flights: true, hotels: true, meals: true, transfers: true },
    priceAdult: 28999,
    priceChild: 19999,
    maxPax: 24,
    availableDates: ["2026-05-10", "2026-06-14", "2026-07-19"],
    status: PackageStatus.ACTIVE,
    coverImageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Bali Bliss Retreat",
    destination: "Bali, Indonesia",
    durationDays: 6,
    durationNights: 5,
    inclusions: { flights: true, hotels: true, meals: false, transfers: true },
    priceAdult: 54999,
    priceChild: 38999,
    maxPax: 18,
    availableDates: ["2026-05-22", "2026-06-26", "2026-08-07"],
    status: PackageStatus.ACTIVE,
    coverImageUrl: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Kashmir Snow Trails",
    destination: "Srinagar - Gulmarg - Pahalgam",
    durationDays: 7,
    durationNights: 6,
    inclusions: { flights: false, hotels: true, meals: true, transfers: true },
    priceAdult: 41999,
    priceChild: 29999,
    maxPax: 20,
    availableDates: ["2026-11-11", "2026-12-02", "2027-01-15"],
    status: PackageStatus.ACTIVE,
    coverImageUrl: "https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?auto=format&fit=crop&w=1200&q=80"
  }
];

const customers = [
  {
    fullName: "Aarav Menon",
    phone: "9876543210",
    email: "aarav@example.com",
    nationality: "Indian",
    passportNo: "M1234567",
    address: "Panampilly Nagar, Kochi",
    notes: "Prefers aisle seats"
  },
  {
    fullName: "Nisha Kapoor",
    phone: "9988776655",
    email: "nisha@example.com",
    nationality: "Indian",
    passportNo: "K3456789",
    address: "Andheri West, Mumbai",
    notes: "Vegetarian meals only"
  },
  {
    fullName: "Farhan Ali",
    phone: "9900112233",
    email: "farhan@example.com",
    nationality: "Indian",
    passportNo: "L4561238",
    address: "Banjara Hills, Hyderabad",
    notes: "Travelling with family"
  },
  {
    fullName: "Meera Thomas",
    phone: "9123456780",
    email: "meera@example.com",
    nationality: "Indian",
    passportNo: "T7894561",
    address: "Vyttila, Kochi",
    notes: "Needs visa support"
  },
  {
    fullName: "Rohan D'Souza",
    phone: "9011223344",
    email: "rohan@example.com",
    nationality: "Indian",
    passportNo: "D2233445",
    address: "Koramangala, Bengaluru",
    notes: "Corporate traveller"
  }
];

const bookingTemplates = [
  { customerIndex: 0, packageIndex: 0, monthOffset: -2, adults: 2, children: 1, discountType: DiscountType.FLAT, discountValue: 2500, bookingStatus: BookingStatus.COMPLETED, initialPaid: 70000 },
  { customerIndex: 1, packageIndex: 1, monthOffset: -1, adults: 2, children: 0, discountType: DiscountType.PERCENTAGE, discountValue: 10, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 50000 },
  { customerIndex: 2, packageIndex: 2, monthOffset: 0, adults: 3, children: 1, discountType: DiscountType.NONE, discountValue: 0, bookingStatus: BookingStatus.TENTATIVE, initialPaid: 30000 },
  { customerIndex: 3, packageIndex: 0, monthOffset: 0, adults: 2, children: 2, discountType: DiscountType.FLAT, discountValue: 4000, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 45000 },
  { customerIndex: 4, packageIndex: 1, monthOffset: 1, adults: 2, children: 1, discountType: DiscountType.NONE, discountValue: 0, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 25000 },
  { customerIndex: 0, packageIndex: 2, monthOffset: 1, adults: 1, children: 0, discountType: DiscountType.NONE, discountValue: 0, bookingStatus: BookingStatus.CANCELLED, initialPaid: 10000 },
  { customerIndex: 1, packageIndex: 0, monthOffset: 2, adults: 4, children: 0, discountType: DiscountType.PERCENTAGE, discountValue: 5, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 80000 },
  { customerIndex: 2, packageIndex: 1, monthOffset: 2, adults: 2, children: 2, discountType: DiscountType.FLAT, discountValue: 6000, bookingStatus: BookingStatus.TENTATIVE, initialPaid: 35000 },
  { customerIndex: 3, packageIndex: 2, monthOffset: 3, adults: 2, children: 0, discountType: DiscountType.NONE, discountValue: 0, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 25000 },
  { customerIndex: 4, packageIndex: 0, monthOffset: 3, adults: 5, children: 1, discountType: DiscountType.FLAT, discountValue: 5000, bookingStatus: BookingStatus.CONFIRMED, initialPaid: 100000 }
];

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.package.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await prisma.user.create({
    data: {
      email: env.adminEmail,
      passwordHash
    }
  });

  const createdPackages = [];
  for (const item of packages) {
    createdPackages.push(await prisma.package.create({ data: item }));
  }

  const createdCustomers = [];
  for (const item of customers) {
    createdCustomers.push(await prisma.customer.create({ data: item }));
  }

  for (let index = 0; index < bookingTemplates.length; index += 1) {
    const template = bookingTemplates[index];
    const travelPackage = createdPackages[template.packageIndex];
    const extraCharges = [
      { label: "Visa Fees", amount: 2500 },
      { label: "Insurance", amount: 1200 }
    ];

    const amounts = computeBookingAmounts({
      adultRate: travelPackage.priceAdult,
      childRate: travelPackage.priceChild,
      adults: template.adults,
      children: template.children,
      extraCharges,
      discountType: template.discountType,
      discountValue: template.discountValue,
      paidAmount: template.initialPaid
    });

    const booking = await prisma.booking.create({
      data: {
        bookingCode: `BK-${String(index + 1).padStart(5, "0")}`,
        customerId: createdCustomers[template.customerIndex].id,
        packageId: travelPackage.id,
        departureDate: dayjs().add(template.monthOffset, "month").add(index + 3, "day").toDate(),
        adults: template.adults,
        children: template.children,
        extraCharges,
        discountType: template.discountType,
        discountValue: template.discountValue,
        discountAmount: amounts.discountAmount,
        subtotalAmount: amounts.subtotalAmount,
        totalAmount: amounts.totalAmount,
        paidAmount: amounts.paidAmount,
        balanceDue: amounts.balanceDue,
        paymentStatus: amounts.paymentStatus,
        bookingStatus: template.bookingStatus,
        notes: "Seed booking for demo flows"
      }
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: Math.min(template.initialPaid, amounts.totalAmount),
        paymentDate: dayjs(booking.departureDate).subtract(15, "day").toDate(),
        method: "Bank Transfer",
        note: "Advance payment"
      }
    });

    if (index < 7) {
      await prisma.invoice.create({
        data: {
          bookingId: booking.id,
          invoiceNumber: `OGH-2026-${String(index + 1).padStart(4, "0")}`,
          issuedDate: dayjs(booking.departureDate).subtract(20, "day").toDate(),
          sentStatus: index % 2 === 0
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
