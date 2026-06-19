import mongoose from "mongoose";

const stockAlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

stockAlertSchema.index({ variantId: 1, notifiedAt: 1 });

export default mongoose.model("StockAlert", stockAlertSchema);
