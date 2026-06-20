import CompanySettings from "../models/CompanySettings.js";

export async function getCompanySettings(req, res) {
  const settings = await CompanySettings.findOne();
  res.json({ company: settings || {} });
}
