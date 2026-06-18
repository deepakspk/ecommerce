import { Router } from "express";
import { body, param } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/admin/categoryController.js";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
} from "../controllers/admin/productController.js";
import {
  listInventory,
  adjustStock,
  listLogs,
} from "../controllers/admin/inventoryController.js";
import {
  getDashboardStats,
  listOrders,
  getOrder,
  updateStatus,
  markPaid,
} from "../controllers/admin/orderController.js";

const router = Router();
router.use(protect, requireRole("ADMIN"));

const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

const categoryBodyValidators = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("parentId").optional({ values: "falsy" }).isMongoId().withMessage("parentId must be a valid id"),
];

const categoryUpdateBodyValidators = [
  body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
  body("parentId").optional({ values: "falsy" }).isMongoId().withMessage("parentId must be a valid id"),
];

const productBodyValidators = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("categoryId").isMongoId().withMessage("categoryId must be a valid id"),
  body("basePrice").isFloat({ min: 0 }).withMessage("basePrice must be a non-negative number"),
];

const productUpdateBodyValidators = [
  body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
  body("categoryId").optional().isMongoId().withMessage("categoryId must be a valid id"),
  body("basePrice").optional().isFloat({ min: 0 }).withMessage("basePrice must be a non-negative number"),
];

const variantBodyValidators = [
  body("size").trim().notEmpty().withMessage("size is required"),
  body("color").trim().notEmpty().withMessage("color is required"),
  body("sku").trim().notEmpty().withMessage("sku is required"),
  body("price").optional().isFloat({ min: 0 }).withMessage("price must be a non-negative number"),
  body("stockQuantity").optional().isInt({ min: 0 }).withMessage("stockQuantity must be a non-negative integer"),
];

const variantUpdateBodyValidators = [
  body("size").optional().trim().notEmpty().withMessage("size cannot be empty"),
  body("color").optional().trim().notEmpty().withMessage("color cannot be empty"),
  body("sku").optional().trim().notEmpty().withMessage("sku cannot be empty"),
  body("price").optional().isFloat({ min: 0 }).withMessage("price must be a non-negative number"),
  body("stockQuantity").optional().isInt({ min: 0 }).withMessage("stockQuantity must be a non-negative integer"),
];

// Categories
router.get("/categories", listCategories);
router.post("/categories", categoryBodyValidators, validate, createCategory);
router.put(
  "/categories/:id",
  [mongoIdParam("id"), ...categoryUpdateBodyValidators],
  validate,
  updateCategory
);
router.delete("/categories/:id", [mongoIdParam("id")], validate, deleteCategory);

// Products
router.get("/products", listProducts);
router.post("/products", upload.array("images", 10), productBodyValidators, validate, createProduct);
router.get("/products/:id", [mongoIdParam("id")], validate, getProduct);
router.put(
  "/products/:id",
  upload.array("images", 10),
  [mongoIdParam("id"), ...productUpdateBodyValidators],
  validate,
  updateProduct
);
router.delete("/products/:id", [mongoIdParam("id")], validate, deleteProduct);

// Variants
router.post(
  "/products/:id/variants",
  [mongoIdParam("id"), ...variantBodyValidators],
  validate,
  addVariant
);
router.put(
  "/products/:id/variants/:variantId",
  [mongoIdParam("id"), mongoIdParam("variantId"), ...variantUpdateBodyValidators],
  validate,
  updateVariant
);
router.delete(
  "/products/:id/variants/:variantId",
  [mongoIdParam("id"), mongoIdParam("variantId")],
  validate,
  deleteVariant
);

// Dashboard stats
router.get("/stats", getDashboardStats);

// Orders
router.get("/orders", listOrders);
router.get("/orders/:id", [mongoIdParam("id")], validate, getOrder);
router.patch(
  "/orders/:id/status",
  [
    mongoIdParam("id"),
    body("status")
      .isIn(["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"])
      .withMessage("Invalid status"),
  ],
  validate,
  updateStatus
);
router.patch("/orders/:id/paid", [mongoIdParam("id")], validate, markPaid);

// Inventory
router.get("/inventory", listInventory);
router.post(
  "/inventory/:variantId/adjust",
  [
    mongoIdParam("variantId"),
    body("change")
      .isFloat({ min: -1000000, max: 1000000 })
      .withMessage("change must be a number")
      .bail()
      .custom((value) => Number(value) !== 0)
      .withMessage("change must be non-zero"),
    body("reason").trim().notEmpty().withMessage("reason is required"),
  ],
  validate,
  adjustStock
);
router.get("/inventory/:variantId/logs", [mongoIdParam("variantId")], validate, listLogs);

export default router;
