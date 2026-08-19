// import { Router } from "express";
// import { getExpense, getExpenseDetails ,expenseByAccount} from "./dashboard_expense.controller.js";

// const router = Router();

// // GET /api/dashboard/expense?month=09&year=2025
// router.get("/", getExpense);
// router.get('/by-account', expenseByAccount); // /breakdown route-এর আগে বসাও

// // GET /api/dashboard/expense/breakdown?month=09&year=2025
// router.get("/breakdown", getExpenseDetails);


// export default router;

import { Router } from "express";
import { getExpense, getExpenseDetails, expenseByAccount, getExpenseDetailsSplit } from "./dashboard_expense.controller.js";

const router = Router();

// GET /api/dashboard/expense?month=09&year=2025
router.get("/", getExpense);
router.get('/by-account', expenseByAccount); // /breakdown route-এর আগে বসাও

// GET /api/dashboard/expense/breakdown?month=09&year=2025
router.get("/breakdown", getExpenseDetails);

// GET /api/dashboard/expense/breakdown-split?month=09&year=2025 — Project vs Other Expense আলাদা
router.get("/breakdown-split", getExpenseDetailsSplit);

export default router;