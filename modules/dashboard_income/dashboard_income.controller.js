import { getIncomeTotal } from "./dashboard_income.service.js";

export async function getIncome(req, res) {
  try {
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid month. Must be 1–12." });
    }
    if (isNaN(year) || year < 2000) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const data = await getIncomeTotal({ month, year });
    return res.status(200).json({ success: true, message: "Income total fetched.", data });
  } catch (err) {
    console.error("[dashboard_income] getIncome error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
