import express from 'express';
import * as c from './controller.js';

const router = express.Router();

router.get('/', c.getFinancialProjections);
router.post('/', c.createFinancialProjection);
router.put('/:id', c.updateFinancialProjection);
router.delete('/:id', c.deleteFinancialProjection);

export default router;