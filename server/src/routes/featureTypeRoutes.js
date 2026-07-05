import { Router } from "express";
import { getActiveFeatureTypes } from "../controllers/featureTypeController.js";

const router = Router();

router.get("/", getActiveFeatureTypes);

export default router;
