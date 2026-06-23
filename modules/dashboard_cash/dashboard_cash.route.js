import { Router } from "express";
import { getCash, getBalance } from "./dashboard_cash.controller.js";

const router = Router();

// GET /api/dashboard/cash?month=09&year=2025
router.get("/", getCash);

// GET /api/dashboard/cash/balance/:code
router.get("/balance/:code", getBalance);

export default router;