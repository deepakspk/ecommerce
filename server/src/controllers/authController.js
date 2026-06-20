import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signAccessToken, generateRawToken, hashRawToken } from "../utils/token.js";
import { generateOtp } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
  };
}

export async function signup(req, res) {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const rawToken = generateRawToken();

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    emailVerificationToken: hashRawToken(rawToken),
    emailVerificationExpires: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
  });

  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    html: `<p>Welcome ${name}! Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
  });

  const token = signAccessToken(user);
  res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash +failedLoginAttempts +lockUntil"
  );

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil - new Date()) / 60000);
    return res.status(423).json({ message: `Account locked. Try again in ${minutes} minute(s).` });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.status === "DISABLED") {
    return res.status(403).json({ message: "This account has been disabled" });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  const token = signAccessToken(user);
  res.json({ token, user: toPublicUser(user) });
}

export async function verifyEmail(req, res) {
  const hashed = hashRawToken(req.params.token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired verification link" });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Email verified successfully" });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const rawToken = generateRawToken();
    user.passwordResetToken = hashRawToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  }

  res.json({ message: "If that email is registered, a reset link has been sent" });
}

export async function resetPassword(req, res) {
  const { password } = req.body;
  const hashed = hashRawToken(req.params.token);

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  res.json({ message: "Password reset successfully" });
}

export async function requestOtp(req, res) {
  const { phone } = req.body;

  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ name: phone, phone, role: "CUSTOMER" });
  }

  const code = generateOtp();
  user.otpCode = code;
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  // TODO: integrate a Nepali SMS gateway (e.g. Sparrow SMS) here in production.
  console.log(`[dev OTP] phone=${phone} code=${code}`);

  res.json({ message: "OTP sent" });
}

export async function verifyOtp(req, res) {
  const { phone, code } = req.body;

  const user = await User.findOne({ phone }).select("+otpCode +otpExpires");
  if (!user || !user.otpCode || user.otpExpires < new Date() || user.otpCode !== code) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  if (user.status === "DISABLED") {
    return res.status(403).json({ message: "This account has been disabled" });
  }

  user.phoneVerified = true;
  user.otpCode = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = signAccessToken(user);
  res.json({ token, user: toPublicUser(user) });
}

export async function getMe(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

export function googleCallback(req, res) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  if (req.user.status === "DISABLED") {
    return res.redirect(`${clientUrl}/login?error=disabled`);
  }
  const token = signAccessToken(req.user);
  res.redirect(`${clientUrl}/oauth-callback?token=${token}`);
}
