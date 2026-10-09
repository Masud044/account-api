import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

router.get('/journal', controller.listJournal);
router.get('/general-ledger-ap', controller.listGeneralLedger);
router.get('/gl-accounts', controller.listGlAccounts);

export default router;
