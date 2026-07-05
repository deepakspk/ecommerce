import mongoose from "mongoose";

const featureTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

featureTypeSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model("FeatureType", featureTypeSchema);
