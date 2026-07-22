import express from 'express';
import * as glReportController from './controller.js';

const router = express.Router();

router.get('/monthly-debit', glReportController.monthlyDebitByAccount);
router.get('/cash-flow', glReportController.cashFlowSummary);

export default router;