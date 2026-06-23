import { Router } from "express";
import { getIncome, getIncomeDetails } from "./dashboard_income.controller.js";

const router = Router();

// GET /api/dashboard/income?month=09&year=2025
router.get("/", getIncome);

// GET /api/dashboard/income/breakdown?month=09&year=2025
router.get("/breakdown", getIncomeDetails);

export default router;