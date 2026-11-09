import { Router } from "express";
import { expenseReport, expenseReportFilters } from "./controller.js";

const router = Router();

router.get("/filters", expenseReportFilters);
router.get("/", expenseReport);

export default router;