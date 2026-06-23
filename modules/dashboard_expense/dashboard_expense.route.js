import { Router } from "express";
import { getExpense, getExpenseDetails } from "./dashboard_expense.controller.js";

const router = Router();

// GET /api/dashboard/expense?month=09&year=2025
router.get("/", getExpense);

// GET /api/dashboard/expense/breakdown?month=09&year=2025
router.get("/breakdown", getExpenseDetails);

export default router;