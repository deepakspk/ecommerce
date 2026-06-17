import { Router } from "express";
import { getAvailableFilters, listProducts, getProduct } from "../controllers/productController.js";

const router = Router();

// must be registered before /:slug to avoid "available-filters" being caught as a slug
router.get("/available-filters", getAvailableFilters);
router.get("/", listProducts);
router.get("/:slug", getProduct);

export default router;
