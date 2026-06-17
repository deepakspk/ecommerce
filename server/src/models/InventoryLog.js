import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    change: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("InventoryLog", inventoryLogSchema);
