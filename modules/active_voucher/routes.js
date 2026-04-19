import { Router } from "express";
import { activateVoucher } from "./controller.js";

const router = Router();
router.get("/", activateVoucher);

export default router;
