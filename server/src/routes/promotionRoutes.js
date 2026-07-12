import { Router } from "express";
import { getActivePromotions } from "../controllers/promotionController.js";

const router = Router();

router.get("/", getActivePromotions);

export default router;
