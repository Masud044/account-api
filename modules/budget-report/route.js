import express from "express";
import {
  getFarmBudgetReport,
  downloadFarmBudgetReportExcel,
} from "./controller.js";

const router = express.Router();

router.get("/:budgetId", getFarmBudgetReport);
router.get("/:budgetId/excel", downloadFarmBudgetReportExcel);

export default router;