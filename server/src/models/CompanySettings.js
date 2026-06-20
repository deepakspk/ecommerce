import mongoose from "mongoose";

const socialSchema = new mongoose.Schema(
  {
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    youtube: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
  },
  { _id: false }
);

const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "" },
    regdNo: { type: String, default: "" },
    vatPan: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    description: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    social: { type: socialSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("CompanySettings", companySettingsSchema);
