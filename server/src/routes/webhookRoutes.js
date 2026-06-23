import { Router } from "express";
import { handleNcmWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/ncm", handleNcmWebhook);

export default router;
