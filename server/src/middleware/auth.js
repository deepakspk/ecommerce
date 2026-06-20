import { verifyAccessToken } from "../utils/token.js";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (user.status === "DISABLED") {
      return res.status(403).json({ message: "This account has been disabled" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // SUPER_ADMIN is a strict superset of ADMIN — it satisfies any role check that
    // includes "ADMIN" so existing admin-only routes keep working, but a role check
    // for exactly "SUPER_ADMIN" (e.g. system settings) still excludes plain ADMINs.
    if (req.user.role === "SUPER_ADMIN" && roles.includes("ADMIN")) {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
