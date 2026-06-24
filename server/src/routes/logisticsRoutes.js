import { Router } from "express";
import { body, query } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { listDistrictBranches, getDeliveryRate } from "../controllers/logisticsController.js";

const router = Router();
router.use(protect);

router.get(
  "/branches",
  [query("district").trim().notEmpty().withMessage("district is required")],
  validate,
  listDistrictBranches
);

router.post(
  "/rate",
  [body("branchName").trim().notEmpty().withMessage("branchName is required")],
  validate,
  getDeliveryRate
);

export default router;
