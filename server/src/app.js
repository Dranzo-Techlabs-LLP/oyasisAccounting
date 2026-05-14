import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import packageRoutes from "./routes/packages.js";
import customerRoutes from "./routes/customers.js";
import bookingRoutes from "./routes/bookings.js";
import invoiceRoutes from "./routes/invoices.js";
import dashboardRoutes from "./routes/dashboard.js";
import accountsRoutes from "./routes/accounts.js";
import ticketSalesRoutes from "./routes/ticketSales.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/packages", requireAuth, packageRoutes);
app.use("/api/customers", requireAuth, customerRoutes);
app.use("/api/bookings", requireAuth, bookingRoutes);
app.use("/api/invoices", requireAuth, invoiceRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/accounts", requireAuth, accountsRoutes);
app.use("/api/ticket-sales", requireAuth, ticketSalesRoutes);

const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use(errorHandler);
