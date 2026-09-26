import {
  getFarmBudgetReportData,
  generateFarmBudgetReportExcel,
} from "./service.js";

// GET /api/farm-budget-report/:budgetId
export async function getFarmBudgetReport(req, res) {
  try {
    const { budgetId } = req.params;
    const data = await getFarmBudgetReportData(budgetId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getFarmBudgetReport error:", error);
    return res.status(500).json({ success: false, message: "Failed to load budget report" });
  }
}

// GET /api/farm-budget-report/:budgetId/excel
export async function downloadFarmBudgetReportExcel(req, res) {
  try {
    const { budgetId } = req.params;
    const workbook = await generateFarmBudgetReportExcel(budgetId);
    if (!workbook) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Farm_Budget_Report_${budgetId}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("downloadFarmBudgetReportExcel error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate Excel report" });
  }
}