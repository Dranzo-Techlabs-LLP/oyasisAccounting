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

// Inspect the blob returned by an invoice endpoint and decide how to render it.
// Returns one of:
//   { ok: true,  kind: "pdf"  }  — real PDF, view inline / download as .pdf.
//   { ok: true,  kind: "html" }  — HTML invoice preview (demo mode / fallback),
//                                  best opened in a new tab so the user can use
//                                  the browser's Print → Save as PDF flow.
//   { ok: false, message }       — server returned a JSON / text error; surface
//                                  it as a toast instead of saving garbage as .pdf.
export const verifyPdfBlob = async (blob) => {
  if (!(blob instanceof Blob)) {
    return { ok: false, message: "Server returned unexpected data" };
  }
  const ct = (blob.type || "").toLowerCase();

  // JSON error from the API.
  if (ct.includes("application/json")) {
    try {
      const text = await blob.text();
      try {
        const parsed = JSON.parse(text);
        return { ok: false, message: parsed?.message || parsed?.error || "Server returned an error" };
      } catch {
        return { ok: false, message: text || "Server returned an error" };
      }
    } catch {
      return { ok: false, message: "Server returned an error" };
    }
  }

  // HTML invoice preview — let the browser render it directly.
  if (ct.includes("text/html")) {
    return { ok: true, kind: "html" };
  }

  // Plain text — almost always an error message.
  if (ct.includes("text/plain")) {
    try {
      const text = await blob.text();
      return { ok: false, message: text || "Server returned an error" };
    } catch {
      return { ok: false, message: "Server returned an error" };
    }
  }

  // Magic-byte sniff: every valid PDF starts with "%PDF".
  try {
    const head = await blob.slice(0, 4).text();
    if (head === "%PDF") return { ok: true, kind: "pdf" };
  } catch {
    return { ok: false, message: "Could not read the downloaded file" };
  }

  // Last-ditch: try to extract an error message from the body.
  try {
    const text = await blob.text();
    if (text.trim().startsWith("<")) return { ok: true, kind: "html" }; // looks like HTML, no explicit Content-Type
    try {
      const parsed = JSON.parse(text);
      return { ok: false, message: parsed?.message || parsed?.error || "Server did not return a valid PDF" };
    } catch {
      return { ok: false, message: text.length < 600 ? text.trim() : "Server did not return a valid PDF" };
    }
  } catch {
    return { ok: false, message: "Server did not return a valid PDF" };
  }
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
