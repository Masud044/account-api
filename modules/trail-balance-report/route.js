import { Router } from 'express';
import * as trialBalanceCtrl from './controller.js';

const router = Router();

router.get('/', trialBalanceCtrl.getTrialBalance);

export default router;