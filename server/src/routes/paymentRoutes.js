import { Router } from "express";
import { body } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { initiateKhalti, verifyKhalti } from "../controllers/paymentController.js";

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

export default router;
