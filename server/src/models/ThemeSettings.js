import mongoose from "mongoose";

// Defaults match the existing --color-brand-* values in client/src/index.css, so an
// unconfigured install renders identically to before this feature existed.
const themeSettingsSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#1e293b" },
    accentColor: { type: String, default: "#f59e0b" },
    buttonColor: { type: String, default: "#2563eb" },
    textColor: { type: String, default: "#111827" },
    backgroundColor: { type: String, default: "#ffffff" },
  },
  { timestamps: true }
);

export default mongoose.model("ThemeSettings", themeSettingsSchema);
