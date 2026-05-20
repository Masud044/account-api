import { Router } from "express";
import { getSaleExpenseReport } from "./controller.js";

const router = Router();

// GET /api/report/sale-expense?from_date=2026-01-01&to_date=2026-05-31
router.get("/sale-expense", getSaleExpenseReport);

export default router;