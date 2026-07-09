import { getExpenseTotal, getExpenseBreakdown, getExpenseByAccount  } from "./dashboard_expense.service.js";

export async function getExpense(req, res) {
  try {
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12)
      return res.status(400).json({ success: false, message: "Invalid month." });
    if (isNaN(year) || year < 2000)
      return res.status(400).json({ success: false, message: "Invalid year." });

    const data = await getExpenseTotal({ month, year });
    return res.status(200).json({ success: true, message: "Expense total fetched.", data });
  } catch (err) {
    console.error("[dashboard_expense] getExpense error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function getExpenseDetails(req, res) {
  try {
    const { month: rawMonth, year: rawYear, date: rawDate } = req.query;

    // specific date আসলে month/year parse করার দরকার নেই
    if (rawDate && rawDate !== "") {
      const data = await getExpenseBreakdown({ date: rawDate });
      return res.status(200).json({ success: true, message: "Expense breakdown fetched.", data });
    }

    let month, year;

    if (rawMonth !== undefined && rawMonth !== "") {
      month = parseInt(rawMonth);
      if (isNaN(month) || month < 1 || month > 12)
        return res.status(400).json({ success: false, message: "Invalid month." });
    }

    if (rawYear !== undefined && rawYear !== "") {
      year = parseInt(rawYear);
      if (isNaN(year) || year < 2000)
        return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const data = await getExpenseBreakdown({ month, year });
    return res.status(200).json({ success: true, message: "Expense breakdown fetched.", data });
  } catch (err) {
    console.error("[dashboard_expense] getExpenseDetails error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}


// বাকি import গুলার সাথে যোগ করো

export const expenseByAccount = async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : undefined;
    const year  = req.query.year  ? parseInt(req.query.year)  : undefined;

    const result = await getExpenseByAccount({ month, year });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[dashboard_expense] expenseByAccount error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};