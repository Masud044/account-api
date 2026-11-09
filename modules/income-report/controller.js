import { getIncomeReport, getIncomeReportFilters } from "./service.js";

const handleError = (res, error, fallback) => {
  const status = error.statusCode || 500;
  if (status === 500) console.error(fallback, error);
  return res.status(status).json({
    success: false,
    message: status === 500 ? fallback : error.message,
  });
};

export const incomeReport = async (req, res) => {
  try {
    const { from, to, head, voucherType, codePrefix } = req.query;
    const data = await getIncomeReport({
      from,
      to,
      head,
      voucherType,
      codePrefix,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to generate income report");
  }
};

export const incomeReportFilters = async (req, res) => {
  try {
    const data = await getIncomeReportFilters({
      codePrefix: req.query.codePrefix,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to load income report filters");
  }
};