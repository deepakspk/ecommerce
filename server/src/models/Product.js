import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    altText: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

// Free-form label/value pairs so admins can attach whatever spec fields fit the
// product (Author/Publisher/Genre for books, Material/Weight for apparel, etc.)
// without the schema needing a fixed set of attribute fields.
const additionalInfoSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    value: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Rich-text HTML (sanitized server-side before save) — short teaser capped at
    // 500 visible characters, enforced in the request validators, not here, since
    // maxlength here would count markup instead of the text the admin actually typed.
    shortDescription: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    additionalInformation: { type: [additionalInfoSchema], default: [] },
    weight: { type: Number, min: 0 },
    // Free text like "12 Months Brand Warranty" — empty means no warranty shown.
    warranty: { type: String, trim: true, maxlength: 200, default: "" },
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A product must belong to at least one category",
      },
    },
    basePrice: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: ["PERCENTAGE", "FIXED"], default: null },
    discountValue: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    images: { type: [productImageSchema], default: [] },
    featureTypes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "FeatureType" }],
      default: [],
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

productSchema.index({ categories: 1 });
productSchema.index({ featureTypes: 1 });

export default mongoose.model("Product", productSchema);
