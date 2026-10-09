import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

router.get('/vendors', controller.listVendors);
router.get('/coa', controller.getCoa);
router.get('/vendor/:id', controller.getVendor);
router.post('/vendors', controller.createVendor);
router.post('/record_advance', controller.recordAdvance);
router.post('/save_invoice', controller.saveInvoice);
router.post('/settle', controller.settle);
router.post('/cancel_invoice', controller.cancelInvoice);
router.post('/cancel_payment', controller.cancelPayment);
router.post('/refund_advance', controller.refundAdvance);
router.post('/cancel_refund', controller.cancelRefund);

export default router;
