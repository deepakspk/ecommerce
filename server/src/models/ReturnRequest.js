import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [returnItemSchema], required: true },
    status: {
      type: String,
      enum: ["REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "REFUNDED"],
      default: "REQUESTED",
    },
    adminNote: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ status: 1 });

export default mongoose.model("ReturnRequest", returnRequestSchema);
