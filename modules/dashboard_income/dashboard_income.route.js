import { Router } from "express";
import { getIncome } from "./dashboard_income.controller.js";

const router = Router();

// GET /api/dashboard/income?month=09&year=2025
router.get("/", getIncome);

export default router;
