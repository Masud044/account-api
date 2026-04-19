import { Router } from "express";
import { getExpense } from "./dashboard_expense.controller.js";

const router = Router();

// GET /api/dashboard/expense?month=09&year=2025
router.get("/", getExpense);

export default router;
