import { prisma } from "../lib/prisma.js";

export const B2B_PARTNERS = "B2B Partners";

// The original team list. Kept so existing bookings and their calendar colours
// stay valid, and so these names keep their place at the top of the dropdown.
export const CORE_BOOKED_BY = ["Shameer", "Abhijith", "Sahla", "Adithya", "Shahana"];

const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim();

// "Booked By" choices: the core team, then every ACTIVE user that has a full
// name (in the order they were added), then "B2B Partners" last. Adding a user
// on the Users page therefore makes them selectable straight away.
//
// De-duplication is case-insensitive. A user whose first name matches a core
// name (e.g. user "Shameer K" vs core "Shameer") is treated as that same person
// so the dropdown doesn't list them twice and their colour/history is kept.
// Users named like the "B2B Partners" option are skipped (they'd be confused
// with it — partner bookings use "B2B Partners" + the partner name).
export const getBookedByOptions = async () => {
  const users = await prisma.user.findMany({
    where: { isActive: true, fullName: { not: null } },
    select: { fullName: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });

  const options = [...CORE_BOOKED_BY];
  const seen = new Set(options.map((n) => n.toLowerCase()));
  const coreLower = new Set(seen);

  for (const u of users) {
    const name = cleanName(u.fullName);
    if (!name) continue;
    const key = name.toLowerCase();
    const first = key.split(" ")[0];
    if (seen.has(key) || coreLower.has(first)) continue;
    if (/^b2b\s*partner/i.test(name)) continue;
    seen.add(key);
    options.push(name);
  }

  options.push(B2B_PARTNERS);
  return options;
};

// A submitted value is valid if it's a current option, or (when editing) it's
// unchanged from what the booking already had — so a booking whose agent has
// since been deactivated can still be re-saved without forcing a change.
export const isValidBookedBy = async (value, previous) => {
  const v = cleanName(value);
  if (!v) return false;
  if (previous && v === cleanName(previous)) return true;
  const options = await getBookedByOptions();
  return options.includes(v);
};
