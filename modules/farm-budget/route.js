import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// Details (literal paths — must come before /:id)
router.get('/details',        c.getDetails);       // ?budgetId=
router.post('/details',       c.createDetail);
router.put('/details/:id',    c.updateDetail);
router.delete('/details/:id', c.deleteDetail);

// Expense accounts (COA) — literal path, must come before /:id
router.get('/expense-accounts', c.getExpenseAccounts);

// Header — generic /:id routes go LAST
router.get('/',      c.getAll);
router.post('/',     c.create);
router.get('/:id/counts', c.getCounts);   // must come before plain /:id too
router.get('/:id',   c.getSingle);
router.put('/:id',   c.update);
router.delete('/:id', c.remove);

export default router;