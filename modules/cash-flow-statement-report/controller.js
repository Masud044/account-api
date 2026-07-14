import { getCashFlowStatement, getCashFlowDetails, getCashFlowSummary } from './service.js';

export const fetchCashFlowStatement = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    const rows = await getCashFlowStatement(fromDate, toDate);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('fetchCashFlowStatement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cash flow statement' });
  }
};

export const fetchCashFlowDetails = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    const rows = await getCashFlowDetails(fromDate, toDate);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('fetchCashFlowDetails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cash flow details' });
  }
};



export const fetchCashFlowSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
    }

    const rows = await getCashFlowSummary(fromDate, toDate);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('fetchCashFlowSummary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cash flow summary' });
  }
};