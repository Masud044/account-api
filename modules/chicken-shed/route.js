import { Router } from "express";
import { getSheds, getShed, addShed, editShed, removeShed } from "./controller.js";

const router = Router();

router.get("/shed", getSheds);
router.get("/shed/:id", getShed);
router.post("/shed", addShed);
router.put("/shed/:id", editShed);
router.delete("/shed/:id", removeShed);

export default router;