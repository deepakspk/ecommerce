import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { listAddresses, createAddress, updateAddress, deleteAddress, setDefault } from "../controllers/addressController.js";

const router = Router();
router.use(protect);

router.get("/", listAddresses);
router.post("/", createAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);
router.patch("/:id/default", setDefault);

export default router;
