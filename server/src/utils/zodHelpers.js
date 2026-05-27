import { z } from "zod";

// Optional text fields may arrive as "" (form default), undefined (omitted),
// or null (what MySQL returns for blank columns and what some clients send
// back unchanged on edit). Treat all three identically — empty string. Route
// handlers downstream still apply `data.field || null` before persisting, so
// the DB end-state is unchanged.
export const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null ? "" : v));

// Same shape but only accepts a valid email or the empty string. Bad inputs
// (e.g. "not-an-email") still raise the usual Zod email error.
export const optionalEmail = z
  .union([z.string().email(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v == null ? "" : v));

// Date-ish string fields: ISO date / datetime / "" / null / undefined. We
// don't validate format here — most handlers parse via `new Date(value)` and
// the DB column itself enforces shape.
export const optionalDateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v == null ? "" : v));
