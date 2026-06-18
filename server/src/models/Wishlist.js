import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  { productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true } },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: { type: [wishlistItemSchema], default: [] },
});

export default mongoose.model("Wishlist", wishlistSchema);
