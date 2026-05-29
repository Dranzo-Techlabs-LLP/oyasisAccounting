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
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    INACTIVE: "bg-slate-200 text-slate-700 ring-slate-300",
    // Booking statuses
    CONFIRMED: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    TENTATIVE: "bg-amber-100 text-amber-800 ring-amber-300",
    CANCELLED: "bg-rose-100 text-rose-800 ring-rose-300",
    COMPLETED: "bg-sky-100 text-sky-800 ring-sky-300",
    // Payment statuses
    PENDING: "bg-rose-100 text-rose-800 ring-rose-300",
    PARTIAL: "bg-amber-100 text-amber-800 ring-amber-300",
    PAID: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    // Ticket statuses
    BOOKED: "bg-emerald-100 text-emerald-800 ring-emerald-300"
  };

  return map[value] || "bg-slate-100 text-slate-700 ring-slate-200";
};

export const statusDot = (value) => {
  const map = {
    ACTIVE: "bg-emerald-500",
    INACTIVE: "bg-slate-400",
    CONFIRMED: "bg-emerald-500",
    TENTATIVE: "bg-amber-500",
    CANCELLED: "bg-rose-500",
    COMPLETED: "bg-sky-500",
    PENDING: "bg-rose-500",
    PARTIAL: "bg-amber-500",
    PAID: "bg-emerald-500",
    BOOKED: "bg-emerald-500"
  };
  return map[value] || "bg-slate-400";
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

// Verify that what came back from a /pdf endpoint is actually a PDF, not an
// HTML/JSON error response. Saving a non-PDF blob as `.pdf` produces a file
// the user cannot open. Returns { ok: true } if the blob looks like a PDF,
// or { ok: false, message } with the parsed server error otherwise.
export const verifyPdfBlob = async (blob) => {
  if (!(blob instanceof Blob)) {
    return { ok: false, message: "Server returned unexpected data" };
  }
  const ct = (blob.type || "").toLowerCase();
  if (ct.includes("application/json") || ct.includes("text/plain") || ct.includes("text/html")) {
    let message = "Server returned an error instead of a PDF";
    try {
      const text = await blob.text();
      // Try JSON first, then fall back to stripped HTML / raw text.
      try {
        const parsed = JSON.parse(text);
        message = parsed?.message || parsed?.error || text;
      } catch {
        message = text.replace(/<[^>]+>/g, " ").trim() || message;
      }
    } catch { /* ignore */ }
    return { ok: false, message };
  }
  // Inspect the first 4 bytes — every valid PDF starts with "%PDF".
  try {
    const head = await blob.slice(0, 4).text();
    if (head !== "%PDF") {
      let message = "Server did not return a valid PDF";
      try {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.error || message;
        } catch {
          if (text.length < 800) message = text.replace(/<[^>]+>/g, " ").trim() || message;
        }
      } catch { /* ignore */ }
      return { ok: false, message };
    }
  } catch {
    return { ok: false, message: "Could not read the downloaded file" };
  }
  return { ok: true };
};

export const viewBlobInNewTab = (blob) => {
  const safeBlob = blob instanceof Blob ? blob : new Blob([blob]);
  const url = window.URL.createObjectURL(safeBlob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    // Popup blocked — fallback to navigation
    window.location.href = url;
  }
  // Release after a delay (let browser load it first)
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
};
