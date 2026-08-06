import express from 'express';
import {
  fetchExpenseReport,
  fetchIncomeReport,
} from './controller.js';

const router = express.Router();

// GET /api/gl-report/expense?fromDate=2026-05-01&toDate=2026-05-31
router.get('/expense', fetchExpenseReport);

// GET /api/gl-report/income?fromDate=2026-06-01&toDate=2026-06-30
router.get('/income', fetchIncomeReport);

export default router;