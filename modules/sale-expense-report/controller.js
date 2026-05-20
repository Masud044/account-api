import { getSaleExpenseReportService } from "./service.js";

export async function getSaleExpenseReport(req, res) {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: "from_date and to_date are required (YYYY-MM-DD).",
      });
    }

    const data = await getSaleExpenseReportService({ from_date, to_date });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("getSaleExpenseReport error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}