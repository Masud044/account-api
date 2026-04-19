import { Router } from "express";
import { updateVoucher } from "./controller.js";

const router = Router();
router.put("/", updateVoucher);
router.post("/", updateVoucher);

export default router;
