import {
  getIncomeStatement,
  getExpenseStatement,

} from './service.js';

export const fetchIncomeStatement = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    const rows = await getIncomeStatement(fromDate, toDate);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('fetchIncomeStatement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch income statement' });
  }
};

export const fetchExpenseStatement = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    const rows = await getExpenseStatement(fromDate, toDate);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('fetchExpenseStatement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch expense statement' });
  }
};

