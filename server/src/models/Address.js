import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  label: { type: String, trim: true },
  recipientName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: "Nepal" },
  province: { type: String, required: function () { return this.country === "Nepal"; }, trim: true },
  district: { type: String, required: function () { return this.country === "Nepal"; }, trim: true },
  city: { type: String, required: true, trim: true },
  branchName: { type: String, trim: true, default: "" },
  postalCode: { type: String, trim: true, default: "" },
  area: { type: String, trim: true },
  street: { type: String, trim: true },
  landmark: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

export default mongoose.model("Address", addressSchema);
