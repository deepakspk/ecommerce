import mongoose from "mongoose";

const trackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    rawStatus: { type: String },
    description: { type: String },
    occurredAt: { type: Date },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    provider: { type: String, required: true },
    providerShipmentId: { type: String, required: true },
    status: {
      type: String,
      enum: ["BOOKED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNED", "CANCELLED", "FAILED"],
      default: "BOOKED",
    },
    rawStatus: { type: String },
    fromBranch: { type: String },
    toBranch: { type: String },
    codCharge: { type: Number },
    deliveryCharge: { type: Number },
    trackingEvents: { type: [trackingEventSchema], default: [] },
    meta: { type: mongoose.Schema.Types.Mixed },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

shipmentSchema.index({ provider: 1, providerShipmentId: 1 });

export default mongoose.model("Shipment", shipmentSchema);
