import { Router } from "express";
import { getHomeCampaigns, getCampaignBySlug } from "../controllers/campaignController.js";

const router = Router();

router.get("/home", getHomeCampaigns);
router.get("/:slug", getCampaignBySlug);

export default router;
