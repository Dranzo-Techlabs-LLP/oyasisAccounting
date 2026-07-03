import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { createToken } from "../utils/tokens.js";
import { requireAuth } from "../middleware/auth.js";
import { getRolePermissions } from "../lib/permissions.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

router.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });

  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = createToken({ id: user.id, email: user.email, role: user.role });
  res.cookie("token", token, cookieOptions);
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      permissions: await getRolePermissions(user.role)
    }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, role: true, fullName: true }
  });
  // Permissions come from the role, not the user row.
  return res.json({ user: { ...user, permissions: await getRolePermissions(user.role) } });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.json({ message: "Logged out" });
});

export default router;
