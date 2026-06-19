import { Router } from "express";
import { body, param } from "express-validator";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import {
  listCategories,
  getCategoryTree,
  getCategory,
  getCategoryStats,
  getCategoryBreadcrumbs,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
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
import {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/admin/couponController.js";
import {
  listReturns,
  getReturn,
  updateReturnStatus,
} from "../controllers/admin/returnController.js";

const router = Router();
router.use(protect, requireRole("ADMIN"));

const mongoIdParam = (name) => param(name).isMongoId().withMessage(`Invalid ${name}`);

const categoryBodyValidators = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("parent").optional({ values: "falsy" }).isMongoId().withMessage("parent must be a valid id"),
  body("description").optional().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("sortOrder").optional().isInt().withMessage("sortOrder must be an integer"),
  body("seoTitle").optional().trim(),
  body("seoDescription").optional().trim(),
];

const categoryUpdateBodyValidators = [
  body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
  body("parent").optional({ values: "falsy" }).isMongoId().withMessage("parent must be a valid id"),
  body("description").optional().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
  body("sortOrder").optional().isInt().withMessage("sortOrder must be an integer"),
  body("seoTitle").optional().trim(),
  body("seoDescription").optional().trim(),
];

const reorderBodyValidators = [
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.id").isMongoId().withMessage("each item needs a valid id"),
  body("items.*.sortOrder").isInt().withMessage("each item needs an integer sortOrder"),
];

const couponBodyValidators = [
  body("code").trim().notEmpty().withMessage("code is required"),
  body("type").isIn(["PERCENTAGE", "FIXED"]).withMessage("type must be PERCENTAGE or FIXED"),
  body("value").isFloat({ min: 0 }).withMessage("value must be a non-negative number"),
  body("minOrderValue").optional().isFloat({ min: 0 }).withMessage("minOrderValue must be a non-negative number"),
  body("maxDiscountAmount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("maxDiscountAmount must be a non-negative number"),
  body("usageLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("usageLimit must be a non-negative integer"),
  body("perUserLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("perUserLimit must be a non-negative integer"),
  body("startsAt").optional({ values: "falsy" }).isISO8601().withMessage("startsAt must be a valid date"),
  body("expiresAt").optional({ values: "falsy" }).isISO8601().withMessage("expiresAt must be a valid date"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

const couponUpdateBodyValidators = [
  body("code").optional().trim().notEmpty().withMessage("code cannot be empty"),
  body("type").optional().isIn(["PERCENTAGE", "FIXED"]).withMessage("type must be PERCENTAGE or FIXED"),
  body("value").optional().isFloat({ min: 0 }).withMessage("value must be a non-negative number"),
  body("minOrderValue").optional().isFloat({ min: 0 }).withMessage("minOrderValue must be a non-negative number"),
  body("maxDiscountAmount")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 })
    .withMessage("maxDiscountAmount must be a non-negative number"),
  body("usageLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("usageLimit must be a non-negative integer"),
  body("perUserLimit")
    .optional({ values: "falsy" })
    .isInt({ min: 0 })
    .withMessage("perUserLimit must be a non-negative integer"),
  body("startsAt").optional({ values: "falsy" }).isISO8601().withMessage("startsAt must be a valid date"),
  body("expiresAt").optional({ values: "falsy" }).isISO8601().withMessage("expiresAt must be a valid date"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

const productBodyValidators = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("categories")
    .custom((value) => {
      const list = typeof value === "string" ? JSON.parse(value) : value;
      return Array.isArray(list) && list.length > 0;
    })
    .withMessage("categories must be a non-empty array of category ids"),
  body("basePrice").isFloat({ min: 0 }).withMessage("basePrice must be a non-negative number"),
];

const productUpdateBodyValidators = [
  body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
  body("categories")
    .optional()
    .custom((value) => {
      const list = typeof value === "string" ? JSON.parse(value) : value;
      return Array.isArray(list) && list.length > 0;
    })
    .withMessage("categories must be a non-empty array of category ids"),
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
router.get("/categories/tree", getCategoryTree);
router.post("/categories", upload.single("image"), categoryBodyValidators, validate, createCategory);
router.patch("/categories/reorder", reorderBodyValidators, validate, reorderCategories);
router.get("/categories/:id", [mongoIdParam("id")], validate, getCategory);
router.get("/categories/:id/stats", [mongoIdParam("id")], validate, getCategoryStats);
router.get("/categories/:id/breadcrumbs", [mongoIdParam("id")], validate, getCategoryBreadcrumbs);
router.put(
  "/categories/:id",
  upload.single("image"),
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

// Coupons
router.get("/coupons", listCoupons);
router.post("/coupons", couponBodyValidators, validate, createCoupon);
router.get("/coupons/:id", [mongoIdParam("id")], validate, getCoupon);
router.put("/coupons/:id", [mongoIdParam("id"), ...couponUpdateBodyValidators], validate, updateCoupon);
router.delete("/coupons/:id", [mongoIdParam("id")], validate, deleteCoupon);

// Returns
router.get("/returns", listReturns);
router.get("/returns/:id", [mongoIdParam("id")], validate, getReturn);
router.patch(
  "/returns/:id/status",
  [
    mongoIdParam("id"),
    body("status").isIn(["APPROVED", "REJECTED", "PICKED_UP", "REFUNDED"]).withMessage("Invalid status"),
    body("adminNote").optional().trim(),
  ],
  validate,
  updateReturnStatus
);

export default router;
