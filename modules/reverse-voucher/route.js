import { Router } from "express";
import { handleReverseVoucher } from "./controller.js";

const router = Router();
router.all("/", handleReverseVoucher);

export default router;