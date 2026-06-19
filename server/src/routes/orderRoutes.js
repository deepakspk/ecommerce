import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createOrder, listOrders, getOrder, cancelOrder } from "../controllers/orderController.js";
import { createReturnRequest, getMyReturnRequests } from "../controllers/returnController.js";

const router = Router();
router.use(protect);

const orderIdParam = param("id").isMongoId().withMessage("Invalid order id");

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
router.get("/:id", [orderIdParam], validate, getOrder);
router.post("/:id/cancel", [orderIdParam], validate, cancelOrder);
router.get("/:id/return", [orderIdParam], validate, getMyReturnRequests);
router.post(
  "/:id/return",
  [
    orderIdParam,
    body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
    body("items.*.variantId").isMongoId().withMessage("each item needs a valid variantId"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("each item needs a quantity of at least 1"),
    body("items.*.reason").trim().notEmpty().withMessage("each item needs a reason"),
  ],
  validate,
  createReturnRequest
);

export default router;
