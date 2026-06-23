import { Router } from "express";
import { body, param } from "express-validator";
import passport from "../config/passport.js";
import { validate } from "../middleware/validate.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { loginLimiter, otpRequestLimiter } from "../middleware/rateLimiter.js";
import { isValidNepaliPhone } from "../utils/otp.js";
import {
  signup,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  requestOtp,
  verifyOtp,
  getMe,
  updateProfile,
  changePassword,
  googleCallback,
} from "../controllers/authController.js";

const router = Router();

router.post(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("phone")
      .optional({ values: "falsy" })
      .custom((value) => isValidNepaliPhone(value))
      .withMessage("Phone must be a valid Nepali number (+977 98/97XXXXXXXX)"),
  ],
  validate,
  signup
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("A valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.get(
  "/verify-email/:token",
  [param("token").notEmpty()],
  validate,
  verifyEmail
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("A valid email is required")],
  validate,
  forgotPassword
);

router.post(
  "/reset-password/:token",
  [
    param("token").notEmpty(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  resetPassword
);

router.post(
  "/otp/request",
  otpRequestLimiter,
  [body("phone").custom((value) => isValidNepaliPhone(value)).withMessage("Phone must be a valid Nepali number")],
  validate,
  requestOtp
);

router.post(
  "/otp/verify",
  [
    body("phone").custom((value) => isValidNepaliPhone(value)).withMessage("Phone must be a valid Nepali number"),
    body("code").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  validate,
  verifyOtp
);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google`,
  }),
  googleCallback
);

router.get("/me", protect, getMe);

router.put(
  "/profile",
  protect,
  upload.single("avatar"),
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("A valid email is required"),
    body("phone")
      .optional({ values: "falsy" })
      .custom((value) => isValidNepaliPhone(value))
      .withMessage("Phone must be a valid Nepali number (+977 98/97XXXXXXXX)"),
  ],
  validate,
  updateProfile
);

router.post(
  "/change-password",
  protect,
  [body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")],
  validate,
  changePassword
);

export default router;
