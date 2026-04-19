import { Router } from "express";
import { createGlVoucher } from "./controller.js";

const router = Router();
router.post("/", createGlVoucher);

export default router;
