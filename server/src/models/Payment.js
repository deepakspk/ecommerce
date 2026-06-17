import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    gateway: { type: String, enum: ["ESEWA", "KHALTI", "COD"], required: true },
    amount: { type: Number, required: true, min: 0 },
    transactionId: { type: String },
    gatewayRef: { type: String },
    status: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING" },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("Payment", paymentSchema);
