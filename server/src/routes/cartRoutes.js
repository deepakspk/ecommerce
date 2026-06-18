import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
} from "../controllers/cartController.js";

const router = Router();
router.use(protect); // every cart endpoint requires a logged-in user

router.get("/", getCart);

router.post(
  "/items",
  [
    body("variantId").isMongoId().withMessage("variantId must be a valid id"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("quantity must be a positive integer"),
  ],
  validate,
  addToCart
);

router.put(
  "/items/:variantId",
  [
    param("variantId").isMongoId().withMessage("variantId must be a valid id"),
    body("quantity").isInt({ min: 1 }).withMessage("quantity must be a positive integer"),
  ],
  validate,
  updateItem
);

router.delete(
  "/items/:variantId",
  [param("variantId").isMongoId().withMessage("variantId must be a valid id")],
  validate,
  removeItem
);

router.delete("/", clearCart);

router.post(
  "/merge",
  [body("items").isArray().withMessage("items must be an array")],
  validate,
  mergeCart
);

export default router;
