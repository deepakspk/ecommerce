import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  getWishlist,
  addItem,
  removeItem,
  clearWishlist,
  mergeWishlist,
} from "../controllers/wishlistController.js";

const router = Router();
router.use(protect); // every wishlist endpoint requires a logged-in user

router.get("/", getWishlist);

router.post(
  "/items",
  [body("productId").isMongoId().withMessage("productId must be a valid id")],
  validate,
  addItem
);

router.delete(
  "/items/:productId",
  [param("productId").isMongoId().withMessage("productId must be a valid id")],
  validate,
  removeItem
);

router.delete("/", clearWishlist);

router.post(
  "/merge",
  [body("items").isArray().withMessage("items must be an array")],
  validate,
  mergeWishlist
);

export default router;
