// Display names for the role codes stored in the database. Keep the keys in
// sync with the server's Role enum (server/prisma/schema.prisma).
export const ROLE_LABELS = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  AGENT: "Agent",
  TRIP_DESIGNER: "Trip Designer",
  VIEWER: "Viewer"
};

// "TRIP_DESIGNER" -> "Trip Designer"; unknown codes are title-cased as a fallback.
export const roleLabel = (role) =>
  ROLE_LABELS[role] ||
  String(role || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
