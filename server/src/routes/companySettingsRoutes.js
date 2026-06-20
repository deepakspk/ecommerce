import { Router } from "express";
import { getCompanySettings } from "../controllers/companySettingsController.js";

const router = Router();

router.get("/", getCompanySettings);

export default router;
