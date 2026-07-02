import express from 'express';
import * as invoiceController from './controller.js';

const router = express.Router();

router.get('/',     invoiceController.getAll);
router.post('/',    invoiceController.create);
router.get('/:hid', invoiceController.getSingle);
router.delete('/:hid', invoiceController.remove);

export default router;