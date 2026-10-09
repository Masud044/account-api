import express from 'express';
import * as controller from './controller.js';

const router = express.Router();

router.get('/aging', controller.getAging);
router.get('/outstanding', controller.getOutstanding);
router.get('/statement', controller.getStatement);
router.get('/gl-summary', controller.getGlSummary);

export default router;
