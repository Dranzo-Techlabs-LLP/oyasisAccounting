import "express-async-errors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, guardModule } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import packageRoutes from "./routes/packages.js";
import customerRoutes from "./routes/customers.js";
import bookingRoutes from "./routes/bookings.js";
import invoiceRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";
import accountsRoutes from "./routes/accounts.js";
import ticketSalesRoutes from "./routes/ticketSales.js";
import settingsRoutes from "./routes/settings.js";
import usersRoutes from "./routes/users.js";
import calendarRoutes from "./routes/calendar.js";
import vendorsRoutes from "./routes/vendors.js";
import vendorInvoicesRoutes from "./routes/vendorInvoices.js";
import ledgerRoutes from "./routes/ledger.js";
import rolesRoutes from "./routes/roles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Allow the configured client origin plus its localhost/127.0.0.1 twin so
// dev works whether the app is opened via localhost:5173 or 127.0.0.1:5173.
const corsOrigins = (() => {
  const set = new Set([env.clientUrl].filter(Boolean));
  if (env.clientUrl) {
    set.add(env.clientUrl.replace("localhost", "127.0.0.1"));
    set.add(env.clientUrl.replace("127.0.0.1", "localhost"));
  }
  return [...set];
})();

app.use(
  cors({
    origin: corsOrigins,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/packages", requireAuth, guardModule("packages"), packageRoutes);
app.use("/api/customers", requireAuth, guardModule("customers"), customerRoutes);
app.use("/api/bookings", requireAuth, guardModule("bookings"), bookingRoutes);
app.use("/api/invoices", requireAuth, guardModule("invoices"), invoiceRoutes);
app.use("/api/dashboard", requireAuth, guardModule("dashboard"), dashboardRoutes);
app.use("/api/accounts", requireAuth, guardModule("accounts"), accountsRoutes);
app.use("/api/ticket-sales", requireAuth, guardModule("ticketSales"), ticketSalesRoutes);
app.use("/api/settings", requireAuth, guardModule("settings"), settingsRoutes);
app.use("/api/users", requireAuth, guardModule("users"), usersRoutes);
app.use("/api/calendar", requireAuth, guardModule("calendar"), calendarRoutes);
app.use("/api/vendors", requireAuth, guardModule("vendors"), vendorsRoutes);
app.use("/api/vendor-invoices", requireAuth, guardModule("vendorInvoices"), vendorInvoicesRoutes);
app.use("/api/ledger", requireAuth, guardModule("ledger"), ledgerRoutes);
// Roles page reads the catalog (read) and only ADMIN can PUT (enforced in the
// route). Guard with the "roles" module so non-privileged roles can't poke it.
app.use("/api/roles", requireAuth, guardModule("roles"), rolesRoutes);

// Locate the built frontend. Supports both the monorepo/dev layout
// (server/src + client/dist siblings) and the flat deploy layout
// (public_html/{src,public}). First candidate with an index.html wins.
const clientDistCandidates = [
  path.resolve(__dirname, "../../client/dist"), // dev / monorepo
  path.resolve(__dirname, "../public"),         // flat deploy: public_html/{src,public}
  path.resolve(__dirname, "../client/dist"),
  path.resolve(process.cwd(), "public")
];
const clientDist = clientDistCandidates.find((p) => fs.existsSync(path.join(p, "index.html")));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);
