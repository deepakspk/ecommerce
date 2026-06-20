import ThemeSettings from "../models/ThemeSettings.js";

export async function getThemeSettings(req, res) {
  const settings = await ThemeSettings.findOne();
  res.json({ theme: settings || new ThemeSettings() });
}
