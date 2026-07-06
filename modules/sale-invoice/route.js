import express from 'express';
import * as invoiceController from './controller.js';

const router = express.Router();

router.get('/dashboard/breakdown',       invoiceController.dashboardBreakdown);
router.get('/dashboard/monthly-summary', invoiceController.dashboardMonthlySummary);
router.get('/dashboard/daily-summary', invoiceController.dashboardDailySummary);

router.get('/',     invoiceController.getAll);
router.post('/',    invoiceController.create);
router.get('/:hid', invoiceController.getSingle);
router.delete('/:hid', invoiceController.remove);
router.put('/:hid', invoiceController.update);

export default router;