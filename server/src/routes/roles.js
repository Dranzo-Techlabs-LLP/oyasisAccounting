import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";
import {
  ROLES,
  ACTION_LABELS,
  PERMISSION_CATALOG,
  MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  fullPermissions,
  loadAllRolePermissions,
  invalidateRolePermissions
} from "../lib/permissions.js";

const router = Router();

// Any authenticated user can READ the catalog + role matrix (the Roles page is
// gated in the UI/menu, but reading is harmless and keeps the client simple).
router.get("/", async (_req, res) => {
  const perms = await loadAllRolePermissions();
  res.json({
    catalog: PERMISSION_CATALOG,
    actionLabels: ACTION_LABELS,
    roles: ROLES.map((role) => ({
      role,
      system: true,
      editable: role !== "ADMIN",
      permissions: role === "ADMIN" ? fullPermissions() : perms[role]
    }))
  });
});

// Normalise an incoming permissions object against the catalog so we only ever
// store known module/action booleans (no arbitrary keys).
const cleanPermissions = (input) => {
  const out = {};
  for (const m of MODULES) {
    out[m.key] = {};
    const given = (input && input[m.key]) || {};
    for (const a of m.actions) {
      out[m.key][a] = Boolean(given[a]);
    }
    // A module you can't view but can edit makes no sense — writing/deleting
    // implies viewing, so force read on when any higher action is granted.
    if ((out[m.key].write || out[m.key].delete) && m.actions.includes("read")) {
      out[m.key].read = true;
    }
  }
  return out;
};

const bodySchema = z.object({
  permissions: z.record(z.any())
});

router.put("/:role", requireRole("ADMIN"), async (req, res) => {
  const role = String(req.params.role).toUpperCase();
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: "Unknown role" });
  }
  if (role === "ADMIN") {
    return res.status(400).json({ message: "The Administrator role always has full access and can't be edited." });
  }
  const body = bodySchema.parse(req.body);
  const permissions = cleanPermissions(body.permissions);

  await prisma.rolePermission.upsert({
    where: { role: Role[role] },
    create: { role: Role[role], permissions },
    update: { permissions }
  });
  invalidateRolePermissions();

  res.json({ role, permissions });
});

// Reset a role back to its shipped defaults.
router.post("/:role/reset", requireRole("ADMIN"), async (req, res) => {
  const role = String(req.params.role).toUpperCase();
  if (!ROLES.includes(role) || role === "ADMIN") {
    return res.status(400).json({ message: "Cannot reset this role" });
  }
  const permissions = DEFAULT_ROLE_PERMISSIONS[role] || {};
  await prisma.rolePermission.upsert({
    where: { role: Role[role] },
    create: { role: Role[role], permissions },
    update: { permissions }
  });
  invalidateRolePermissions();
  res.json({ role, permissions });
});

export default router;
