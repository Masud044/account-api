import { getExpenseReport, getExpenseReportFilters } from "./service.js";

const handleError = (res, error, fallback) => {
  const status = error.statusCode || 500;
  if (status === 500) console.error(fallback, error);
  return res.status(status).json({
    success: false,
    message: status === 500 ? fallback : error.message,
  });
};

export const expenseReport = async (req, res) => {
  try {
    const { from, to, project, category } = req.query;
    const data = await getExpenseReport({ from, to, project, category });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to generate expense report");
  }
};

export const expenseReportFilters = async (req, res) => {
  try {
    const data = await getExpenseReportFilters();
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to load expense report filters");
  }
};