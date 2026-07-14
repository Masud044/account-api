import express from 'express';
import { fetchCashFlowStatement, fetchCashFlowDetails, fetchCashFlowSummary} from './controller.js';

const router = express.Router();

router.get('/cash-flow/statement', fetchCashFlowStatement);
router.get('/cash-flow/details', fetchCashFlowDetails);

router.get('/cash-flow/summary', fetchCashFlowSummary);
export default router;