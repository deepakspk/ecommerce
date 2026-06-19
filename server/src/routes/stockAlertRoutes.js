import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createStockAlert } from "../controllers/stockAlertController.js";

const router = Router();
router.use(protect);

router.post(
  "/",
  [body("variantId").isMongoId().withMessage("variantId must be a valid id")],
  validate,
  createStockAlert
);

export default router;
