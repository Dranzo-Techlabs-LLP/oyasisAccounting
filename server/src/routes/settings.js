import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { invalidateSettings } from "../lib/settings.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_DIR = path.resolve(__dirname, "../../uploads/branding");
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `logo-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error("Only image files allowed"));
    cb(null, true);
  }
});

const numericStr = z.union([z.coerce.number(), z.string(), z.null()]).optional();

const settingsSchema = z.object({
  businessName: z.string().min(1).optional(),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  website: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  pan: z.string().optional().nullable(),
  currency: z.string().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  bankName: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1).optional(),
  invoiceNextNumber: z.coerce.number().int().min(1).optional(),
  invoiceUseYear: z.boolean().optional(),
  bookingPrefix: z.string().min(1).optional(),
  bookingNextNumber: z.coerce.number().int().min(1).optional(),
  ticketSalePrefix: z.string().min(1).optional(),
  ticketSaleNextNumber: z.coerce.number().int().min(1).optional(),
  invoiceTerms: z.string().optional().nullable()
});

router.get("/", async (_req, res) => {
  const s = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {}
  });
  res.json({
    ...s,
    taxRate: Number(s.taxRate || 0),
    logoUrl: s.logoFileName ? `/api/settings/logo/${encodeURIComponent(s.logoFileName)}` : null
  });
});

router.put("/", requireRole("ADMIN"), async (req, res) => {
  const body = settingsSchema.parse(req.body);
  const updated = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...body },
    update: body
  });
  invalidateSettings();
  res.json({
    ...updated,
    taxRate: Number(updated.taxRate || 0),
    logoUrl: updated.logoFileName ? `/api/settings/logo/${encodeURIComponent(updated.logoFileName)}` : null
  });
});

// Public-ish logo route (no auth so <img> in browser works without cookie roundtrip on every request)
router.get("/logo/:fileName", async (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(LOGO_DIR, fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Logo not found" });
  res.sendFile(filePath);
});

router.post("/logo", requireRole("ADMIN"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  // remove old logo file if any
  const current = await prisma.setting.findUnique({ where: { id: 1 } });
  if (current?.logoFileName) {
    const oldPath = path.join(LOGO_DIR, current.logoFileName);
    if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch { /* ignore */ } }
  }
  const updated = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, logoFileName: req.file.filename },
    update: { logoFileName: req.file.filename }
  });
  invalidateSettings();
  res.status(201).json({
    ...updated,
    taxRate: Number(updated.taxRate || 0),
    logoUrl: `/api/settings/logo/${encodeURIComponent(updated.logoFileName)}`
  });
});

router.delete("/logo", requireRole("ADMIN"), async (_req, res) => {
  const current = await prisma.setting.findUnique({ where: { id: 1 } });
  if (current?.logoFileName) {
    const p = path.join(LOGO_DIR, current.logoFileName);
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
  }
  const updated = await prisma.setting.update({ where: { id: 1 }, data: { logoFileName: null } });
  invalidateSettings();
  res.json({ ...updated, taxRate: Number(updated.taxRate || 0), logoUrl: null });
});

export default router;
