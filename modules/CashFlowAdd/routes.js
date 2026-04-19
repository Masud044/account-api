import { Router } from "express";
import { createCashFlow } from "./controller.js";

const router = Router();
router.post("/", createCashFlow);

export default router;
