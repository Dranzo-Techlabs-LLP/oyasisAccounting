import { ZodError } from "zod";

// Duck-type Prisma errors by their generated class name so this module
// doesn't take a hard import dependency on @prisma/client (helpful for tests
// and for environments where prisma generate hasn't run yet).
const isPrismaKnownRequestError = (err) =>
  err && (err.name === "PrismaClientKnownRequestError" || err.constructor?.name === "PrismaClientKnownRequestError");
const isPrismaValidationError = (err) =>
  err && (err.name === "PrismaClientValidationError" || err.constructor?.name === "PrismaClientValidationError");
const isPrismaInitializationError = (err) =>
  err && (err.name === "PrismaClientInitializationError" || err.constructor?.name === "PrismaClientInitializationError");

// Friendly labels for the field paths Zod reports. Keep this list short and
// only override the ones where the camelCase identifier reads badly to a user.
const FIELD_LABELS = {
  fullName: "Full name",
  phone: "Phone number",
  email: "Email",
  password: "Password",
  nationality: "Nationality",
  passportNo: "Passport number",
  address: "Address",
  notes: "Notes",
  customerId: "Customer",
  packageId: "Travel package",
  vendorId: "Vendor",
  bookingId: "Booking",
  ticketSaleId: "Ticket sale",
  vendorInvoiceId: "B2B invoice",
  departureDate: "Departure date",
  endDate: "End date",
  issueDate: "Issue date",
  dueDate: "Due date",
  paymentDate: "Payment date",
  paidDate: "Paid date",
  departAt: "Departure date / time",
  returnAt: "Return date / time",
  adults: "Adults",
  children: "Children",
  passengers: "Passengers",
  amount: "Amount",
  amountPaid: "Amount paid",
  paidAmount: "Amount paid",
  costPrice: "Cost price",
  sellingPrice: "Selling price",
  serviceFee: "Service fee",
  discountAmount: "Discount amount",
  discountValue: "Discount value",
  discountType: "Discount type",
  totalAmount: "Total amount",
  taxRate: "Tax rate (%)",
  quantity: "Quantity",
  unitPrice: "Unit price",
  description: "Description",
  hsnCode: "HSN code",
  reference: "Reference",
  invoiceNumber: "Invoice number",
  bookingCode: "Booking code",
  saleCode: "Sale code",
  bookingStatus: "Booking status",
  paymentStatus: "Payment status",
  status: "Status",
  ticketType: "Ticket type",
  payeeType: "Payee type",
  payeeName: "Payee name",
  category: "Category",
  party: "Party",
  txDate: "Transaction date",
  paymentMethod: "Payment method",
  method: "Payment method",
  kind: "Type",
  supplierName: "Supplier name",
  businessName: "Business name",
  fromLocation: "From location",
  toLocation: "To location",
  invoicePrefix: "Invoice prefix",
  invoiceNextNumber: "Next invoice number",
  bookingPrefix: "Booking prefix",
  bookingNextNumber: "Next booking number",
  items: "Line items",
  travellers: "Travellers",
  payouts: "Supplier payouts",
  tickets: "Tickets",
  payments: "Payments",
  extraCharges: "Extra charges",
  isPrimary: "Primary traveller flag",
  isActive: "Active status",
  role: "Role",
  permissions: "Permissions"
};

const labelFor = (path) => {
  if (!Array.isArray(path) || path.length === 0) return "This field";
  // Use the deepest non-numeric key for nested errors like
  // items[0].description → "Description". Falls back to the first key.
  const key = [...path].reverse().find((p) => typeof p === "string") || path[0];
  return FIELD_LABELS[key] || String(key).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
};

const messageForIssue = (issue) => {
  const label = labelFor(issue.path);
  switch (issue.code) {
    case "invalid_type": {
      if (issue.received === "undefined" || issue.received === "null") {
        return `${label} is required`;
      }
      if (issue.expected === "number") return `${label} must be a number`;
      if (issue.expected === "string") return `${label} must be text`;
      if (issue.expected === "boolean") return `${label} must be yes or no`;
      if (issue.expected === "array") return `${label} is required`;
      return `${label} has an invalid value`;
    }
    case "invalid_string": {
      if (issue.validation === "email") return `${label} is not a valid email address`;
      if (issue.validation === "url") return `${label} is not a valid URL`;
      return `${label} is not valid`;
    }
    case "too_small": {
      if (issue.type === "string") {
        if (issue.minimum === 1) return `${label} is required`;
        return `${label} must be at least ${issue.minimum} characters long`;
      }
      if (issue.type === "number") {
        if (issue.minimum === 0) return `${label} cannot be negative`;
        return `${label} must be at least ${issue.minimum}`;
      }
      if (issue.type === "array") {
        if (issue.minimum === 1) return `Please add at least one ${String(label).toLowerCase()}`;
        return `Please add at least ${issue.minimum} ${String(label).toLowerCase()}`;
      }
      return `${label} is too small`;
    }
    case "too_big": {
      if (issue.type === "string") return `${label} must be at most ${issue.maximum} characters long`;
      if (issue.type === "number") return `${label} must be at most ${issue.maximum}`;
      return `${label} is too large`;
    }
    case "invalid_enum_value": {
      const options = Array.isArray(issue.options) ? issue.options.join(", ") : "";
      return options ? `${label} must be one of: ${options}` : `${label} has an invalid value`;
    }
    case "invalid_union":
      return `${label} has an invalid value`;
    case "invalid_literal":
      return `${label} has an invalid value`;
    case "unrecognized_keys":
      return `Unrecognised field${(issue.keys || []).length > 1 ? "s" : ""}: ${(issue.keys || []).join(", ")}`;
    case "custom":
      return issue.message || `${label} is invalid`;
    default:
      return issue.message && !/^Expected /i.test(issue.message) ? issue.message : `${label} is invalid`;
  }
};

