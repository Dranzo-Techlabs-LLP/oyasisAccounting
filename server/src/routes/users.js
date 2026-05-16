import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).default("AGENT"),
  permissions: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true)
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("").transform(() => undefined)),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  permissions: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().optional()
});

const publicFields = {
  id: true, email: true, fullName: true, phone: true, role: true,
  permissions: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true
};

router.use(requireRole("ADMIN"));

router.get("/", async (_req, res) => {
  const items = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: publicFields
  });
  res.json({ items });
});

router.post("/", async (req, res) => {
  const body = userCreateSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      fullName: body.fullName || null,
      phone: body.phone || null,
      role: body.role,
      permissions: body.permissions || null,
      isActive: body.isActive ?? true
    },
    select: publicFields
  });
  res.status(201).json(user);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = userUpdateSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "User not found" });

  const data = {};
  if (body.email !== undefined) data.email = body.email;
  if (body.fullName !== undefined) data.fullName = body.fullName || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.role !== undefined) data.role = body.role;
  if (body.permissions !== undefined) data.permissions = body.permissions;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  // prevent demoting the last active admin
  if (existing.role === "ADMIN" && (data.role && data.role !== "ADMIN" || data.isActive === false)) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, id: { not: id } }
    });
    if (otherAdmins === 0) {
      return res.status(400).json({ message: "Cannot demote/disable the last active admin" });
    }
  }

  const user = await prisma.user.update({ where: { id }, data, select: publicFields });
  res.json(user);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ message: "Cannot delete your own account" });
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "User not found" });
  if (existing.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
    if (otherAdmins === 0) return res.status(400).json({ message: "Cannot delete the last admin" });
  }
  await prisma.user.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

export default router;
