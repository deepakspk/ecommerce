import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  price: { type: Number, min: 0 },
  stockQuantity: { type: Number, required: true, default: 0, min: 0 },
  imageUrl: { type: String },
  isDefault: { type: Boolean, default: false },
});

export default mongoose.model("ProductVariant", productVariantSchema);
