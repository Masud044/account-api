import { Router } from "express";
import { incomeReport, incomeReportFilters } from "./controller.js";

const router = Router();

router.get("/filters", incomeReportFilters);
router.get("/", incomeReport);

export default router;