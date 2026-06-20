import mongoose from "mongoose";

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: "" },
    group: { type: String, required: true },
    isSecret: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSetting", systemSettingSchema);
