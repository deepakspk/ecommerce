import { Router } from "express";
import { query, param } from "express-validator";
import { validate } from "../middleware/validate.js";
import { getAvailableFilters, listProducts, getProduct } from "../controllers/productController.js";
import reviewRoutes from "./reviewRoutes.js";
import questionRoutes from "./questionRoutes.js";

const router = Router();

// must be registered before /:slug to avoid "available-filters" being caught as a slug
router.get("/available-filters", getAvailableFilters);

router.use("/:productId/reviews", reviewRoutes);
router.use("/:productId/questions", questionRoutes);

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100"),
    query("minPrice").optional().isFloat({ min: 0 }).withMessage("minPrice must be a non-negative number"),
    query("maxPrice").optional().isFloat({ min: 0 }).withMessage("maxPrice must be a non-negative number"),
  ],
  validate,
  listProducts
);

router.get("/:slug", [param("slug").notEmpty()], validate, getProduct);

export default router;
