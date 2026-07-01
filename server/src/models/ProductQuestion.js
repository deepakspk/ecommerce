import mongoose from "mongoose";

const productQuestionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, trim: true, maxlength: 2000, default: null },
    answeredById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("ProductQuestion", productQuestionSchema);
