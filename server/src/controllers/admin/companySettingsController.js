import CompanySettings from "../../models/CompanySettings.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { logAudit } from "../../utils/auditLog.js";

const TEXT_FIELDS = ["companyName", "regdNo", "vatPan", "address", "phone", "email", "description"];
const SOCIAL_FIELDS = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube", "whatsapp"];

export async function getCompanySettingsAdmin(req, res) {
  const settings = await CompanySettings.findOne();
  res.json({ company: settings || {} });
}

export async function updateCompanySettings(req, res) {
  const update = {};

  for (const field of TEXT_FIELDS) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  const social = {};
  for (const field of SOCIAL_FIELDS) {
    if (req.body[field] !== undefined) social[field] = req.body[field];
  }
  if (Object.keys(social).length > 0) {
    const existing = await CompanySettings.findOne();
    update.social = { ...(existing?.social?.toObject?.() || existing?.social || {}), ...social };
  }

  if (req.files?.logo?.[0]) {
    const result = await uploadToCloudinary(req.files.logo[0].buffer, "ecommerce-nepal/company");
    update.logoUrl = result.secure_url;
  }
  if (req.files?.favicon?.[0]) {
    const result = await uploadToCloudinary(req.files.favicon[0].buffer, "ecommerce-nepal/company");
    update.faviconUrl = result.secure_url;
  }

  const settings = await CompanySettings.findOneAndUpdate({}, update, { upsert: true, new: true });

  logAudit({
    adminUserId: req.user._id,
    action: "COMPANY_SETTINGS_UPDATE",
    targetType: "CompanySettings",
    targetId: settings._id,
    meta: { changedKeys: Object.keys(update) },
  });

  res.json({ company: settings });
}
