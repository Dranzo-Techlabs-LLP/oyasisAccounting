import { verifyToken } from "../utils/tokens.js";
import { prisma } from "../lib/prisma.js";
import { getRolePermissions } from "../lib/permissions.js";

export const requireAuth = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = verifyToken(token);
    // Refresh user from DB so role/permissions/isActive stay accurate.
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Account disabled or missing" });
    }
    // Permissions are role-based: resolve from the user's role (cached).
    // ADMIN always resolves to full access.
    const permissions = await getRolePermissions(user.role);
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      permissions
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired, please login again" });
  }
};

// Restrict to specific roles
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (roles.length === 0 || roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: "Forbidden: insufficient role" });
};

// Check module permission (admin always allowed)
export const requirePermission = (module, action = "read") => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Authentication required" });
  if (req.user.role === "ADMIN") return next();
  const perms = req.user.permissions || {};
  const modPerms = perms[module] || {};
  if (modPerms[action]) return next();
  return res.status(403).json({ message: `Forbidden: missing ${module}.${action}` });
};
