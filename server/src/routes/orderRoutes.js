import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createOrder, listOrders, getOrder } from "../controllers/orderController.js";

const router = Router();
router.use(protect);

router.post(
  "/",
  [
    body("addressId").isMongoId().withMessage("addressId must be a valid id"),
    body("paymentMethod").optional().isIn(["COD", "KHALTI", "ESEWA"]).withMessage("Invalid paymentMethod"),
    body("couponCode").optional().trim(),
  ],
  validate,
  createOrder
);
router.get("/", listOrders);
router.get("/:id", [param("id").isMongoId().withMessage("Invalid order id")], validate, getOrder);

export default router;
