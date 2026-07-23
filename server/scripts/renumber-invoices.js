/**
 * One-time backfill: renumber existing booking invoices so each invoice number
 * mirrors its booking code.  BK-00054 -> OGH-2026-0054
 *
 * The year segment and prefix of each existing invoice number are preserved,
 * so an invoice issued in 2025 stays in 2025 — only the sequence part is
 * realigned to the booking. Invoices whose number can't be parsed fall back to
 * the configured prefix and their issued year.
 *
 * Renumbering is done in two passes inside a single transaction (everything to
 * a temporary unique value first, then to the final value) because
 * Invoice.invoiceNumber is UNIQUE and targets can collide with numbers still
 * held by other rows mid-migration.
 *
 * Usage:
 *   node scripts/renumber-invoices.js           # dry run - prints the plan
 *   node scripts/renumber-invoices.js --apply   # actually renumber
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const pad = (n, w = 4) => String(n).padStart(w, "0");

const seqFromCode = (code) => {
  const groups = String(code || "").match(/\d+/g);
  if (!groups || groups.length === 0) return null;
  const n = Number(groups[groups.length - 1]);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// "OGH-2026-0018" -> { prefix: "OGH", year: "2026" }; "OGH-0018" -> year null.
const parseInvoiceNumber = (value) => {
  const withYear = String(value || "").match(/^(.+)-(\d{4})-(\d+)$/);
  if (withYear) return { prefix: withYear[1], year: withYear[2] };
  const noYear = String(value || "").match(/^(.+)-(\d+)$/);
  if (noYear) return { prefix: noYear[1], year: null };
  return { prefix: null, year: null };
};

const main = async () => {
  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  const defaultPrefix = settings?.invoicePrefix || "OGH";

  const invoices = await prisma.invoice.findMany({
    include: { booking: { select: { bookingCode: true } } },
    orderBy: { id: "asc" }
  });

  const plan = [];
  const skipped = [];

  for (const inv of invoices) {
    const seq = seqFromCode(inv.booking?.bookingCode);
    if (seq === null) {
      skipped.push({ ...inv, reason: "booking code has no sequence number" });
      continue;
    }
    const parsed = parseInvoiceNumber(inv.invoiceNumber);
    const prefix = parsed.prefix || defaultPrefix;
    const year = parsed.year || String(new Date(inv.issuedDate).getFullYear());
    const target = `${prefix}-${year}-${pad(seq)}`;
    if (target === inv.invoiceNumber) continue; // already correct
    plan.push({ id: inv.id, from: inv.invoiceNumber, to: target, booking: inv.booking.bookingCode });
  }

  // Two different bookings must never map to the same invoice number.
  const seen = new Map();
  const conflicts = [];
  for (const p of plan) {
    if (seen.has(p.to)) conflicts.push({ target: p.to, a: seen.get(p.to), b: p.booking });
    else seen.set(p.to, p.booking);
  }

  console.log(`Invoices: ${invoices.length} | to renumber: ${plan.length} | already correct: ${invoices.length - plan.length - skipped.length} | skipped: ${skipped.length}`);
  for (const p of plan) console.log(`  ${p.booking}:  ${p.from}  ->  ${p.to}`);
  for (const s of skipped) console.log(`  SKIP ${s.invoiceNumber} (${s.reason})`);

  if (conflicts.length > 0) {
    console.error("\nABORT - these targets collide, refusing to renumber:");
    for (const c of conflicts) console.error(`  ${c.target} wanted by both ${c.a} and ${c.b}`);
    process.exitCode = 1;
    return;
  }

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Pass 1: park every affected row on a guaranteed-unique temporary value.
    for (const p of plan) {
      await tx.invoice.update({ where: { id: p.id }, data: { invoiceNumber: `__TMP__${p.id}` } });
    }
    // Pass 2: assign the real targets.
    for (const p of plan) {
      await tx.invoice.update({ where: { id: p.id }, data: { invoiceNumber: p.to } });
    }
  });

  console.log(`\nDone. Renumbered ${plan.length} invoice(s).`);
};

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
