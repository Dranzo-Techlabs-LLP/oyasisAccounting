import { PrismaClient } from "@prisma/client";

const base = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = base;
}

// Transient errors that are safe to retry because the query never actually
// executed or was fully rolled back:
//   P2024 - timed out acquiring a connection from the pool (query never ran)
//   P2028 - transaction API error
// These show up under DB load (e.g. many pm2 apps sharing one MariaDB) and
// would otherwise surface as a confusing failure on something as simple as
// login. We retry a few times with a short backoff so a momentary blip
// self-heals instead of reaching the user. Write conflicts (P2034) are NOT
// retried here — they must be retried at the transaction level by the caller.
const RETRYABLE = new Set(["P2024", "P2028"]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await query(args);
        } catch (error) {
          if (!RETRYABLE.has(error?.code) || attempt === 2) throw error;
          lastError = error;
          await wait(150 * (attempt + 1)); // 150ms, then 300ms
        }
      }
      throw lastError;
    }
  }
});
