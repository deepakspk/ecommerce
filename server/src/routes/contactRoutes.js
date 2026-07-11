import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { contactLimiter } from "../middleware/rateLimiter.js";
import { submitContactMessage } from "../controllers/contactController.js";

const router = Router();

router.post(
  "/",
  contactLimiter,
  [
    body("name").optional({ values: "falsy" }).trim().isLength({ max: 120 }).withMessage("name must be 120 characters or fewer"),
    body("email").trim().isEmail().withMessage("A valid email is required"),
    body("phone").optional({ values: "falsy" }).trim().isLength({ max: 20 }).withMessage("phone must be 20 characters or fewer"),
    body("message")
      .trim()
      .notEmpty()
      .withMessage("message is required")
      .isLength({ max: 5000 })
      .withMessage("message must be 5000 characters or fewer"),
  ],
  validate,
  submitContactMessage
);

export default router;
