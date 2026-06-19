import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "" },
    image: { type: String, default: "" },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    level: { type: Number, default: 0 },
    path: { type: [mongoose.Schema.Types.ObjectId], ref: "Category", default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seoTitle: { type: String, trim: true, default: "" },
    seoDescription: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ path: 1 });

export default mongoose.model("Category", categorySchema);
