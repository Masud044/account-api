import { Router } from "express";
import { getCash } from "./dashboard_cash.controller.js";

const router = Router();

// GET /api/dashboard/cash?month=09&year=2025
router.get("/", getCash);

export default router;
