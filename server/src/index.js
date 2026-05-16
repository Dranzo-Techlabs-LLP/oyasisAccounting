import { app } from "./app.js";
import { env } from "./config/env.js";

// Keep server alive on unexpected promise rejections / errors.
// Log loudly but don't crash — prevents downtime from DB-table-missing scenarios.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

app.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});
