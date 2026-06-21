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
  updateOrder,
  updateStatus,
  markPaid,
  downloadInvoice,
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
import {
  getProviders,
  getProviderBranches,
  getRatePreview,
  createShipment,
  getShipmentForOrder,
  getShipmentLabel,
  refreshShipment,
  returnShipment,
  getShipmentDetails,
  getShipmentComments,
  addShipmentComment,
} from "../controllers/admin/logisticsController.js";
import { listUsers, updateUserRole, updateUserStatus } from "../controllers/admin/userController.js";
import { listAuditLog } from "../controllers/admin/auditLogController.js";
import { getReportSummary, exportOrdersCsv } from "../controllers/admin/reportsController.js";
import { listSettings, updateGroup, exportSettings } from "../controllers/admin/settingsController.js";
import { SETTINGS_GROUPS } from "../config/settingsSchema.js";
import { getCompanySettingsAdmin, updateCompanySettings } from "../controllers/admin/companySettingsController.js";
import { getThemeSettingsAdmin, updateThemeSettings } from "../controllers/admin/themeSettingsController.js";
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "../controllers/admin/bannerController.js";

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

const bannerBodyValidators = [body("link").optional().trim()];

const bannerReorderValidators = [
  body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.id").isMongoId().withMessage("each item needs a valid id"),
  body("items.*.sortOrder").isInt().withMessage("each item needs an integer sortOrder"),
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

const orderUpdateBodyValidators = [
  body("items").optional().isArray({ min: 1 }).withMessage("items must be a non-empty array"),
  body("items.*.variantId").optional().isMongoId().withMessage("each item needs a valid variantId"),
  body("items.*.productName").optional().trim().notEmpty().withMessage("each item needs a productName"),
  body("items.*.size").optional().trim().notEmpty().withMessage("each item needs a size"),
  body("items.*.color").optional().trim().notEmpty().withMessage("each item needs a color"),
  body("items.*.unitPrice").optional().isFloat({ min: 0 }).withMessage("each item needs a non-negative unitPrice"),
  body("items.*.quantity").optional().isInt({ min: 1 }).withMessage("each item needs a quantity of at least 1"),
  body("address.recipientName").optional().trim().notEmpty().withMessage("recipientName cannot be empty"),
  body("address.phone").optional().trim().notEmpty().withMessage("address phone cannot be empty"),
  body("address.province").optional().trim().notEmpty().withMessage("province cannot be empty"),
  body("address.district").optional().trim().notEmpty().withMessage("district cannot be empty"),
  body("address.city").optional().trim().notEmpty().withMessage("city cannot be empty"),
  body("address.area").optional().trim(),
  body("address.street").optional().trim(),
  body("address.landmark").optional().trim(),
  body("customer.name").optional().trim().notEmpty().withMessage("customer name cannot be empty"),
  body("customer.email").optional().trim().isEmail().withMessage("customer email must be valid"),
  body("customer.phone").optional().trim().notEmpty().withMessage("customer phone cannot be empty"),
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
router.get("/orders/:id/invoice", [mongoIdParam("id")], validate, downloadInvoice);
router.put(
  "/orders/:id",
  [mongoIdParam("id"), ...orderUpdateBodyValidators],
  validate,
  updateOrder
);
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

// Users
router.get("/users", listUsers);
router.patch(
  "/users/:id/role",
  [mongoIdParam("id"), body("role").isIn(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]).withMessage("Invalid role")],
  validate,
  updateUserRole
);
router.patch(
  "/users/:id/status",
  [mongoIdParam("id"), body("status").isIn(["ACTIVE", "DISABLED"]).withMessage("Invalid status")],
  validate,
  updateUserStatus
);

// Audit log
router.get("/audit-log", listAuditLog);

// Reports
router.get("/reports/summary", getReportSummary);
router.get("/reports/export", exportOrdersCsv);

// System Settings (SUPER_ADMIN only — stricter than the router-level ADMIN gate above)
router.get("/settings", requireRole("SUPER_ADMIN"), listSettings);
router.get("/settings/export", requireRole("SUPER_ADMIN"), exportSettings);
router.put(
  "/settings/:group",
  requireRole("SUPER_ADMIN"),
  [param("group").isIn(SETTINGS_GROUPS).withMessage("Invalid settings group")],
  validate,
  updateGroup
);

// Company Settings (SUPER_ADMIN only)
router.get("/company-settings", requireRole("SUPER_ADMIN"), getCompanySettingsAdmin);
router.put(
  "/company-settings",
  requireRole("SUPER_ADMIN"),
  upload.fields([{ name: "logo", maxCount: 1 }, { name: "favicon", maxCount: 1 }]),
  [
    body("email").optional({ values: "falsy" }).isEmail().withMessage("email must be valid"),
  ],
  validate,
  updateCompanySettings
);

// Theme Settings (SUPER_ADMIN only)
const hexColorValidator = (field) =>
  body(field).optional({ values: "falsy" }).matches(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).withMessage(`${field} must be a valid hex color`);

router.get("/theme-settings", requireRole("SUPER_ADMIN"), getThemeSettingsAdmin);
router.put(
  "/theme-settings",
  requireRole("SUPER_ADMIN"),
  [
    hexColorValidator("primaryColor"),
    hexColorValidator("secondaryColor"),
    hexColorValidator("accentColor"),
    hexColorValidator("buttonColor"),
    hexColorValidator("textColor"),
    hexColorValidator("backgroundColor"),
  ],
  validate,
  updateThemeSettings
);

// Banners
router.get("/banners", listBanners);
router.post("/banners", upload.single("image"), bannerBodyValidators, validate, createBanner);
router.patch("/banners/reorder", bannerReorderValidators, validate, reorderBanners);
router.put(
  "/banners/:id",
  upload.single("image"),
  [mongoIdParam("id"), ...bannerBodyValidators],
  validate,
  updateBanner
);
router.delete("/banners/:id", [mongoIdParam("id")], validate, deleteBanner);

// Logistics
router.get("/logistics/providers", getProviders);
router.get("/logistics/providers/:code/branches", getProviderBranches);
router.post("/logistics/providers/:code/rate", getRatePreview);
router.get("/orders/:id/shipment", [mongoIdParam("id")], validate, getShipmentForOrder);
router.post(
  "/orders/:id/shipment",
  [
    mongoIdParam("id"),
    body("provider").trim().notEmpty().withMessage("provider is required"),
    body("toBranch").trim().notEmpty().withMessage("toBranch is required"),
  ],
  validate,
  createShipment
);
router.post("/shipments/:id/refresh", [mongoIdParam("id")], validate, refreshShipment);
router.get("/shipments/:id/label", [mongoIdParam("id")], validate, getShipmentLabel);
router.post(
  "/shipments/:id/return",
  [mongoIdParam("id"), body("reason").optional().trim()],
  validate,
  returnShipment
);
router.get("/shipments/:id/details", [mongoIdParam("id")], validate, getShipmentDetails);
router.get("/shipments/:id/comments", [mongoIdParam("id")], validate, getShipmentComments);
router.post(
  "/shipments/:id/comments",
  [mongoIdParam("id"), body("message").trim().notEmpty().withMessage("message is required")],
  validate,
  addShipmentComment
);

export default router;
