import { Router } from 'express';
import * as generalLedgerCtrl from './controller.js';

const router = Router();

router.get('/', generalLedgerCtrl.getGeneralLedger);

export default router;