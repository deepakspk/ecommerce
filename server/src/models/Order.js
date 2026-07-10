import mongoose from "mongoose";
import { generateTrackingId } from "../utils/trackingId.js";

const orderAddressSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    country: { type: String, required: true, default: "Nepal" },
    province: { type: String, required: function () { return this.country === "Nepal"; } },
    district: { type: String, required: function () { return this.country === "Nepal"; } },
    city: { type: String, required: true },
    branchName: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    area: { type: String },
    street: { type: String },
    landmark: { type: String },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    productName: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    occurredAt: { type: Date, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Customer-facing tracking code — sparse because orders that predate the
    // field have none until the backfill script runs.
    trackingId: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    address: { type: orderAddressSchema, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "PACKED", "PICKED", "SHIPPED", "ARRIVED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: null },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ["ESEWA", "KHALTI", "COD", "MANUAL"], required: true },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    items: { type: [orderItemSchema], required: true },
    statusHistory: { type: [statusHistorySchema], default: [] },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// A collision across 36^10 ids is vanishingly rare, but the unique index would
// make one fatal to checkout — retry a few times before giving up.
orderSchema.pre("validate", async function () {
  if (!this.isNew || this.trackingId) return;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateTrackingId();
    if (!(await this.constructor.exists({ trackingId: candidate }))) {
      this.trackingId = candidate;
      return;
    }
  }
  throw new Error("Could not generate a unique tracking id");
});

export default mongoose.model("Order", orderSchema);
