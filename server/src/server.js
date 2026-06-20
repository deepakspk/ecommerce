import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { checkAbandonedCarts } from "./utils/abandonedCart.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import stockAlertRoutes from "./routes/stockAlertRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import { protect, requireRole } from "./middleware/auth.js";

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
app.use(passport.initialize());
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});


app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stock-alerts", stockAlertRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/admin/ping", protect, requireRole("ADMIN"), (req, res) => {
  res.json({ message: `Welcome, admin ${req.user.name}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 5000;

const ABANDONED_CART_CHECK_INTERVAL_MS = 60 * 60 * 1000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    setInterval(
      () => checkAbandonedCarts().catch((err) => console.error("[abandoned-cart] check failed:", err.message)),
      ABANDONED_CART_CHECK_INTERVAL_MS
    );
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
