import { Router } from 'express';
import * as inventoryCtrl from './inventory.controller.js';

const router = Router();

router.get('/next-grn-no',     inventoryCtrl.nextGrnNo);
router.get('/next-po-no',      inventoryCtrl.nextPoNo);
router.get('/next-invoice-no', inventoryCtrl.nextInvoiceNo);

router.post  ('/',       inventoryCtrl.create);
router.get   ('/',       inventoryCtrl.getAll);
router.put   ('/:hid/lock', inventoryCtrl.lockInventory);   // ← fix: inventoryCtrl. prefix add
router.get   ('/:hid',   inventoryCtrl.getSingle);
router.put   ('/:hid',   inventoryCtrl.update);
router.delete('/:hid',   inventoryCtrl.remove);

export default router;