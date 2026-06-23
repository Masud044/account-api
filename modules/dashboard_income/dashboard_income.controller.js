import { getIncomeTotal , getIncomeBreakdown} from "./dashboard_income.service.js";

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




export async function getIncomeDetails(req, res) {
  try {
    const hasMonth = req.query.month !== undefined;
    const hasYear  = req.query.year !== undefined;

    let month, year;

    if (hasMonth || hasYear) {
      month = parseInt(req.query.month);
      year  = parseInt(req.query.year);

      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: "Invalid month. Must be 1–12." });
      }
      if (isNaN(year) || year < 2000) {
        return res.status(400).json({ success: false, message: "Invalid year." });
      }
    }

    const data = await getIncomeBreakdown({ month, year });
    return res.status(200).json({ success: true, message: "Income breakdown fetched.", data });
  } catch (err) {
    console.error("[dashboard_income] getIncomeDetails error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}