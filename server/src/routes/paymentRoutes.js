import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initiateKhalti, verifyKhalti, initiateEsewa, verifyEsewa } from "../controllers/paymentController.js";

const router = Router();
router.use(protect);

router.post(
  "/khalti/initiate",
  [body("orderId").isMongoId().withMessage("orderId must be a valid id")],
  validate,
  initiateKhalti
);

router.post(
  "/khalti/verify",
  [body("pidx").notEmpty().withMessage("pidx is required")],
  validate,
  verifyKhalti
);

router.post(
  "/esewa/initiate",
  [body("orderId").isMongoId().withMessage("orderId must be a valid id")],
  validate,
  initiateEsewa
);

router.post(
  "/esewa/verify",
  [body("transactionUuid").notEmpty().withMessage("transactionUuid is required")],
  validate,
  verifyEsewa
);

export default router;
