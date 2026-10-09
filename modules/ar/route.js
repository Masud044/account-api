import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

router.get('/customers', controller.listCustomers);
router.get('/coa', controller.getCoa);
router.get('/customer/:id', controller.getCustomer);
router.post('/customers', controller.createCustomer);
router.post('/record_advance', controller.recordAdvance);
router.post('/save_invoice', controller.saveInvoice);
router.post('/settle', controller.settle);
router.post('/cancel_invoice', controller.cancelInvoice);
router.post('/cancel_receipt', controller.cancelReceipt);
router.post('/refund_advance', controller.refundAdvance);
router.post('/cancel_refund', controller.cancelRefund);

export default router;
