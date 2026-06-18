import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// one review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
