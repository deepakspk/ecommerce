import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    altText: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A product must belong to at least one category",
      },
    },
    basePrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    images: { type: [productImageSchema], default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

productSchema.index({ categories: 1 });

export default mongoose.model("Product", productSchema);
