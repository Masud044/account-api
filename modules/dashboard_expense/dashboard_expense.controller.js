import { getExpenseTotal, getExpenseBreakdown } from "./dashboard_expense.service.js";

export async function getExpense(req, res) {
  try {
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12)
      return res.status(400).json({ success: false, message: "Invalid month. Must be 1–12." });
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
    const rawMonth = req.query.month;
    const rawYear  = req.query.year;

    let month = undefined;
    let year  = undefined;

    if (rawMonth !== undefined && rawMonth !== "") {
      month = parseInt(rawMonth);
      if (isNaN(month) || month < 1 || month > 12)
        return res.status(400).json({ success: false, message: "Invalid month. Must be 1–12." });
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