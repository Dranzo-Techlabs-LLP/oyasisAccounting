import dayjs from "dayjs";

export const formatDate = (value) => dayjs(value).format("DD/MM/YYYY");

export const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

export const toNumber = (value) => Number(value || 0);

export const toPlainAmount = (value) => Number(Number(value || 0).toFixed(2));
