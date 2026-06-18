import { Router } from "express";
import { body, param } from "express-validator";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
  VALID_PROVINCES,
} from "../controllers/addressController.js";

const router = Router();
router.use(protect);

const addressBodyValidators = [
  body("recipientName").trim().notEmpty().withMessage("recipientName is required"),
  body("phone").trim().notEmpty().withMessage("phone is required"),
  body("province")
    .trim()
    .notEmpty()
    .withMessage("province is required")
    .bail()
    .toLowerCase()
    .isIn(VALID_PROVINCES)
    .withMessage("Invalid province"),
  body("district").trim().notEmpty().withMessage("district is required"),
  body("city").trim().notEmpty().withMessage("city is required"),
];

router.get("/", listAddresses);
router.post("/", addressBodyValidators, validate, createAddress);
router.put(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid address id"), ...addressBodyValidators],
  validate,
  updateAddress
);
router.delete("/:id", [param("id").isMongoId().withMessage("Invalid address id")], validate, deleteAddress);
router.patch(
  "/:id/default",
  [param("id").isMongoId().withMessage("Invalid address id")],
  validate,
  setDefault
);

export default router;
