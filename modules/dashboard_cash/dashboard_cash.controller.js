import { getCashSummary, getAccountBalance  } from "./dashboard_cash.service.js";

export async function getCash(req, res) {
  try {
    const month = req.query.month ? parseInt(req.query.month) : new Date().getMonth() + 1;
    const year  = req.query.year  ? parseInt(req.query.year)  : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid month. Must be 1–12." });
    }
    if (isNaN(year) || year < 2000) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const data = await getCashSummary({ month, year });
    return res.status(200).json({ success: true, message: "Cash summary fetched.", data });
  } catch (err) {
    console.error("[dashboard_cash] getCash error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

export async function getBalance(req, res) {
  try {
    const { code } = req.params;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: "Account code is required." });
    }

    const data = await getAccountBalance({ code });
    return res.status(200).json({ success: true, message: "Account balance fetched.", data });
  } catch (err) {
    console.error("[dashboard_cash] getBalance error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}
