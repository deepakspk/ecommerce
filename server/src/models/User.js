import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String },
    avatarUrl: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["CUSTOMER", "ADMIN", "SUPER_ADMIN"], default: "CUSTOMER" },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    phoneVerified: { type: Boolean, default: false },
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("User", userSchema);
