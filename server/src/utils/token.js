import jwt from "jsonwebtoken";
import crypto from "crypto";

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function generateRawToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashRawToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
