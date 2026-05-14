import { PaymentStatus } from "@prisma/client";
import { toNumber, toPlainAmount } from "./formatters.js";

export const computeBookingAmounts = ({
  adultRate,
  childRate,
  adults,
  children,
  extraCharges = [],
  discountType = "NONE",
  discountValue = 0,
  paidAmount = 0
}) => {
  const baseAdults = toNumber(adultRate) * toNumber(adults);
  const baseChildren = toNumber(childRate) * toNumber(children);
  const extras = extraCharges.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const subtotalAmount = baseAdults + baseChildren + extras;

  let discountAmount = 0;
  if (discountType === "FLAT") {
    discountAmount = toNumber(discountValue);
  }
  if (discountType === "PERCENTAGE") {
    discountAmount = subtotalAmount * (toNumber(discountValue) / 100);
  }

  discountAmount = Math.min(discountAmount, subtotalAmount);
  const totalAmount = subtotalAmount - discountAmount;
  const paid = Math.min(toNumber(paidAmount), totalAmount);
  const balanceDue = Math.max(totalAmount - paid, 0);

  let paymentStatus = PaymentStatus.PENDING;
  if (paid > 0 && paid < totalAmount) {
    paymentStatus = PaymentStatus.PARTIAL;
  }
  if (paid >= totalAmount && totalAmount > 0) {
    paymentStatus = PaymentStatus.PAID;
  }

  return {
    subtotalAmount: toPlainAmount(subtotalAmount),
    discountAmount: toPlainAmount(discountAmount),
    totalAmount: toPlainAmount(totalAmount),
    paidAmount: toPlainAmount(paid),
    balanceDue: toPlainAmount(balanceDue),
    paymentStatus
  };
};