const friendlyZodMessage = (zodErr) => {
  const issues = Array.isArray(zodErr.issues) ? zodErr.issues : [];
  if (issues.length === 0) return "Some details on the form aren't valid.";
  const seen = new Set();
  const lines = [];
  for (const issue of issues) {
    const msg = messageForIssue(issue);
    if (seen.has(msg)) continue;
    seen.add(msg);
    lines.push(msg);
  }
  if (lines.length === 1) return lines[0] + ".";
  // Compact list when many fields are flagged.
  const head = lines.slice(0, 4);
  const more = lines.length - head.length;
  const tail = more > 0 ? ` (+ ${more} more)` : "";
  return head.join(". ") + "." + tail;
};

const friendlyPrismaMessage = (err) => {
  // Reference: https://www.prisma.io/docs/orm/reference/error-reference
  switch (err.code) {
    case "P2002": {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target;
      if (target && /email/i.test(String(target))) return "Another record is already using this email address.";
      if (target && /invoiceNumber/i.test(String(target))) return "An invoice with this number already exists. The next available number will be picked up automatically — please try again.";
      if (target && /bookingCode/i.test(String(target))) return "A booking with this code already exists.";
      if (target && /saleCode/i.test(String(target))) return "A ticket sale with this code already exists.";
      return target
        ? `Another record already exists with the same ${String(target).replace(/_/g, " ")}.`
        : "Another record with these details already exists.";
    }
    case "P2003":
    case "P2014":
      return "Cannot complete this action because the record is linked to other data. Remove the linked records first.";
    case "P2025":
      return "We couldn't find that record. It may have been deleted in another tab.";
    case "P2000":
      return "One of the values is too long for the database. Please shorten it and try again.";
    case "P2007":
      return "One of the values is not in the expected format.";
    case "P2011":
      return "A required field was left empty.";
    default:
      return "Couldn't save changes due to a data conflict. Please try again.";
  }
};

export const errorHandler = (err, req, res, next) => {
  // Helpful in server logs.
  console.error(err);

  // ----- Zod validation -----
  if (err instanceof ZodError) {
    return res.status(400).json({ message: friendlyZodMessage(err) });
  }

  // ----- Prisma -----
  if (isPrismaKnownRequestError(err)) {
    const status = err.code === "P2025" ? 404 : err.code === "P2002" ? 409 : 400;
    return res.status(status).json({ message: friendlyPrismaMessage(err) });
  }
  if (isPrismaValidationError(err)) {
    return res.status(400).json({ message: "One of the values doesn't match what the database expected. Please double-check the form." });
  }
  if (isPrismaInitializationError(err)) {
    return res.status(503).json({ message: "Can't reach the database right now. Please try again in a moment." });
  }

  // ----- Multer (file uploads) -----
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "One of the files is too large. Maximum size is 10 MB per file." });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Unexpected file field. Please pick the files again and retry." });
    }
    return res.status(400).json({ message: "File upload failed. Please try again." });
  }

  // ----- Explicit thrown errors from route handlers -----
  // We treat short, plain-language messages as safe to pass through. Skip
  // anything that looks like a stack trace, a JSON blob, a Prisma / Zod /
  // Node internal phrase, a JWT / errno code, or a "null"-stringified value.
  const raw = String(err?.message || "").trim();
  const looksTechnical =
    !raw ||
    /^(null|undefined|NaN|\[object Object\])$/i.test(raw) ||
    raw.length > 240 ||
    /^\s*[\[\{]/.test(raw) ||
    // V8 stack frames: "    at ...:N:N" OR "    at fn (file:N:N)"
    /\n\s*at\s+\S+/.test(raw) ||
    /at\s+\S+:\d+:\d+/.test(raw) ||
    // Zod-style "Expected X, received Y" — word-bounded so "Unexpected …"
    // is *not* flagged.
    /\bExpected\s+(?:string|number|boolean|array|object|integer|date)/i.test(raw) ||
    /received\s+(?:null|undefined|number|string)/i.test(raw) ||
    /Invalid `prisma\./.test(raw) ||
    /PrismaClient/.test(raw) ||
    /ZodError/.test(raw) ||
    /Unique constraint/i.test(raw) ||
    /node_modules/.test(raw) ||
    /TypeError|ReferenceError|SyntaxError/.test(raw) ||
    // JWT library errors
    /JsonWebTokenError|TokenExpiredError|NotBeforeError|jwt\s+(malformed|expired|signature)/i.test(raw) ||
    // Node errno codes (ENOENT, EACCES, EPERM, …)
    /^E[A-Z]{3,}:/.test(raw) ||
    /\b(ENOENT|EACCES|EPERM|EEXIST|ENOTDIR|EISDIR|EMFILE|EADDRINUSE):/.test(raw);

  const status = Number(err?.statusCode || err?.status) || 500;
  const message = looksTechnical ? "Something went wrong. Please try again." : raw;
  res.status(status >= 400 && status < 600 ? status : 500).json({ message });
};
