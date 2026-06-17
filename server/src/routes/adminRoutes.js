import { Router } from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
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

// Categories
router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// Products
router.get("/products", listProducts);
router.post("/products", upload.array("images", 10), createProduct);
router.get("/products/:id", getProduct);
router.put("/products/:id", upload.array("images", 10), updateProduct);
router.delete("/products/:id", deleteProduct);

// Variants
router.post("/products/:id/variants", addVariant);
router.put("/products/:id/variants/:variantId", updateVariant);
router.delete("/products/:id/variants/:variantId", deleteVariant);

// Dashboard stats
router.get("/stats", getDashboardStats);

// Orders
router.get("/orders", listOrders);
router.get("/orders/:id", getOrder);
router.patch("/orders/:id/status", updateStatus);
router.patch("/orders/:id/paid", markPaid);

// Inventory
router.get("/inventory", listInventory);
router.post("/inventory/:variantId/adjust", adjustStock);
router.get("/inventory/:variantId/logs", listLogs);

export default router;
