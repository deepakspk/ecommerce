import { Router } from "express";
import { getThemeSettings } from "../controllers/themeSettingsController.js";

const router = Router();

router.get("/", getThemeSettings);

export default router;
