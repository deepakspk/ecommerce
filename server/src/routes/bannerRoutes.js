import { Router } from "express";
import { getActiveBanners } from "../controllers/bannerController.js";

const router = Router();

router.get("/", getActiveBanners);

export default router;
