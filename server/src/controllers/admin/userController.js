import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { logAudit } from "../../utils/auditLog.js";

export async function listUsers(req, res) {
  const { search, role, status, page = 1, limit = 25 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search?.trim()) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}

export async function updateUserRole(req, res) {
  const { role } = req.body;
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Only a SUPER_ADMIN may grant or revoke SUPER_ADMIN — a plain ADMIN cannot create peers above itself.
  if ((role === "SUPER_ADMIN" || user.role === "SUPER_ADMIN") && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Only a Super Admin can assign or change the Super Admin role" });
  }

  const previousRole = user.role;
  user.role = role;
  await user.save();

  logAudit({
    adminUserId: req.user._id,
    action: "USER_ROLE_CHANGE",
    targetType: "User",
    targetId: user._id,
    meta: { previousRole, newRole: role, targetEmail: user.email, targetName: user.name },
  });

  res.json({ user });
}

export async function updateUser(req, res) {
  const { name, email, password } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  // Mirrors the role-change rule: a plain ADMIN cannot rewrite a Super Admin's profile/password.
  if (user.role === "SUPER_ADMIN" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Only a Super Admin can edit another Super Admin's profile" });
  }

  const previousName = user.name;
  const previousEmail = user.email;
  let passwordChanged = false;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 12);
    passwordChanged = true;
  }

  try {
    await user.save();
  } catch (e) {
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || "field";
      return res.status(400).json({ message: `That ${field} is already in use by another account` });
    }
    throw e;
  }

  logAudit({
    adminUserId: req.user._id,
    action: "USER_PROFILE_UPDATE",
    targetType: "User",
    targetId: user._id,
    meta: { previousName, newName: user.name, previousEmail, newEmail: user.email, passwordChanged },
  });

  res.json({ user });
}

export async function updateUserStatus(req, res) {
  const { status } = req.body;
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot change your own account status" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const previousStatus = user.status;
  user.status = status;
  await user.save();

  logAudit({
    adminUserId: req.user._id,
    action: "USER_STATUS_CHANGE",
    targetType: "User",
    targetId: user._id,
    meta: { previousStatus, newStatus: status, targetEmail: user.email, targetName: user.name },
  });

  res.json({ user });
}
