import { Router } from "express";
import { param, query } from "express-validator";
import { validate } from "../middleware/validate.js";
import {
  getRootCategories,
  getCategoryTree,
  searchCategories,
  getCategoryById,
  getChildren,
  getBreadcrumbs,
} from "../controllers/categoryController.js";

const router = Router();
const mongoIdParam = param("id").isMongoId().withMessage("Invalid category id");

// Static sub-paths must be registered before the "/:id" param route.
router.get("/", getRootCategories);
router.get("/root", getRootCategories);
router.get("/tree", getCategoryTree);
router.get("/search", [query("q").optional().trim()], validate, searchCategories);
router.get("/:id", [mongoIdParam], validate, getCategoryById);
router.get("/:id/children", [mongoIdParam], validate, getChildren);
router.get("/:id/breadcrumbs", [mongoIdParam], validate, getBreadcrumbs);

export default router;
