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

function isNepal(req) {
  return !req.body.country?.trim() || req.body.country.trim() === "Nepal";
}

const addressBodyValidators = [
  body("recipientName").trim().notEmpty().withMessage("recipientName is required"),
  body("phone").trim().notEmpty().withMessage("phone is required"),
  body("country").trim().notEmpty().withMessage("country is required"),
  body("province")
    .trim()
    .custom((value, { req }) => {
      if (!isNepal(req)) return true;
      if (!value) throw new Error("province is required");
      if (!VALID_PROVINCES.includes(value.toLowerCase())) throw new Error("Invalid province");
      return true;
    }),
  body("district")
    .trim()
    .custom((value, { req }) => {
      if (!isNepal(req)) return true;
      if (!value) throw new Error("district is required");
      return true;
    }),
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
