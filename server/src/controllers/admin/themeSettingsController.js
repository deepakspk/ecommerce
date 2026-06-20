import ThemeSettings from "../../models/ThemeSettings.js";
import { logAudit } from "../../utils/auditLog.js";

const FIELDS = ["primaryColor", "secondaryColor", "accentColor", "buttonColor", "textColor", "backgroundColor"];

export async function getThemeSettingsAdmin(req, res) {
  const settings = await ThemeSettings.findOne();
  res.json({ theme: settings || new ThemeSettings() });
}

export async function updateThemeSettings(req, res) {
  const update = {};
  for (const field of FIELDS) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  const settings = await ThemeSettings.findOneAndUpdate({}, update, { upsert: true, new: true });

  logAudit({
    adminUserId: req.user._id,
    action: "THEME_SETTINGS_UPDATE",
    targetType: "ThemeSettings",
    targetId: settings._id,
    meta: { changedKeys: Object.keys(update) },
  });

  res.json({ theme: settings });
}
