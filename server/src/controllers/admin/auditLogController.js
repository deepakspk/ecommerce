import AuditLog from "../../models/AuditLog.js";
import User from "../../models/User.js";

export async function listAuditLog(req, res) {
  const { adminSearch, action, from, to, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (adminSearch?.trim()) {
    const re = new RegExp(adminSearch.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matchingAdmins = await User.find({ $or: [{ name: re }, { email: re }] }).select("_id");
    filter.adminUserId = { $in: matchingAdmins.map((u) => u._id) };
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("adminUserId", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}
