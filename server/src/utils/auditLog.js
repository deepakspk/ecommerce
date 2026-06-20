import AuditLog from "../models/AuditLog.js";

export function logAudit({ adminUserId, action, targetType, targetId, meta }) {
  AuditLog.create({ adminUserId, action, targetType, targetId, meta }).catch((err) => {
    console.error("Failed to write audit log:", err);
  });
}
