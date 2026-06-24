import { getIncomeTotal, getIncomeBreakdown } from "./dashboard_income.service.js";

export async function getIncome(req, res) {
  try {
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12)
      return res.status(400).json({ success: false, message: "Invalid month." });
    if (isNaN(year) || year < 2000)
      return res.status(400).json({ success: false, message: "Invalid year." });

    const data = await getIncomeTotal({ month, year });
    return res.status(200).json({ success: true, message: "Income total fetched.", data });
  } catch (err) {
    console.error("[dashboard_income] getIncome error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function getIncomeDetails(req, res) {
  try {
    const { month: rawMonth, year: rawYear, date: rawDate } = req.query;

    // specific date আসলে সরাসরি date দিয়ে query
    if (rawDate && rawDate !== "") {
      const data = await getIncomeBreakdown({ date: rawDate });
      return res.status(200).json({ success: true, message: "Income breakdown fetched.", data });
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

    const data = await getIncomeBreakdown({ month, year });
    return res.status(200).json({ success: true, message: "Income breakdown fetched.", data });
  } catch (err) {
    console.error("[dashboard_income] getIncomeDetails error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}