import dayjs from "dayjs";

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

export const formatDate = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "--");

export const statusTone = (value) => {
  const map = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
    CONFIRMED: "bg-teal-50 text-teal-700 ring-teal-200",
    TENTATIVE: "bg-amber-50 text-amber-700 ring-amber-200",
    CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
    COMPLETED: "bg-cyan-50 text-cyan-700 ring-cyan-200",
    PENDING: "bg-rose-50 text-rose-700 ring-rose-200",
    PARTIAL: "bg-amber-50 text-amber-700 ring-amber-200",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200"
  };

  return map[value] || "bg-slate-100 text-slate-700 ring-slate-200";
};

export const downloadBlob = (blob, filename) => {
  const safeBlob = blob instanceof Blob ? blob : new Blob([blob]);
  const url = window.URL.createObjectURL(safeBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

export const readBlobText = async (blob) => {
  if (!(blob instanceof Blob)) {
    return String(blob);
  }
  return blob.text();
};
