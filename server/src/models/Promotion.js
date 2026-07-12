import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    visibleFrom: { type: Date, required: true },
    visibleUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    webBannerUrl: { type: String, required: true },
    mobileBannerUrl: { type: String, default: "" },
    webPopupUrl: { type: String, default: "" },
    mobilePopupUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

promotionSchema.index({ isActive: 1, visibleFrom: 1, visibleUntil: 1 });

export default mongoose.model("Promotion", promotionSchema);
