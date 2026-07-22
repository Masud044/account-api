import * as glReportService from './service.js';

// GET /api/gl-report/monthly-debit?code=5150010000
export const monthlyDebitByAccount = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'code query param is required.' });
    }
    const rows = await glReportService.getMonthlyDebitByAccount(Number(code));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/gl-report/cash-flow?fromDate=2026-04-25&toDate=2026-07-11
export const cashFlowSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'fromDate and toDate query params are required (YYYY-MM-DD).',
      });
    }
    const rows = await glReportService.getCashFlowSummary(fromDate, toDate);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};