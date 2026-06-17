import { Router } from "express";
import { protect } from "../middleware/auth.js";
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
router.post("/items", addToCart);
router.put("/items/:variantId", updateItem);
router.delete("/items/:variantId", removeItem);
router.delete("/", clearCart);
router.post("/merge", mergeCart);

export default router;
