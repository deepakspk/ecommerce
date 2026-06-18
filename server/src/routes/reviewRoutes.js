import { Router } from "express";
import { body, param, query } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getReviews, getEligibility, createReview } from "../controllers/reviewController.js";

const router = Router({ mergeParams: true });

const productIdCheck = param("productId").isMongoId().withMessage("productId must be a valid id");

router.get(
  "/",
  [
    productIdCheck,
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  ],
  validate,
  getReviews
);

router.get("/eligibility", protect, [productIdCheck], validate, getEligibility);

router.post(
  "/",
  protect,
  [
    productIdCheck,
    body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be between 1 and 5"),
    body("comment").optional().isString().isLength({ max: 1000 }).withMessage("comment must be under 1000 characters"),
  ],
  validate,
  createReview
);

export default router;
