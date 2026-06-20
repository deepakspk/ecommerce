import * as settingsService from "../../services/settingsService.js";
import { SETTINGS_GROUPS, SETTINGS_SCHEMA } from "../../config/settingsSchema.js";
import { logAudit } from "../../utils/auditLog.js";

export async function listSettings(req, res) {
  res.json({ groups: settingsService.listGroupsForDisplay() });
}

export async function updateGroup(req, res) {
  const { group } = req.params;
  if (!SETTINGS_GROUPS.includes(group)) {
    return res.status(400).json({ message: `Unknown settings group: ${group}` });
  }

  const updatedKeys = await settingsService.setGroup(group, req.body || {});

  logAudit({
    adminUserId: req.user._id,
    action: "SYSTEM_SETTINGS_UPDATE",
    targetType: "SystemSetting",
    meta: {
      group,
      changedKeys: updatedKeys.map((key) => {
        const def = SETTINGS_SCHEMA[group].find((d) => d.key === key);
        return { key, value: def?.isSecret ? "[changed]" : settingsService.get(key) };
      }),
    },
  });

  res.json({ group: settingsService.listGroupsForDisplay()[group] });
}

export async function exportSettings(req, res) {
  const dump = {};
  for (const group of SETTINGS_GROUPS) {
    dump[group] = {};
    for (const def of SETTINGS_SCHEMA[group]) {
      if (def.isSecret) continue;
      dump[group][def.key] = settingsService.get(def.key);
    }
  }
  res.setHeader("Content-Disposition", 'attachment; filename="system-settings-export.json"');
  res.json(dump);
}
