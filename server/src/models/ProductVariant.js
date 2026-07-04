import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  // "Default" marks a dimension the product doesn't vary by (e.g. color-only or
  // size-only variants). This `default` only covers an omitted (`undefined`) field —
  // callers must still explicitly fall back blank/"" input to "Default" themselves,
  // since Mongoose's `required` check doesn't reject "" and `default` doesn't fire for it.
  size: { type: String, required: true, trim: true, default: "Default" },
  color: { type: String, required: true, trim: true, default: "Default" },
  sku: { type: String, required: true, unique: true, trim: true },
  price: { type: Number, min: 0 },
  stockQuantity: { type: Number, required: true, default: 0, min: 0 },
  imageUrl: { type: String },
  isDefault: { type: Boolean, default: false },
});

export default mongoose.model("ProductVariant", productVariantSchema);
