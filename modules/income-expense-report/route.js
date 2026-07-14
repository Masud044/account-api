import express from 'express';
import {
  fetchIncomeStatement,
  fetchExpenseStatement,

} from './controller.js';

const router = express.Router();

router.get('/income-statement', fetchIncomeStatement);
router.get('/expense-statement', fetchExpenseStatement);


export default router;