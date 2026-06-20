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
