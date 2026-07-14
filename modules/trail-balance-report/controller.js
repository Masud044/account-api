import * as trialBalanceService from './service.js';

export const getTrialBalance = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, message: 'fromDate ar toDate required.' });
    }

    const rows = await trialBalanceService.getTrialBalance(fromDate, toDate);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};